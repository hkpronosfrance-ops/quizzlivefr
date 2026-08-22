"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import type { LeaderboardRow, Question } from "@/lib/supabase";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("quizzlivefr_admin") === "1") {
      setAuthed(true);
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      sessionStorage.setItem("quizzlivefr_admin", "1");
      setAuthed(true);
      setAuthError("");
    } else {
      setAuthError("Mot de passe incorrect.");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center font-body">
        <form onSubmit={handleLogin} className="bg-panel border border-line rounded-2xl p-8 w-[360px] flex flex-col gap-4">
          <h1 className="font-display font-bold text-white text-xl">Panneau QuizzLiveFR</h1>
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Mot de passe"
            className="bg-void border border-line rounded-lg px-4 py-2.5 text-white outline-none focus:border-signal"
          />
          {authError && <p className="text-pulse text-sm">{authError}</p>}
          <button className="bg-signal text-void font-bold rounded-lg py-2.5 hover:opacity-90 transition">
            Entrer
          </button>
        </form>
      </div>
    );
  }

  return <ControlPanel />;
}

function ControlPanel() {
  const db = useMemo(() => supabaseBrowser(), []);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [launching, setLaunching] = useState(false);

  const [text, setText] = useState("");
  const [choiceA, setChoiceA] = useState("");
  const [choiceB, setChoiceB] = useState("");
  const [choiceC, setChoiceC] = useState("");
  const [choiceD, setChoiceD] = useState("");
  const [correct, setCorrect] = useState<"a" | "b" | "c" | "d">("a");

  async function startSession() {
    setStatus("Démarrage de la session…");
    const res = await fetch("/api/session/start", { method: "POST" });
    const data = await res.json();
    if (data.session) {
      setSessionId(data.session.id);
      setStatus(data.reused ? "Session déjà active reprise." : "Nouvelle session démarrée.");
    } else {
      setStatus("Erreur: " + data.error);
    }
  }

  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the active question (to disable the launch button while one is running).
  useEffect(() => {
    if (!sessionId) return;

    db.from("questions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setActiveQuestion(data));

    const channel = db
      .channel(`admin-questions-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as Question;
          setActiveQuestion(row.status === "active" ? row : null);
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [db, sessionId]);

  // Leaderboard live view for the admin too.
  useEffect(() => {
    if (!sessionId) return;

    function refresh() {
      db.from("leaderboard")
        .select("*")
        .eq("session_id", sessionId as string)
        .order("total_points", { ascending: false })
        .limit(10)
        .then(({ data }) => setLeaderboard(data ?? []));
    }
    refresh();

    const channel = db
      .channel(`admin-leaderboard-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard", filter: `session_id=eq.${sessionId}` },
        refresh
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [db, sessionId]);

  async function launchQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setLaunching(true);
    setStatus("Lancement de la question…");

    const res = await fetch("/api/question/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        text,
        choice_a: choiceA,
        choice_b: choiceB,
        choice_c: choiceC,
        choice_d: choiceD,
        correct_choice: correct,
      }),
    });
    const data = await res.json();
    setLaunching(false);

    if (data.question) {
      setStatus("Question lancée — 30s en cours sur l'overlay.");
      setText("");
      setChoiceA("");
      setChoiceB("");
      setChoiceC("");
      setChoiceD("");
      setCorrect("a");
    } else {
      setStatus("Erreur: " + data.error);
    }
  }

  async function endSession() {
    if (!confirm("Terminer la session en cours ? Le classement restera consultable en base.")) return;
    await fetch("/api/session/start", { method: "DELETE" });
    setSessionId(null);
    setActiveQuestion(null);
    startSession();
  }

  const remaining = activeQuestion
    ? Math.max(0, Math.ceil(activeQuestion.duration_seconds - (Date.now() - new Date(activeQuestion.started_at).getTime()) / 1000))
    : 0;

  return (
    <div className="min-h-screen bg-void font-body p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-white text-2xl">Panneau QuizzLiveFR</h1>
          <button onClick={endSession} className="text-pulse text-sm border border-pulse/40 rounded-lg px-3 py-1.5 hover:bg-pulse/10 transition">
            Terminer la session
          </button>
        </div>

        {status && <p className="text-ink text-sm">{status}</p>}

        {activeQuestion && (
          <div className="bg-panel border border-signal/40 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-signal text-xs uppercase tracking-wide font-bold mb-1">Question en cours</p>
              <p className="text-white">{activeQuestion.text}</p>
            </div>
            <div className="font-mono text-signal text-3xl font-bold">{remaining}s</div>
          </div>
        )}

        <form onSubmit={launchQuestion} className="bg-panel border border-line rounded-2xl p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-ink text-xs uppercase tracking-wide">Question</span>
            <input
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Quelle équipe a gagné la Ligue des Champions 2024 ?"
              className="bg-void border border-line rounded-lg px-4 py-2.5 text-white outline-none focus:border-signal"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "a", val: choiceA, set: setChoiceA, required: true },
              { key: "b", val: choiceB, set: setChoiceB, required: true },
              { key: "c", val: choiceC, set: setChoiceC, required: false },
              { key: "d", val: choiceD, set: setChoiceD, required: false },
            ].map(({ key, val, set, required }) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="text-ink text-xs uppercase tracking-wide">Réponse {key.toUpperCase()}</span>
                <input
                  required={required}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="bg-void border border-line rounded-lg px-4 py-2.5 text-white outline-none focus:border-signal"
                />
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-ink text-xs uppercase tracking-wide">Bonne réponse</span>
            <select
              value={correct}
              onChange={(e) => setCorrect(e.target.value as "a" | "b" | "c" | "d")}
              className="bg-void border border-line rounded-lg px-4 py-2.5 text-white outline-none focus:border-signal"
            >
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="c">C</option>
              <option value="d">D</option>
            </select>
          </label>

          <button
            disabled={launching || !!activeQuestion}
            className="bg-signal text-void font-bold rounded-lg py-3 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {activeQuestion ? `Question en cours (${remaining}s)` : launching ? "Lancement…" : "Lancer la question"}
          </button>
        </form>

        <div className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-display font-bold text-white text-sm uppercase tracking-wide mb-3">
            Classement de la session
          </h2>
          <div className="flex flex-col gap-1.5">
            {leaderboard.length === 0 && <p className="text-ink text-sm">Aucun score pour l'instant.</p>}
            {leaderboard.map((row, i) => (
              <div key={row.tiktok_user} className="flex items-center justify-between py-1.5 border-b border-line last:border-b-0">
                <span className="text-white text-sm">{i + 1}. @{row.tiktok_user}</span>
                <span className="font-mono text-signal text-sm">{row.total_points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
