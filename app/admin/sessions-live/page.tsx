"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Megaphone,
  Eraser,
  Settings,
  ExternalLink,
  Link as LinkIcon,
  Crown,
  Send,
  Smile,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import type { ChatMessage, LeaderboardRow, Question } from "@/lib/supabase";
import { useAdminToast } from "@/components/AdminToastContext";

const CHOICES = [
  { key: "a" as const, color: "#4C6FFF" },
  { key: "b" as const, color: "#FF3D8E" },
  { key: "c" as const, color: "#22C55E" },
  { key: "d" as const, color: "#F5A623" },
];

export default function SessionsLivePage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const composerRef = useRef<HTMLFormElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [successRate, setSuccessRate] = useState<number | null>(null);

  const [status, setStatus] = useState("");
  const [launching, setLaunching] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [text, setText] = useState("");
  const [choiceA, setChoiceA] = useState("");
  const [choiceB, setChoiceB] = useState("");
  const [choiceC, setChoiceC] = useState("");
  const [choiceD, setChoiceD] = useState("");
  const [correct, setCorrect] = useState<"a" | "b" | "c" | "d">("a");

  const choiceSetters: Record<string, (v: string) => void> = { a: setChoiceA, b: setChoiceB, c: setChoiceC, d: setChoiceD };
  const choiceValues: Record<string, string> = { a: choiceA, b: choiceB, c: choiceC, d: choiceD };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  async function startSession() {
    const res = await fetch("/api/session/start", { method: "POST" });
    const data = await res.json();
    if (data.session) {
      setSessionId(data.session.id);
      setSessionStartedAt(data.session.started_at);
    } else {
      setStatus("Erreur: " + data.error);
    }
  }
  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    db.from("questions").select("*").eq("session_id", sessionId).eq("status", "active").maybeSingle().then(({ data }) => setActiveQuestion(data));

    const channel = db
      .channel(`sl-questions-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const row = payload.new as Question;
        setActiveQuestion(row.status === "active" ? row : null);
      })
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [db, sessionId]);

  useEffect(() => {
    if (!activeQuestion) {
      setAnswerCounts({});
      return;
    }
    function refresh() {
      db.from("answers").select("choice").eq("question_id", activeQuestion!.id).then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((a) => (counts[a.choice] = (counts[a.choice] ?? 0) + 1));
        setAnswerCounts(counts);
      });
    }
    refresh();
    const channel = db
      .channel(`sl-answers-${activeQuestion.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `question_id=eq.${activeQuestion.id}` }, refresh)
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [db, activeQuestion?.id]);

  useEffect(() => {
    if (!sessionId) return;
    function refresh() {
      db.from("leaderboard").select("*").eq("session_id", sessionId as string).order("total_points", { ascending: false }).limit(5).then(({ data }) => setLeaderboard(data ?? []));
    }
    refresh();
    const channel = db
      .channel(`sl-leaderboard-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard", filter: `session_id=eq.${sessionId}` }, refresh)
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    db.from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => setChatMessages(data ?? []));

    db.from("chat_messages").select("*", { count: "exact", head: true }).eq("session_id", sessionId).then(({ count }) => setMessageCount(count ?? 0));

    const channel = db
      .channel(`sl-chat-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        setChatMessages((prev) => [...prev.slice(-49), payload.new as ChatMessage]);
        setMessageCount((c) => c + 1);
      })
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [db, sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  useEffect(() => {
    if (!sessionId) return;
    async function computeRate() {
      const { data: qs } = await db.from("questions").select("id").eq("session_id", sessionId as string);
      const ids = (qs ?? []).map((q) => q.id);
      if (ids.length === 0) {
        setSuccessRate(null);
        return;
      }
      const { data: ans } = await db.from("answers").select("is_correct").in("question_id", ids);
      if (!ans || ans.length === 0) {
        setSuccessRate(null);
        return;
      }
      const correctCount = ans.filter((a) => a.is_correct).length;
      setSuccessRate(Math.round((correctCount / ans.length) * 100));
    }
    computeRate();
    const t = setInterval(computeRate, 4000);
    return () => clearInterval(t);
  }, [db, sessionId, answerCounts]);

  async function launchQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setLaunching(true);
    const res = await fetch("/api/question/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, text, choice_a: choiceA, choice_b: choiceB, choice_c: choiceC, choice_d: choiceD, correct_choice: correct }),
    });
    const data = await res.json();
    setLaunching(false);
    if (data.question) {
      setStatus("Question envoyée en direct.");
      setText(""); setChoiceA(""); setChoiceB(""); setChoiceC(""); setChoiceD(""); setCorrect("a");
    } else {
      setStatus("Erreur: " + data.error);
    }
  }

  async function endSession() {
    if (!confirm("Terminer la session en cours ?")) return;
    await fetch("/api/session/start", { method: "DELETE" });
    setSessionId(null);
    setActiveQuestion(null);
    startSession();
  }

  async function extendTime(seconds: number) {
    if (!activeQuestion) return;
    await fetch("/api/question/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: activeQuestion.id, seconds }),
    });
  }

  async function togglePause() {
    if (!activeQuestion) return;
    const endpoint = activeQuestion.paused_at ? "/api/question/resume" : "/api/question/pause";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: activeQuestion.id }),
    });
  }

  async function revealNow() {
    if (!activeQuestion) return;
    if (!confirm("Verrouiller les votes et révéler la bonne réponse maintenant ?")) return;
    await fetch("/api/question/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: activeQuestion.id }),
    });
  }

  function copyShareLink() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/` : "";
    navigator.clipboard.writeText(url);
    notify("Lien de l'overlay copié !");
  }

  const remaining = activeQuestion
    ? Math.max(0, Math.ceil(activeQuestion.duration_seconds - ((activeQuestion.paused_at ? new Date(activeQuestion.paused_at).getTime() : now) - new Date(activeQuestion.started_at).getTime()) / 1000))
    : 0;
  const isLive = !!activeQuestion && remaining > 0;
  const isPaused = !!activeQuestion?.paused_at;
  const isRevealed = !!activeQuestion && !isLive;

  const totalVotes = Object.values(answerCounts).reduce((a, b) => a + b, 0);
  const sessionElapsed = sessionStartedAt ? Math.floor((now - new Date(sessionStartedAt).getTime()) / 1000) : 0;
  const sessionClock = `${String(Math.floor(sessionElapsed / 3600)).padStart(2, "0")}:${String(Math.floor((sessionElapsed % 3600) / 60)).padStart(2, "0")}:${String(sessionElapsed % 60).padStart(2, "0")}`;

  const ringCircumference = 2 * Math.PI * 54;
  const progress = activeQuestion ? Math.max(0, Math.min(1, remaining / activeQuestion.duration_seconds)) : 0;

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between -mt-2 mb-2 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-auth-text font-bold text-2xl">Session Live</h1>
            {isLive && (
              <span className="flex items-center gap-1.5 text-auth-live text-xs font-bold bg-auth-live/15 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" /> LIVE
              </span>
            )}
          </div>
          {sessionId && <p className="text-auth-muted text-sm mt-1">ID Session : #{sessionId.slice(0, 8)}</p>}
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 border border-auth-border rounded-lg px-3.5 py-2 text-auth-text text-sm hover:bg-white/5 transition">
            <ExternalLink size={14} /> Voir le live
          </a>
          <button onClick={copyShareLink} className="flex items-center gap-1.5 border border-auth-border rounded-lg px-3.5 py-2 text-auth-text text-sm hover:bg-white/5 transition">
            <LinkIcon size={14} /> Partager le lien
          </button>
          <button onClick={endSession} className="flex items-center gap-1.5 bg-auth-live/15 text-auth-live rounded-lg px-3.5 py-2 text-sm font-semibold hover:bg-auth-live/25 transition">
            <Square size={13} /> Arrêter la session
          </button>
        </div>
      </div>

      {status && <p className="text-auth-mutedDim text-xs -mt-4">{status}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border flex items-center justify-between">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Question en cours</span>
              {isLive && (
                <span className="flex items-center gap-1.5 text-auth-live text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" /> EN DIRECT
                </span>
              )}
              {isPaused && <span className="text-auth-warn text-[10px] font-bold">EN PAUSE</span>}
            </div>

            {activeQuestion ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-auth-mutedDim text-xs mb-1">Question</p>
                    <p className="text-auth-text text-lg font-semibold">{activeQuestion.text}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {CHOICES.filter(({ key }) => activeQuestion[`choice_${key}`]).map(({ key, color }) => {
                      const isCorrectChoice = activeQuestion.correct_choice === key;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
                          style={{
                            borderColor: isRevealed && isCorrectChoice ? color : "#1D2030",
                            background: isRevealed && isCorrectChoice ? `${color}14` : "transparent",
                          }}
                        >
                          <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
                            {key.toUpperCase()}
                          </span>
                          <span className="text-auth-text text-sm flex-1">{activeQuestion[`choice_${key}`]}</span>
                          {isRevealed && isCorrectChoice && <span className="text-xs" style={{ color }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <p className="text-auth-mutedDim text-[10px] uppercase tracking-wide">Temps restant</p>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#1D2030" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="54" fill="none"
                      stroke={isRevealed ? "#22C55E" : isPaused ? "#F5A623" : "#9B4DFF"}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - progress)}
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dashoffset 0.2s linear" }}
                    />
                    <text x="60" y="66" textAnchor="middle" className="fill-auth-text" fontSize="28" fontWeight="bold">
                      {isRevealed ? "✓" : remaining}
                    </text>
                  </svg>
                  {!isRevealed && <span className="text-auth-mutedDim text-xs -mt-1">sec</span>}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button onClick={() => extendTime(10)} disabled={isRevealed} className="border border-auth-border rounded-lg py-1.5 text-xs text-auth-text hover:bg-white/5 transition disabled:opacity-40">
                      + 10 sec
                    </button>
                    <button onClick={() => extendTime(20)} disabled={isRevealed} className="border border-auth-border rounded-lg py-1.5 text-xs text-auth-text hover:bg-white/5 transition disabled:opacity-40">
                      + 20 sec
                    </button>
                  </div>
                  <button
                    onClick={togglePause}
                    disabled={isRevealed}
                    className="w-full flex items-center justify-center gap-1.5 border border-auth-border rounded-lg py-1.5 text-xs text-auth-text hover:bg-white/5 transition disabled:opacity-40"
                  >
                    {isPaused ? <Play size={13} /> : <Pause size={13} />}
                    {isPaused ? "Reprendre" : "Pause"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-auth-muted text-sm">
                Aucune question en cours — prépare-en une ci-dessous.
              </div>
            )}
          </div>

          {activeQuestion && (
            <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-auth-border">
                <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Réponses en temps réel</span>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {CHOICES.filter(({ key }) => activeQuestion[`choice_${key}`]).map(({ key, color }) => {
                  const count = answerCounts[key] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: color }}>{key.toUpperCase()}</span>
                          <span className="text-auth-text text-sm">{activeQuestion[`choice_${key}`]}</span>
                          {isRevealed && activeQuestion.correct_choice === key && <span className="text-xs" style={{ color }}>✓</span>}
                        </div>
                        <span className="text-auth-text text-sm font-bold">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-auth-bg overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.3s" }} />
                      </div>
                      <p className="text-auth-mutedDim text-[10px] text-right mt-0.5">{count}</p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1 border-t border-auth-border text-sm">
                  <span className="text-auth-mutedDim">Total réponses</span>
                  <span className="text-auth-text font-bold">{totalVotes}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-auth-panel border border-auth-border rounded-xl p-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => composerRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-white text-sm font-semibold"
              style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
            >
              <Play size={14} /> Question suivante
            </button>
            <button onClick={endSession} className="flex items-center gap-1.5 border border-auth-border rounded-lg px-4 py-2 text-auth-text text-sm hover:bg-white/5 transition">
              <Square size={13} /> Fin de partie
            </button>
            <button onClick={togglePause} disabled={!activeQuestion || isRevealed} className="flex items-center gap-1.5 border border-auth-border rounded-lg px-4 py-2 text-auth-text text-sm hover:bg-white/5 transition disabled:opacity-40">
              <Pause size={13} /> Pause générale
            </button>
            <button onClick={revealNow} disabled={!isLive} className="flex items-center gap-1.5 border border-auth-border rounded-lg px-4 py-2 text-auth-text text-sm hover:bg-white/5 transition disabled:opacity-40">
              <Megaphone size={13} /> Annoncer résultat
            </button>
            <button onClick={() => notify("Effacer les réponses — bientôt disponible.")} className="flex items-center gap-1.5 border border-auth-border rounded-lg px-4 py-2 text-auth-text text-sm hover:bg-white/5 transition">
              <Eraser size={13} /> Effacer réponses
            </button>
            <button onClick={() => notify("Paramètres de session — bientôt disponible.")} className="flex items-center gap-1.5 border border-auth-border rounded-lg px-4 py-2 text-auth-text text-sm hover:bg-white/5 transition">
              <Settings size={13} /> Paramètres
            </button>
          </div>

          <form ref={composerRef} onSubmit={launchQuestion} className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden scroll-mt-6">
            <div className="px-5 py-3 border-b border-auth-border">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Prochaine question</span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <input
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Dans quel pays se trouve le Machu Picchu ?"
                className="bg-auth-bg border border-auth-border rounded-lg px-4 py-3 text-auth-text outline-none focus:border-auth-blue placeholder:text-auth-mutedDim"
              />
              <div className="grid grid-cols-2 gap-3">
                {CHOICES.map(({ key, color }) => (
                  <div key={key} className="bg-auth-bg border border-auth-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-auth-border">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: color }}>{key.toUpperCase()}</span>
                        <span className="text-auth-mutedDim text-[10px] uppercase tracking-wide">Réponse {key.toUpperCase()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCorrect(key)}
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded transition ${correct === key ? "bg-auth-positive text-white" : "text-auth-mutedDim border border-auth-border"}`}
                      >
                        {correct === key ? "✓ Correcte" : "Marquer"}
                      </button>
                    </div>
                    <input
                      required={key === "a" || key === "b"}
                      value={choiceValues[key]}
                      onChange={(e) => choiceSetters[key](e.target.value)}
                      placeholder={key === "a" || key === "b" ? "Requis" : "Optionnel"}
                      className="w-full bg-transparent px-3 py-2.5 text-auth-text text-sm outline-none placeholder:text-auth-mutedDim"
                    />
                  </div>
                ))}
              </div>
              <button
                disabled={launching || isLive}
                className="rounded-lg py-3 font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: isLive ? "#1D2030" : "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
              >
                {isLive ? "En attente de la fin de la question en cours…" : launching ? "Envoi…" : "▶ Lancer maintenant"}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Joueurs connectés", value: leaderboard.length > 0 ? String(leaderboard.length) : "0" },
              { label: "Spectateurs", value: "—" },
              { label: "Messages dans le chat", value: String(messageCount) },
              { label: "Taux de bonnes réponses", value: successRate !== null ? `${successRate}%` : "—" },
              { label: "Durée de la session", value: sessionClock },
            ].map((s) => (
              <div key={s.label} className="bg-auth-panel border border-auth-border rounded-xl p-3.5">
                <p className="text-auth-text text-lg font-bold">{s.value}</p>
                <p className="text-auth-mutedDim text-[10px] uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden flex flex-col" style={{ height: 460 }}>
            <div className="px-5 py-3 border-b border-auth-border flex items-center justify-between">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Chat live</span>
              <span className="flex items-center gap-1 text-auth-positive text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-auth-positive" /> Actif
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {chatMessages.length === 0 && (
                <p className="text-auth-mutedDim text-xs text-center py-6">En attente des premiers messages…</p>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-auth-blue to-auth-pink flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {m.tiktok_user.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-auth-text text-xs font-semibold">@{m.tiktok_user}</span>
                      {m.is_vote && (
                        <span className="text-[9px] font-bold text-white rounded px-1" style={{ background: CHOICES.find((c) => c.key === m.choice)?.color }}>
                          {m.choice?.toUpperCase()}
                        </span>
                      )}
                      <span className="text-auth-mutedDim text-[10px] ml-auto">
                        {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-auth-muted text-xs break-words">{m.message}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-auth-border p-3 flex items-center gap-2">
              <input
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    notify("Envoi de messages dans le chat TikTok non disponible depuis ce panneau.");
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                placeholder="Envoyer un message..."
                className="flex-1 bg-auth-bg border border-auth-border rounded-lg px-3 py-2 text-xs text-auth-text outline-none placeholder:text-auth-mutedDim"
              />
              <button onClick={() => notify("Emoji — bientôt disponible.")} className="text-auth-mutedDim hover:text-auth-text transition">
                <Smile size={16} />
              </button>
              <button
                onClick={() => notify("Envoi de messages dans le chat TikTok non disponible depuis ce panneau.")}
                className="text-auth-blue hover:text-auth-text transition"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-auth-border">
              <span className="text-auth-mutedDim text-[11px]">Mode modération</span>
              <button onClick={() => notify("Mode modération — bientôt disponible.")} className="w-8 h-4.5 rounded-full bg-auth-border relative transition">
                <span className="absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-auth-mutedDim" />
              </button>
            </div>
          </div>

          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border flex items-center justify-between">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Joueurs actifs</span>
              <span className="text-auth-mutedDim text-[11px]">{leaderboard.length} connectés</span>
            </div>
            <div className="flex flex-col">
              {leaderboard.length === 0 && <p className="text-auth-mutedDim text-xs text-center py-6">Pas encore de joueurs.</p>}
              {leaderboard.map((row, i) => (
                <div key={row.tiktok_user} className="flex items-center gap-3 px-5 py-2.5 border-b border-auth-border last:border-b-0">
                  <span className="text-auth-mutedDim text-xs w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-auth-blue to-auth-pink flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {row.tiktok_user.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-auth-text text-xs flex-1 truncate">@{row.tiktok_user}</span>
                  {i === 0 && <Crown size={13} className="text-auth-warn" />}
                  <span className="text-auth-text text-xs font-bold font-mono">{row.total_points} pts</span>
                </div>
              ))}
            </div>
            <button onClick={() => notify("Classement complet — bientôt disponible.")} className="w-full py-3 text-auth-blue text-xs font-semibold hover:bg-white/5 transition border-t border-auth-border">
              Voir le classement complet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
