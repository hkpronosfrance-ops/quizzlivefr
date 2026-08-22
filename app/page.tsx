"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import type { AnswerRow, LeaderboardRow, Question } from "@/lib/supabase";

const CHOICE_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
const CHOICE_COLORS: Record<string, string> = {
  a: "#FF2D6A",
  b: "#FFD400",
  c: "#3DDCFF",
  d: "#7CFF6B",
};

export default function OverlayPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [now, setNow] = useState(Date.now());

  const db = useMemo(() => supabaseBrowser(), []);

  // Tick every 100ms for a smooth countdown ring.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  // Load the currently active question + subscribe to changes.
  useEffect(() => {
    async function loadActiveQuestion() {
      const { data } = await db
        .from("questions")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setQuestion(data ?? null);
      setAnswers([]);
    }
    loadActiveQuestion();

    const channel = db
      .channel("overlay-questions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        (payload) => {
          const row = payload.new as Question;
          if (row.status === "active") {
            setQuestion(row);
            setAnswers([]);
          } else if (question && row.id === question.id) {
            setQuestion((q) => (q ? { ...q, status: "closed" } : q));
          }
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // Subscribe to answers for the current question (live vote bars).
  useEffect(() => {
    if (!question) return;

    db.from("answers")
      .select("*")
      .eq("question_id", question.id)
      .then(({ data }) => setAnswers(data ?? []));

    const channel = db
      .channel(`overlay-answers-${question.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "answers", filter: `question_id=eq.${question.id}` },
        (payload) => setAnswers((prev) => [...prev, payload.new as AnswerRow])
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [db, question?.id]);

  // Subscribe to leaderboard for the session.
  useEffect(() => {
    if (!question) return;

    db.from("leaderboard")
      .select("*")
      .eq("session_id", question.session_id)
      .order("total_points", { ascending: false })
      .limit(5)
      .then(({ data }) => setLeaderboard(data ?? []));

    const channel = db
      .channel(`overlay-leaderboard-${question.session_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard", filter: `session_id=eq.${question.session_id}` },
        () => {
          db.from("leaderboard")
            .select("*")
            .eq("session_id", question.session_id)
            .order("total_points", { ascending: false })
            .limit(5)
            .then(({ data }) => setLeaderboard(data ?? []));
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [db, question?.session_id]);

  const choices = question
    ? (["a", "b", "c", "d"] as const).filter((c) => question[`choice_${c}`])
    : [];

  const elapsed = question
    ? ((question.paused_at ? new Date(question.paused_at).getTime() : now) - new Date(question.started_at).getTime()) / 1000
    : 0;
  const remaining = question ? Math.max(0, question.duration_seconds - elapsed) : 0;
  const progress = question ? Math.max(0, Math.min(1, remaining / question.duration_seconds)) : 0;
  const isClosed = question?.status === "closed" || remaining <= 0;

  const counts = choices.map((c) => answers.filter((a) => a.choice === c).length);
  const totalVotes = counts.reduce((a, b) => a + b, 0);

  if (!question) {
    return (
      <div className="w-screen h-screen overflow-hidden flex items-end justify-start p-10">
        <div className="text-ink font-body text-sm tracking-widest uppercase opacity-60">
          En attente de la prochaine question…
        </div>
      </div>
    );
  }

  const ringCircumference = 2 * Math.PI * 28;

  return (
    <div className="w-screen h-screen overflow-hidden relative font-body">
      {/* Question card, bottom-left broadcast style */}
      <div className="absolute left-10 bottom-10 w-[560px]">
        <div className="bg-panel/95 border border-line rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-line">
            {/* Countdown ring */}
            <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#242447" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={isClosed ? "#B8B4D9" : "#FFD400"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - progress)}
                transform="rotate(-90 32 32)"
                style={{ transition: "stroke-dashoffset 0.1s linear" }}
              />
              <text
                x="32"
                y="37"
                textAnchor="middle"
                className="font-mono"
                fontSize="18"
                fill="white"
              >
                {isClosed ? "✓" : Math.ceil(remaining)}
              </text>
            </svg>
            <div className="font-display font-bold text-white text-xl leading-tight">
              {question.text}
            </div>
          </div>

          <div className="p-4 flex flex-col gap-2">
            {choices.map((c, i) => {
              const pct = totalVotes > 0 ? Math.round((counts[i] / totalVotes) * 100) : 0;
              const isCorrectReveal = isClosed && c === question.correct_choice;
              return (
                <div key={c} className="relative rounded-lg overflow-hidden bg-void border border-line h-11">
                  <div
                    className="absolute inset-y-0 left-0 opacity-30"
                    style={{
                      width: `${pct}%`,
                      background: CHOICE_COLORS[c],
                      transition: "width 0.3s ease-out",
                    }}
                  />
                  <div className="relative h-full flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: CHOICE_COLORS[c], color: "#0A0A18" }}
                      >
                        {CHOICE_LABELS[c]}
                      </span>
                      <span className="text-white text-sm font-medium">
                        {question[`choice_${c}`]}
                      </span>
                      {isCorrectReveal && <span className="text-signal text-xs font-bold uppercase">Bonne réponse</span>}
                    </div>
                    <span className="text-ink font-mono text-xs">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leaderboard, top-right */}
      <div className="absolute right-10 top-10 w-[280px]">
        <div className="bg-panel/95 border border-line rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-line flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pulse animate-pulse" />
            <span className="font-display font-bold text-white text-sm uppercase tracking-wide">
              Classement
            </span>
          </div>
          <div className="flex flex-col">
            {leaderboard.length === 0 && (
              <div className="px-5 py-4 text-ink text-xs">Pas encore de scores…</div>
            )}
            {leaderboard.map((row, i) => (
              <div
                key={row.tiktok_user}
                className="flex items-center justify-between px-5 py-2.5 border-b border-line last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-signal text-xs w-4">{i + 1}</span>
                  <span className="text-white text-sm truncate max-w-[140px]">@{row.tiktok_user}</span>
                </div>
                <span className="font-mono text-signal text-sm font-bold">{row.total_points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
