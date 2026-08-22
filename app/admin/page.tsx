"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import type { LeaderboardRow, Question } from "@/lib/supabase";

const CHANNELS = [
  { key: "a" as const, label: "CH.A", color: "#FF2D6A" },
  { key: "b" as const, label: "CH.B", color: "#FFD400" },
  { key: "c" as const, label: "CH.C", color: "#3DDCFF" },
  { key: "d" as const, label: "CH.D", color: "#7CFF6B" },
];

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
      setAuthError("ACCÈS REFUSÉ — CODE INCORRECT");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-console-bg flex items-center justify-center font-body">
        <form
          onSubmit={handleLogin}
          className="bg-console-panel border border-console-line rounded-md p-8 w-[380px] flex flex-col gap-5"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-console-warn" />
            <span className="font-condensed font-semibold text-console-muted text-xs tracking-[0.2em] uppercase">
              Régie · Accès restreint
            </span>
          </div>
          <h1 className="font-condensed font-bold text-console-text text-2xl uppercase tracking-wide">
            QuizzLiveFR
          </h1>
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="CODE D'ACCÈS"
            className="bg-console-bg border border-console-line rounded px-4 py-3 text-console-text font-consolemono text-sm tracking-widest outline-none focus:border-console-ready placeholder:text-console-muted"
          />
          {authError && (
            <p className="text-console-tally font-condensed text-xs tracking-widest uppercase">{authError}</p>
          )}
          <button className="bg-console-ready text-console-bg font-condensed font-bold uppercase tracking-widest rounded py-3 hover:brightness-110 transition">
            Ouvrir la régie
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
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [launching, setLaunching] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [text, setText] = useState("");
  const [choiceA, setChoiceA] = useState("");
  const [choiceB, setChoiceB] = useState("");
  const [choiceC, setChoiceC] = useState("");
  const [choiceD, setChoiceD] = useState("");
  const [correct, setCorrect] = useState<"a" | "b" | "c" | "d">("a");

  const choiceSetters: Record<string, (v: string) => void> = {
    a: setChoiceA,
    b: setChoiceB,
    c: setChoiceC,
    d: setChoiceD,
  };
  const choiceValues: Record<string, string> = { a: choiceA, b: choiceB, c: choiceC, d: choiceD };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  async function startSession() {
    setStatus("INITIALISATION SESSION…");
    const res = await fetch("/api/session/start", { method: "POST" });
    const data = await res.json();
    if (data.session) {
      setSessionId(data.session.id);
      setSessionStartedAt(data.session.started_at);
      setStatus(data.reused ? "SESSION ACTIVE REPRISE" : "NOUVELLE SESSION OUVERTE");
    } else {
      setStatus("ERREUR: " + data.error);
    }
  }

  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setStatus("ENVOI VERS L'OVERLAY…");

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
      setStatus("QUESTION EN ANTENNE — 30S");
      setText("");
      setChoiceA("");
      setChoiceB("");
      setChoiceC("");
      setChoiceD("");
      setCorrect("a");
    } else {
      setStatus("ERREUR: " + data.error);
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
    ? Math.max(0, Math.ceil(activeQuestion.duration_seconds - (now - new Date(activeQuestion.started_at).getTime()) / 1000))
    : 0;
  const isLive = !!activeQuestion && remaining > 0;

  const sessionElapsed = sessionStartedAt ? Math.floor((now - new Date(sessionStartedAt).getTime()) / 1000) : 0;
  const sessionClock = `${String(Math.floor(sessionElapsed / 60)).padStart(2, "0")}:${String(sessionElapsed % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-console-bg font-body pb-16">
      {/* Status bar */}
      <div className="border-b border-console-line bg-console-panel px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full transition-all"
            style={{
              background: isLive ? "#E8342A" : "#3A3F3F",
              boxShadow: isLive ? "0 0 10px 2px #E8342A" : "none",
              animation: isLive ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
          <span className="font-condensed font-bold text-sm tracking-[0.2em] uppercase" style={{ color: isLive ? "#E8342A" : "#7D8888" }}>
            {isLive ? "ON AIR" : "HORS ANTENNE"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-condensed text-console-muted text-xs tracking-widest uppercase">QuizzLiveFR</span>
          <span className="text-console-line">·</span>
          <span className="font-consolemono text-console-text text-xs">@quizzlivefr</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="font-condensed text-console-muted text-xs tracking-widest uppercase">Session</span>
            <span className="font-consolemono text-console-ready text-sm">{sessionClock}</span>
          </div>
          <button
            onClick={endSession}
            className="text-console-tally text-xs font-condensed font-semibold uppercase tracking-widest border border-console-tally/40 rounded px-3 py-1.5 hover:bg-console-tally/10 transition"
          >
            Terminer
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 flex flex-col gap-6">
        {status && (
          <p className="font-consolemono text-console-muted text-xs tracking-wide uppercase">▸ {status}</p>
        )}

        {/* Active question monitor */}
        {isLive && activeQuestion && (
          <div className="bg-console-panel border border-console-tally/50 rounded-md overflow-hidden">
            <div className="px-5 py-2 border-b border-console-line bg-console-tally/10 flex items-center justify-between">
              <span className="font-condensed font-bold text-console-tally text-xs tracking-[0.2em] uppercase">
                Question en antenne
              </span>
              <span className="font-consolemono text-console-tally text-2xl font-bold tabular-nums">
                {String(remaining).padStart(2, "0")}s
              </span>
            </div>
            <div className="px-5 py-4">
              <p className="text-console-text text-lg">{activeQuestion.text}</p>
            </div>
          </div>
        )}

        {/* Channel strip — question composer */}
        <form onSubmit={launchQuestion} className="bg-console-panel border border-console-line rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-console-line flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-console-ready" />
            <span className="font-condensed font-bold text-console-text text-xs tracking-[0.2em] uppercase">
              CH.1 — Question
            </span>
          </div>
          <div className="p-5 flex flex-col gap-5">
            <input
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Quelle équipe a gagné la Ligue des Champions 2024 ?"
              className="bg-console-bg border border-console-line rounded px-4 py-3 text-console-text outline-none focus:border-console-ready placeholder:text-console-muted/60"
            />

            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map(({ key, label, color }) => (
                <div key={key} className="bg-console-bg border border-console-line rounded overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-console-line">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="font-condensed font-semibold text-xs tracking-widest" style={{ color }}>
                        {label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCorrect(key)}
                      className={`font-condensed text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded transition ${
                        correct === key
                          ? "bg-console-ready text-console-bg"
                          : "bg-transparent text-console-muted border border-console-line hover:border-console-ready/50"
                      }`}
                    >
                      {correct === key ? "✓ Bonne réponse" : "Marquer correcte"}
                    </button>
                  </div>
                  <input
                    required={key === "a" || key === "b"}
                    value={choiceValues[key]}
                    onChange={(e) => choiceSetters[key](e.target.value)}
                    placeholder={key === "a" || key === "b" ? "Requis" : "Optionnel"}
                    className="w-full bg-transparent px-3 py-2.5 text-console-text text-sm outline-none placeholder:text-console-muted/50"
                  />
                </div>
              ))}
            </div>

            <button
              disabled={launching || isLive}
              className="font-condensed font-bold uppercase tracking-[0.15em] rounded py-4 transition disabled:cursor-not-allowed"
              style={{
                background: isLive ? "#2A2F30" : launching ? "#2A2F30" : "#3ECF6E",
                color: isLive || launching ? "#7D8888" : "#0D0F0F",
              }}
            >
              {isLive ? `● En antenne (${remaining}s)` : launching ? "Envoi…" : "▶ Lancer la question"}
            </button>
          </div>
        </form>

        {/* Leaderboard monitor */}
        <div className="bg-console-panel border border-console-line rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-console-line flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-console-warn" />
            <span className="font-condensed font-bold text-console-text text-xs tracking-[0.2em] uppercase">
              Monitor — Classement session
            </span>
          </div>
          <div className="flex flex-col">
            {leaderboard.length === 0 && (
              <div className="px-5 py-6 text-console-muted font-consolemono text-xs text-center">
                AUCUN SCORE — EN ATTENTE DE VOTES
              </div>
            )}
            {leaderboard.map((row, i) => (
              <div
                key={row.tiktok_user}
                className="flex items-center justify-between px-5 py-2.5 border-b border-console-line last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-consolemono text-console-muted text-xs w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-console-text text-sm">@{row.tiktok_user}</span>
                </div>
                <span className="font-consolemono text-console-ready text-sm font-bold">{row.total_points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
