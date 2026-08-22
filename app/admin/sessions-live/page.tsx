"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Crown,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Square,
  TimerReset,
  Users2,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";
import type { ChatMessage, LeaderboardRow, Question } from "@/lib/supabase";

const CHOICES = [
  { key: "a" as const, label: "A", color: "#4C6FFF" },
  { key: "b" as const, label: "B", color: "#FF3D8E" },
  { key: "c" as const, label: "C", color: "#22C55E" },
  { key: "d" as const, label: "D", color: "#F5A623" },
];

type BusyAction = "start" | "end" | "pause" | "reveal" | "extend" | null;
type SessionRow = { id: string; started_at: string; status: "active" | "ended" };

function StatCard({ icon: Icon, color, label, value, helper }: { icon: typeof Users2; color: string; label: string; value: string; helper: string }) {
  return (
    <div className="bg-auth-panel border border-auth-border rounded-xl p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}20`, color }}>
        <Icon size={17} />
      </div>
      <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-[0.14em] mb-1">{label}</p>
      <p className="text-auth-text text-xl font-bold mb-1">{value}</p>
      <p className="text-auth-muted text-[10px]">{helper}</p>
    </div>
  );
}

export default function SessionsLivePage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [successRate, setSuccessRate] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const [text, setText] = useState("");
  const [choiceA, setChoiceA] = useState("");
  const [choiceB, setChoiceB] = useState("");
  const [choiceC, setChoiceC] = useState("");
  const [choiceD, setChoiceD] = useState("");
  const [correct, setCorrect] = useState<"a" | "b" | "c" | "d">("a");
  const [launching, setLaunching] = useState(false);

  const choiceSetters: Record<string, (value: string) => void> = { a: setChoiceA, b: setChoiceB, c: setChoiceC, d: setChoiceD };
  const choiceValues: Record<string, string> = { a: choiceA, b: choiceB, c: choiceC, d: choiceD };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  async function loadActiveSession() {
    setLoadingSession(true);
    const { data, error } = await db
      .from("sessions")
      .select("id,started_at,status")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) notify(`Impossible de charger la session : ${error.message}`);
    const session = data as SessionRow | null;
    setSessionId(session?.id ?? null);
    setSessionStartedAt(session?.started_at ?? null);
    setLoadingSession(false);
  }

  useEffect(() => {
    loadActiveSession();
    const channel = db
      .channel("session-live-v2-session")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => loadActiveSession())
      .subscribe();
    return () => { db.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  useEffect(() => {
    if (!sessionId) {
      setActiveQuestion(null);
      setAnswerCounts({});
      setLeaderboard([]);
      setChatMessages([]);
      setMessageCount(0);
      setSuccessRate(null);
      return;
    }

    db.from("questions").select("*").eq("session_id", sessionId).eq("status", "active").maybeSingle().then(({ data }) => setActiveQuestion(data as Question | null));
    const channel = db
      .channel(`session-live-v2-questions-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const row = payload.new as Question;
        setActiveQuestion(row?.status === "active" ? row : null);
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [db, sessionId]);

  useEffect(() => {
    if (!activeQuestion) {
      setAnswerCounts({});
      return;
    }
    const refresh = async () => {
      const { data } = await db.from("answers").select("choice").eq("question_id", activeQuestion.id);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((answer) => { counts[answer.choice] = (counts[answer.choice] ?? 0) + 1; });
      setAnswerCounts(counts);
    };
    refresh();
    const channel = db
      .channel(`session-live-v2-answers-${activeQuestion.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `question_id=eq.${activeQuestion.id}` }, refresh)
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [db, activeQuestion?.id]);

  useEffect(() => {
    if (!sessionId) return;
    const refresh = async () => {
      const { data } = await db.from("leaderboard").select("*").eq("session_id", sessionId).order("total_points", { ascending: false }).limit(5);
      setLeaderboard((data ?? []) as LeaderboardRow[]);
    };
    refresh();
    const channel = db
      .channel(`session-live-v2-leaderboard-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard", filter: `session_id=eq.${sessionId}` }, refresh)
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const refreshChat = async () => {
      const [{ data }, { count }] = await Promise.all([
        db.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(30),
        db.from("chat_messages").select("*", { count: "exact", head: true }).eq("session_id", sessionId),
      ]);
      setChatMessages(((data ?? []) as ChatMessage[]).reverse());
      setMessageCount(count ?? 0);
    };
    refreshChat();
    const channel = db
      .channel(`session-live-v2-chat-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        setChatMessages((previous) => [...previous.slice(-29), payload.new as ChatMessage]);
        setMessageCount((value) => value + 1);
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const compute = async () => {
      const { data: questions } = await db.from("questions").select("id").eq("session_id", sessionId);
      const ids = (questions ?? []).map((question) => question.id);
      if (!ids.length) return setSuccessRate(null);
      const { data: answers } = await db.from("answers").select("is_correct").in("question_id", ids);
      if (!answers?.length) return setSuccessRate(null);
      setSuccessRate(Math.round((answers.filter((answer) => answer.is_correct).length / answers.length) * 100));
    };
    compute();
    const timer = setInterval(compute, 5000);
    return () => clearInterval(timer);
  }, [db, sessionId, answerCounts]);

  async function startSession() {
    if (busy) return;
    setBusy("start");
    try {
      const response = await fetch("/api/session/start", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.session) throw new Error(data.error || "Impossible de démarrer la session.");
      setSessionId(data.session.id);
      setSessionStartedAt(data.session.started_at);
      notify(data.reused ? "Session active récupérée." : "Nouvelle session démarrée.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Impossible de démarrer la session.");
    } finally {
      setBusy(null);
    }
  }

  async function endSession() {
    if (!sessionId || busy) return;
    if (!confirm("Arrêter définitivement cette session ? La question en cours sera également clôturée.")) return;
    setBusy("end");
    try {
      const response = await fetch("/api/session/start", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'arrêter la session.");
      setSessionId(null);
      setSessionStartedAt(null);
      setActiveQuestion(null);
      setAnswerCounts({});
      setLeaderboard([]);
      setChatMessages([]);
      setMessageCount(0);
      setSuccessRate(null);
      notify("Session arrêtée. Aucune nouvelle session n'a été créée.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Impossible d'arrêter la session.");
    } finally {
      setBusy(null);
    }
  }

  async function launchQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionId || launching) return;
    if (!text.trim() || !choiceA.trim() || !choiceB.trim()) {
      notify("Question, réponse A et réponse B sont requises.");
      return;
    }
    setLaunching(true);
    try {
      const response = await fetch("/api/question/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, text: text.trim(), choice_a: choiceA.trim(), choice_b: choiceB.trim(), choice_c: choiceC.trim(), choice_d: choiceD.trim(), correct_choice: correct }),
      });
      const data = await response.json();
      if (!response.ok || !data.question) throw new Error(data.error || "Impossible de lancer la question.");
      setActiveQuestion(data.question as Question);
      setText(""); setChoiceA(""); setChoiceB(""); setChoiceC(""); setChoiceD(""); setCorrect("a");
      notify("Question lancée en direct.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Impossible de lancer la question.");
    } finally {
      setLaunching(false);
    }
  }

  async function questionAction(action: Exclude<BusyAction, "start" | "end" | null>, endpoint: string, body: Record<string, unknown>, success: string, confirmText?: string) {
    if (!activeQuestion || busy) return;
    if (confirmText && !confirm(confirmText)) return;
    setBusy(action);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Action impossible.");
      notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  function copyShareLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/`);
    notify("Lien du live copié.");
  }

  const remaining = activeQuestion
    ? Math.max(0, Math.ceil(activeQuestion.duration_seconds - ((activeQuestion.paused_at ? new Date(activeQuestion.paused_at).getTime() : now) - new Date(activeQuestion.started_at).getTime()) / 1000))
    : 0;
  const isPaused = Boolean(activeQuestion?.paused_at);
  const isQuestionLive = Boolean(activeQuestion && remaining > 0 && !isPaused);
  const isQuestionFinished = Boolean(activeQuestion && remaining <= 0);
  const totalVotes = Object.values(answerCounts).reduce((sum, value) => sum + value, 0);
  const sessionElapsed = sessionStartedAt ? Math.max(0, Math.floor((now - new Date(sessionStartedAt).getTime()) / 1000)) : 0;
  const sessionClock = `${String(Math.floor(sessionElapsed / 3600)).padStart(2, "0")}:${String(Math.floor((sessionElapsed % 3600) / 60)).padStart(2, "0")}:${String(sessionElapsed % 60).padStart(2, "0")}`;
  const canLaunch = Boolean(sessionId && !launching && text.trim() && choiceA.trim() && choiceB.trim());

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-auth-text font-bold text-2xl lg:text-3xl tracking-tight">Session Live</h1>
            {sessionId && <span className="inline-flex items-center gap-1.5 rounded-full bg-auth-live/15 px-2.5 py-1 text-[10px] font-bold text-auth-live"><span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" /> SESSION ACTIVE</span>}
          </div>
          <p className="text-auth-muted text-sm mt-1">Pilotez votre quiz TikTok LIVE et suivez les interactions en temps réel.</p>
          <p className="text-auth-mutedDim text-[10px] mt-2">{loadingSession ? "Recherche d'une session active…" : sessionId ? `Session #${sessionId.slice(0, 8).toUpperCase()} · démarrée à ${new Date(sessionStartedAt!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Aucune session active"}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-auth-border bg-auth-panel rounded-lg px-3.5 py-2.5 text-auth-text text-xs font-semibold hover:bg-white/5"><ExternalLink size={14} />Voir le live</a>
          <button onClick={copyShareLink} className="flex items-center gap-2 border border-auth-border bg-auth-panel rounded-lg px-3.5 py-2.5 text-auth-text text-xs font-semibold hover:bg-white/5"><LinkIcon size={14} />Partager le lien</button>
          {sessionId ? (
            <button disabled={busy !== null} onClick={endSession} className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold bg-auth-live/15 text-auth-live hover:bg-auth-live/25 disabled:opacity-50">{busy === "end" ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}Arrêter la session</button>
          ) : (
            <button disabled={busy !== null || loadingSession} onClick={startSession} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#4C6FFF] via-[#9B4DFF] to-[#FF3D8E] disabled:opacity-50">{busy === "start" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}Démarrer une session</button>
          )}
          <div className="hidden xl:block h-8 w-px bg-auth-border mx-1" />
          <AdminTopControls />
        </div>
      </header>

      {!loadingSession && !sessionId ? (
        <section className="bg-auth-panel border border-auth-border rounded-xl px-6 py-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-auth-blue/10 text-auth-blue flex items-center justify-center mb-4"><Radio size={22} /></div>
          <h2 className="text-auth-text font-bold text-lg">Aucune session active</h2>
          <p className="text-auth-muted text-xs mt-2 max-w-xl mx-auto">Démarrez une session lorsque vous êtes prêt à lancer votre quiz. Une session terminée reste clôturée et n'est plus recréée automatiquement.</p>
          <button disabled={busy !== null} onClick={startSession} className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#4C6FFF] via-[#9B4DFF] to-[#FF3D8E] disabled:opacity-50">{busy === "start" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Démarrer une nouvelle session</button>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard icon={Users2} color="#9B4DFF" label="Joueurs identifiés" value={String(leaderboard.length)} helper="Présents dans le classement actuel" />
            <StatCard icon={MessageCircle} color="#3DDCFF" label="Messages chat" value={String(messageCount)} helper="Messages TikTok enregistrés" />
            <StatCard icon={CheckCircle2} color="#22C55E" label="Réponses reçues" value={String(totalVotes)} helper={activeQuestion ? "Sur la question en cours" : "En attente d'une question"} />
            <StatCard icon={BarChart3} color="#F5A623" label="Taux de réussite" value={successRate == null ? "—" : `${successRate}%`} helper={successRate == null ? "En attente des premières réponses" : "Sur la session en cours"} />
            <StatCard icon={Clock3} color="#4C6FFF" label="Durée de session" value={sessionClock} helper="Depuis le démarrage de la session" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-4 items-start">
            <div className="flex flex-col gap-4">
              <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between gap-3">
                  <div><p className="text-auth-text text-sm font-bold">Question en cours</p><p className="text-auth-muted text-[10px] mt-0.5">État réel de la diffusion</p></div>
                  {activeQuestion ? <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${isPaused ? "bg-[#F5A623]/15 text-[#F5A623]" : isQuestionLive ? "bg-auth-live/15 text-auth-live" : "bg-auth-blue/15 text-auth-blue"}`}>{isPaused ? "EN PAUSE" : isQuestionLive ? "EN DIRECT" : "TEMPS ÉCOULÉ"}</span> : <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-auth-muted">AUCUNE QUESTION</span>}
                </div>
                {activeQuestion ? (
                  <div className="p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-[1fr_190px] gap-5">
                    <div>
                      <p className="text-auth-text text-lg font-bold mb-4">{activeQuestion.text}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {CHOICES.filter(({ key }) => activeQuestion[`choice_${key}`]).map(({ key, label, color }) => {
                          const count = answerCounts[key] ?? 0;
                          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                          const correctAnswer = activeQuestion.correct_choice === key && isQuestionFinished;
                          return <div key={key} className="rounded-lg border p-3" style={{ borderColor: correctAnswer ? color : "#1D2030", background: correctAnswer ? `${color}12` : "transparent" }}><div className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>{label}</span><span className="text-auth-text text-xs font-semibold flex-1">{activeQuestion[`choice_${key}`]}</span><span className="text-auth-muted text-[10px]">{count} · {pct}%</span></div></div>;
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl border border-auth-border bg-auth-bg/40 p-4 flex flex-col justify-center items-center text-center">
                      <TimerReset size={20} className="text-auth-blue mb-2" />
                      <p className="text-auth-mutedDim text-[9px] uppercase tracking-[0.14em] font-bold">Temps restant</p>
                      <p className="text-auth-text text-3xl font-bold mt-1">{isPaused ? "PAUSE" : `${remaining}s`}</p>
                      <p className="text-auth-muted text-[10px] mt-1">{totalVotes} réponse{totalVotes > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ) : <div className="px-5 py-8 text-center"><Radio size={22} className="mx-auto text-auth-mutedDim mb-2" /><p className="text-auth-text text-sm font-semibold">Prêt pour une question</p><p className="text-auth-muted text-[10px] mt-1">Préparez la prochaine question ci-dessous puis lancez-la.</p></div>}
              </div>

              <div className="bg-auth-panel border border-auth-border rounded-xl p-3 flex items-center gap-2 flex-wrap">
                <button disabled={!activeQuestion || busy !== null || isQuestionFinished} onClick={() => questionAction("pause", activeQuestion?.paused_at ? "/api/question/resume" : "/api/question/pause", { question_id: activeQuestion?.id }, activeQuestion?.paused_at ? "Question reprise." : "Question mise en pause.")} className="inline-flex items-center gap-2 border border-auth-border rounded-lg px-3.5 py-2 text-xs font-semibold text-auth-text disabled:opacity-35 hover:bg-white/5">{busy === "pause" ? <Loader2 size={13} className="animate-spin" /> : activeQuestion?.paused_at ? <Play size={13} /> : <Pause size={13} />}{activeQuestion?.paused_at ? "Reprendre" : "Mettre en pause"}</button>
                <button disabled={!activeQuestion || busy !== null || isQuestionFinished} onClick={() => questionAction("extend", "/api/question/extend", { question_id: activeQuestion?.id, seconds: 10 }, "+10 secondes ajoutées.")} className="inline-flex items-center gap-2 border border-auth-border rounded-lg px-3.5 py-2 text-xs font-semibold text-auth-text disabled:opacity-35 hover:bg-white/5">{busy === "extend" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}+10 sec</button>
                <button disabled={!activeQuestion || busy !== null || isQuestionFinished} onClick={() => questionAction("reveal", "/api/question/reveal", { question_id: activeQuestion?.id }, "Votes verrouillés et réponse révélée.", "Révéler la bonne réponse maintenant et verrouiller les votes ?")} className="inline-flex items-center gap-2 border border-auth-border rounded-lg px-3.5 py-2 text-xs font-semibold text-auth-text disabled:opacity-35 hover:bg-white/5">{busy === "reveal" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}Révéler la réponse</button>
                <span className="ml-auto text-[10px] text-auth-mutedDim">Les actions indisponibles sont désactivées automatiquement.</span>
              </div>

              <form onSubmit={launchQuestion} className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between"><div><p className="text-auth-text text-sm font-bold">Prochaine question</p><p className="text-auth-muted text-[10px] mt-0.5">Saisie manuelle — sélection depuis la Banque de questions à venir</p></div><span className="text-[9px] text-auth-mutedDim">A et B requis</span></div>
                <div className="p-4 space-y-3">
                  <input disabled={!sessionId || launching} value={text} onChange={(event) => setText(event.target.value)} placeholder="Saisissez la question…" className="w-full bg-auth-bg border border-auth-border rounded-lg px-3.5 py-3 text-xs text-auth-text outline-none focus:border-auth-blue disabled:opacity-50" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {CHOICES.map(({ key, label, color }) => <div key={key} className="bg-auth-bg border border-auth-border rounded-lg px-3 py-2.5"><div className="flex items-center gap-2 mb-2"><button type="button" onClick={() => setCorrect(key)} className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: color }}>{label}</button><span className="text-[9px] uppercase tracking-[0.12em] font-bold text-auth-mutedDim">Réponse {label}</span>{correct === key && <span className="ml-auto text-[9px] font-bold text-auth-positive">CORRECTE</span>}</div><input disabled={!sessionId || launching} value={choiceValues[key]} onChange={(event) => choiceSetters[key](event.target.value)} placeholder={key === "a" || key === "b" ? "Requis" : "Optionnel"} className="w-full bg-transparent text-auth-text text-xs outline-none placeholder:text-auth-mutedDim disabled:opacity-50" /></div>)}
                  </div>
                  <button disabled={!canLaunch} className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold text-white bg-gradient-to-r from-[#4C6FFF] via-[#9B4DFF] to-[#FF3D8E] disabled:opacity-35 disabled:cursor-not-allowed">{launching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}{activeQuestion ? "Lancer la question suivante" : "Lancer la question"}</button>
                </div>
              </form>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between"><div><p className="text-auth-text text-sm font-bold">Chat live</p><p className="text-auth-muted text-[10px] mt-0.5">Commentaires TikTok synchronisés</p></div><span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-auth-positive"><span className="w-1.5 h-1.5 rounded-full bg-auth-positive" />ACTIF</span></div>
                <div className="max-h-[330px] overflow-y-auto p-3 space-y-2 min-h-[180px]">{chatMessages.length ? chatMessages.map((message) => <div key={message.id} className="rounded-lg bg-auth-bg border border-auth-border px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="text-auth-blue text-[10px] font-semibold">@{message.tiktok_user}</span><span className="text-auth-mutedDim text-[8px]">{new Date(message.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></div><p className="text-auth-text text-[11px] mt-1 break-words">{message.message}</p></div>) : <div className="h-[160px] flex flex-col items-center justify-center text-center"><MessageCircle size={20} className="text-auth-mutedDim mb-2" /><p className="text-auth-text text-xs font-semibold">Chat encore silencieux</p><p className="text-auth-muted text-[9px] mt-1">Les commentaires apparaîtront automatiquement.</p></div>}</div>
              </div>

              <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between"><div><p className="text-auth-text text-sm font-bold">Top joueurs</p><p className="text-auth-muted text-[10px] mt-0.5">Classement de la session</p></div><Crown size={15} className="text-[#F5A623]" /></div>
                <div className="p-3 space-y-2">{leaderboard.length ? leaderboard.map((player, index) => <div key={player.tiktok_user} className="flex items-center gap-2.5 rounded-lg bg-auth-bg border border-auth-border px-3 py-2"><span className="w-6 h-6 rounded-full bg-auth-blue/15 text-auth-blue flex items-center justify-center text-[9px] font-bold">{index + 1}</span><span className="text-auth-text text-[11px] font-semibold flex-1 truncate">{player.tiktok_user}</span><span className="text-auth-blue text-[10px] font-bold">{player.total_points} pts</span></div>) : <div className="py-6 text-center"><Users2 size={18} className="mx-auto text-auth-mutedDim mb-2" /><p className="text-auth-muted text-[10px]">Le classement apparaîtra après les premières réponses.</p></div>}</div>
              </div>
            </aside>
          </section>
        </>
      )}

      {loadingSession && <div className="bg-auth-panel border border-auth-border rounded-xl py-12 flex items-center justify-center gap-2 text-auth-muted text-xs"><RefreshCw size={14} className="animate-spin" />Chargement de la session…</div>}
    </div>
  );
}
