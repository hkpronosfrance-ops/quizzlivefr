import { TikTokLiveConnection } from "tiktok-live-connector";
import { createClient } from "@supabase/supabase-js";

const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME; // e.g. "quizzlivefr" (no @)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TIKTOK_USERNAME || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Variables manquantes. Requises: TIKTOK_USERNAME, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// In-memory cache of the currently active question, kept in sync via Realtime.
let activeQuestion = null;
let currentSessionId = null;

async function loadActiveQuestion() {
  const { data, error } = await db
    .from("questions")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement question active:", error.message);
    return;
  }
  activeQuestion = data;
  if (data) currentSessionId = data.session_id;
  console.log(activeQuestion ? `Question active: "${activeQuestion.text}"` : "Aucune question active.");
}

async function loadCurrentSession() {
  const { data } = await db
    .from("sessions")
    .select("id")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) currentSessionId = data.id;
}

function subscribeToSessionChanges() {
  db.channel("worker-sessions")
    .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, (payload) => {
      const row = payload.new;
      if (row.status === "active") {
        currentSessionId = row.id;
      }
    })
    .subscribe();
}

function subscribeToQuestionChanges() {
  db.channel("worker-questions")
    .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, (payload) => {
      const row = payload.new;
      if (row.status === "active") {
        activeQuestion = row;
        console.log(`Nouvelle question active: "${row.text}"`);
      } else if (activeQuestion && row.id === activeQuestion.id) {
        activeQuestion = null;
        console.log("Question fermée, votes suspendus.");
      }
    })
    .subscribe();
}

// Parses a comment into a choice letter (a/b/c/d), or null if it doesn't match.
// Accepts "A", "a", "A)", "réponse A", emojis+letter, etc. — takes the first
// standalone A/B/C/D found in the comment.
function parseChoice(comment) {
  const match = comment.trim().toUpperCase().match(/\b([ABCD])\b/);
  return match ? match[1].toLowerCase() : null;
}

async function handleComment(data) {
  // Field names differ slightly across tiktok-live-connector versions
  // (comment/content, user.uniqueId/user.displayId) — read defensively.
  const commentText = data.comment ?? data.content ?? "";
  const tiktokUser = data.user?.uniqueId ?? data.user?.displayId ?? data.user?.nickname ?? data.uniqueId;

  if (!tiktokUser || !commentText) return;

  const choice = parseChoice(commentText);
  const now = Date.now();
  const questionOpen = activeQuestion && !activeQuestion.paused_at && now <= new Date(activeQuestion.ends_at).getTime();
  const isValidVote = !!(choice && questionOpen);

  // Relay every message to the live chat feed, whether it's a vote or not.
  if (currentSessionId) {
    db.from("chat_messages")
      .insert({
        session_id: currentSessionId,
        tiktok_user: tiktokUser,
        message: commentText,
        is_vote: isValidVote,
        choice: isValidVote ? choice : null,
      })
      .then(({ error }) => {
        if (error) console.error("Erreur insertion message chat:", error.message);
      });
  }

  if (!isValidVote) return;

  const { error } = await db.from("answers").insert({
    question_id: activeQuestion.id,
    tiktok_user: tiktokUser,
    choice,
  });

  if (error) {
    // Unique constraint violation = user already voted on this question. Expected, ignore.
    if (!error.message.includes("duplicate")) {
      console.error("Erreur insertion vote:", error.message);
    }
    return;
  }

  console.log(`Vote: @${tiktokUser} -> ${choice.toUpperCase()}`);
}

async function connect() {
  const connection = new TikTokLiveConnection(TIKTOK_USERNAME, {});

  connection.on("chat", handleComment);

  connection.on("disconnected", () => {
    console.warn("Déconnecté du live. Nouvelle tentative dans 10s…");
    setTimeout(connect, 10000);
  });

  try {
    const state = await connection.connect();
    console.log(`Connecté au live de @${TIKTOK_USERNAME} (roomId ${state.roomId})`);
  } catch (err) {
    console.error("Connexion échouée:", err.message, "— nouvelle tentative dans 15s…");
    setTimeout(connect, 15000);
  }
}

async function main() {
  await loadCurrentSession();
  await loadActiveQuestion();
  subscribeToSessionChanges();
  subscribeToQuestionChanges();
  await connect();
}

main();
