"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  MessageSquare,
  Radio,
  RefreshCw,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminTopControls } from "@/components/AdminTopControls";
import { supabaseBrowser } from "@/lib/supabase";

type SessionRow = { id: string; status: string; started_at: string; ended_at?: string | null };
type QuestionRow = {
  id: string;
  session_id: string;
  text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string | null;
  correct_choice: "a" | "b" | "c" | "d";
  duration_seconds: number;
  started_at: string;
  status: "active" | "closed";
};
type AnswerRow = {
  id: string;
  question_id: string;
  tiktok_user: string;
  choice: "a" | "b" | "c" | "d";
  is_correct: boolean;
  points_earned: number;
  created_at?: string | null;
};
type ChatRow = {
  id: string;
  session_id: string;
  tiktok_user: string;
  message: string;
  is_vote: boolean;
  choice: "a" | "b" | "c" | "d" | null;
  created_at: string;
};
type LeaderboardRow = {
  session_id: string;
  tiktok_user: string;
  total_points: number;
  correct_answers: number;
  total_answers: number;
};
type MetricProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  color: string;
};

const CHOICE_COLORS: Record<string, string> = {
  a: "#4C6FFF",
  b: "#FF3D8E",
  c: "#22C55E",
  d: "#F5A623",
};
const CHOICE_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

function MetricCard({ label, value, helper, icon: Icon, color }: MetricProps) {
  return (
    <div className="rounded-xl border border-auth-border bg-auth-panel p-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-auth-mutedDim truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-auth-text tracking-tight">{value}</p>
          <p className="mt-1 text-[11px] text-auth-muted">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function CompactEmpty({
  title,
  description,
  icon: Icon = Radio,
  emphasis = false,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  emphasis?: boolean;
}) {
  return (
    <div className={`px-5 ${emphasis ? "py-6" : "py-5"} flex items-center gap-4`}>
      <div className={`${emphasis ? "w-12 h-12" : "w-10 h-10"} rounded-xl bg-white/[0.035] border border-auth-border flex items-center justify-center shrink-0`}>
        <Icon size={emphasis ? 20 : 18} className={emphasis ? "text-auth-blue" : "text-auth-mutedDim"} />
      </div>
      <div>
        <p className={`${emphasis ? "text-sm" : "text-[13px]"} font-semibold text-auth-text`}>{title}</p>
        <p className="text-[11px] leading-5 text-auth-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function LiveStatisticsPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    const { data: activeSession } = await db
      .from("sessions")
      .select("id,status,started_at,ended_at")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeSession) {
      setSession(null);
      setQuestions([]);
      setAnswers([]);
      setChat([]);
      setLeaderboard([]);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    const currentSession = activeSession as SessionRow;
    setSession(currentSession);

    const [questionsRes, chatRes, leaderboardRes] = await Promise.all([
      db
        .from("questions")
        .select("id,session_id,text,choice_a,choice_b,choice_c,choice_d,correct_choice,duration_seconds,started_at,status")
        .eq("session_id", currentSession.id)
        .order("started_at", { ascending: true }),
      db
        .from("chat_messages")
        .select("id,session_id,tiktok_user,message,is_vote,choice,created_at")
        .eq("session_id", currentSession.id)
        .order("created_at", { ascending: true })
        .limit(4000),
      db
        .from("leaderboard")
        .select("session_id,tiktok_user,total_points,correct_answers,total_answers")
        .eq("session_id", currentSession.id)
        .order("total_points", { ascending: false })
        .limit(1000),
    ]);

    const sessionQuestions = (questionsRes.data ?? []) as QuestionRow[];
    setQuestions(sessionQuestions);
    setChat((chatRes.data ?? []) as ChatRow[]);
    setLeaderboard((leaderboardRes.data ?? []) as LeaderboardRow[]);

    if (sessionQuestions.length > 0) {
      const { data } = await db
        .from("answers")
        .select("id,question_id,tiktok_user,choice,is_correct,points_earned,created_at")
        .in("question_id", sessionQuestions.map((q) => q.id))
        .limit(10000);
      setAnswers((data ?? []) as AnswerRow[]);
    } else {
      setAnswers([]);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniquePlayers = useMemo(() => {
    const players = new Set<string>();
    leaderboard.forEach((r) => players.add(r.tiktok_user));
    answers.forEach((r) => players.add(r.tiktok_user));
    chat.forEach((r) => players.add(r.tiktok_user));
    return players.size;
  }, [answers, chat, leaderboard]);

  const successRate = useMemo(
    () => (answers.length ? Math.round((answers.filter((a) => a.is_correct).length / answers.length) * 100) : null),
    [answers],
  );

  const currentQuestion = questions.find((q) => q.status === "active") ?? questions.at(-1) ?? null;
  const currentQuestionAnswers = useMemo(
    () => (currentQuestion ? answers.filter((a) => a.question_id === currentQuestion.id) : []),
    [answers, currentQuestion],
  );

  const hasLiveData = answers.length > 0 || chat.length > 0 || leaderboard.length > 0;
  const hasActivity = answers.length > 0 || chat.length > 0;

  const responseDistribution = useMemo(() => {
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    currentQuestionAnswers.forEach((a) => {
      counts[a.choice] = (counts[a.choice] ?? 0) + 1;
    });
    const total = currentQuestionAnswers.length;
    return ["a", "b", "c", "d"].map((choice) => ({
      choice,
      label: CHOICE_LABELS[choice],
      count: counts[choice],
      percentage: total ? Math.round((counts[choice] / total) * 100) : 0,
      color: CHOICE_COLORS[choice],
    }));
  }, [currentQuestionAnswers]);

  const activityData = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const start = now - (11 - index) * 5 * 60_000;
      return {
        start,
        end: start + 5 * 60_000,
        label: new Date(start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        messages: 0,
        responses: 0,
      };
    });

    chat.forEach((m) => {
      const t = new Date(m.created_at).getTime();
      const bucket = buckets.find((x) => t >= x.start && t < x.end);
      if (bucket) bucket.messages += 1;
    });

    answers.forEach((a) => {
      if (!a.created_at) return;
      const t = new Date(a.created_at).getTime();
      const bucket = buckets.find((x) => t >= x.start && t < x.end);
      if (bucket) bucket.responses += 1;
    });

    return buckets.map(({ label, messages, responses }) => ({ label, messages, responses }));
  }, [answers, chat]);

  const questionPerformance = useMemo(
    () =>
      questions
        .map((q) => {
          const rows = answers.filter((a) => a.question_id === q.id);
          const good = rows.filter((a) => a.is_correct).length;
          return {
            id: q.id,
            text: q.text,
            answers: rows.length,
            successRate: rows.length ? Math.round((good / rows.length) * 100) : null,
          };
        })
        .slice(-6)
        .reverse(),
    [answers, questions],
  );

  const topPlayers = leaderboard.slice(0, 5);

  const elapsed = useMemo(() => {
    if (!session?.started_at) return "—";
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000));
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [session, lastUpdated]);

  function exportSnapshot() {
    const payload = {
      exported_at: new Date().toISOString(),
      session,
      metrics: {
        players: uniquePlayers,
        answers: answers.length,
        chat_messages: chat.length,
        success_rate: successRate,
        questions: questions.length,
      },
      leaderboard: topPlayers,
      question_performance: questionPerformance,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quizzlive-stats-${session?.id ?? "session"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-auth-text">Statistiques live</h1>
            {session ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-auth-positive/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-auth-positive">
                <span className="w-1.5 h-1.5 rounded-full bg-auth-positive animate-pulse" /> En direct
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-auth-muted">Hors ligne</span>
            )}
          </div>
          <p className="mt-1 text-sm text-auth-muted">Suivez en temps réel les performances de votre session et l’engagement des joueurs.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/admin/sessions-live" className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition">
            <Eye size={15} /> Voir la session
          </Link>
          <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <button onClick={exportSnapshot} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #4C6FFF 0%, #9B4DFF 52%, #FF3D8E 100%)" }}>
            <Download size={15} /> Exporter
          </button>
          <div className="hidden xl:block h-8 w-px bg-auth-border mx-1" />
          <AdminTopControls />
        </div>
      </header>

      {session && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-auth-mutedDim -mt-2">
          <span>Session <span className="text-auth-muted">#{session.id.slice(0, 8).toUpperCase()}</span></span>
          <span>Durée <span className="text-auth-muted">{elapsed}</span></span>
          <span>Dernière mise à jour <span className="text-auth-muted">{lastUpdated?.toLocaleTimeString("fr-FR") ?? "—"}</span></span>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard label="Joueurs identifiés" value={uniquePlayers.toLocaleString("fr-FR")} helper="Participants détectés dans la session" icon={Users} color="#9B4DFF" />
        <MetricCard label="Réponses reçues" value={answers.length.toLocaleString("fr-FR")} helper="Votes A, B, C ou D enregistrés" icon={Target} color="#4C6FFF" />
        <MetricCard label="Messages dans le chat" value={chat.length.toLocaleString("fr-FR")} helper="Commentaires TikTok enregistrés" icon={MessageSquare} color="#3DDCFF" />
        <MetricCard label="Taux de réussite" value={successRate === null ? "—" : `${successRate}%`} helper={successRate === null ? "En attente des premières réponses" : "Sur l’ensemble des réponses"} icon={CheckCircle2} color="#22C55E" />
        <MetricCard label="Questions jouées" value={questions.length.toLocaleString("fr-FR")} helper="Questions lancées pendant la session" icon={BarChart3} color="#F5A623" />
      </section>

      {session && !hasLiveData && (
        <section className="rounded-xl border border-auth-blue/25 bg-auth-blue/[0.045] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-auth-blue/10 flex items-center justify-center shrink-0">
            <Radio size={17} className="text-auth-blue" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-auth-text">En attente de données TikTok LIVE</p>
            <p className="text-[10px] sm:text-[11px] leading-5 text-auth-muted">Les statistiques apparaîtront automatiquement dès les premières réponses A/B/C/D ou les premiers messages.</p>
          </div>
          <Link href="/admin/sessions-live" className="hidden sm:block text-[11px] font-semibold text-auth-blue hover:text-auth-text transition whitespace-nowrap">Ouvrir la session →</Link>
        </section>
      )}

      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)] gap-4 items-start">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-auth-text">Évolution de l’activité</p>
              <p className="text-[11px] text-auth-muted mt-0.5">Messages et réponses sur la dernière heure</p>
            </div>
            <Activity size={17} className="text-auth-purple" />
          </div>
          {!session ? (
            <CompactEmpty title="Aucune session active" description="Lancez une partie pour commencer à collecter les statistiques." />
          ) : !hasActivity ? (
            <CompactEmpty title="Aucune activité enregistrée" description="Le graphique apparaîtra dès qu’un spectateur enverra un message ou une réponse." />
          ) : (
            <div className="h-[270px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9B4DFF" stopOpacity={0.35} /><stop offset="100%" stopColor="#9B4DFF" stopOpacity={0} /></linearGradient>
                    <linearGradient id="responsesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4C6FFF" stopOpacity={0.28} /><stop offset="100%" stopColor="#4C6FFF" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1D2030" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#6B7086", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6B7086", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0A0C16", border: "1px solid #1D2030", borderRadius: 10, color: "#F3F4F8", fontSize: 12 }} />
                  <Area type="monotone" dataKey="messages" name="Messages" stroke="#9B4DFF" strokeWidth={2} fill="url(#messagesGradient)" />
                  <Area type="monotone" dataKey="responses" name="Réponses" stroke="#4C6FFF" strokeWidth={2} fill="url(#responsesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-auth-border">
              <p className="text-sm font-bold text-auth-text">Répartition des réponses</p>
              <p className="text-[11px] text-auth-muted mt-0.5">{currentQuestion ? currentQuestion.text : "Question actuelle"}</p>
            </div>
            {currentQuestion && currentQuestionAnswers.length > 0 ? (
              <div className="p-4 lg:p-5 grid grid-cols-[125px_1fr] gap-4 items-center">
                <div className="h-[125px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={responseDistribution} dataKey="count" nameKey="label" innerRadius={37} outerRadius={53} paddingAngle={2} stroke="none">
                        {responseDistribution.map((entry) => <Cell key={entry.choice} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {responseDistribution.map((item) => (
                    <div key={item.choice} className="flex items-center gap-2.5">
                      <span className="w-5 text-xs font-bold" style={{ color: item.color }}>{item.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} /></div>
                      <span className="w-9 text-right text-xs font-semibold text-auth-text">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <CompactEmpty title="Aucune réponse pour le moment" description="La répartition A/B/C/D s’affichera dès le premier vote." />
            )}
          </div>

          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-auth-text">Top joueurs</p>
                <p className="text-[11px] text-auth-muted mt-0.5">Classement de la session en cours</p>
              </div>
              <Trophy size={17} className="text-auth-blue" />
            </div>
            {topPlayers.length ? (
              <div className="divide-y divide-auth-border/70">
                {topPlayers.map((player, index) => (
                  <div key={player.tiktok_user} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? "bg-amber-400/15 text-amber-400" : "bg-white/5 text-auth-muted"}`}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-auth-text truncate">@{player.tiktok_user}</p>
                      <p className="text-[10px] text-auth-mutedDim">{player.correct_answers} bonnes réponses</p>
                    </div>
                    <p className="text-xs font-bold text-auth-text">{player.total_points.toLocaleString("fr-FR")} pts</p>
                  </div>
                ))}
              </div>
            ) : (
              <CompactEmpty
                title="Le classement se prépare"
                description="Dès qu’un joueur marque ses premiers points, son pseudo et son score apparaîtront ici."
                icon={Trophy}
                emphasis
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)] gap-4 items-start">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border">
            <p className="text-sm font-bold text-auth-text">Performances par question</p>
            <p className="text-[11px] text-auth-muted mt-0.5">Taux de réussite et volume de réponses des dernières questions</p>
          </div>
          {questionPerformance.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-left">
                <thead>
                  <tr className="border-b border-auth-border text-[9px] uppercase tracking-[0.15em] text-auth-mutedDim">
                    <th className="px-5 py-3 font-bold">Question</th>
                    <th className="px-4 py-3 font-bold w-28">Réponses</th>
                    <th className="px-4 py-3 font-bold w-52">Réussite</th>
                  </tr>
                </thead>
                <tbody>
                  {questionPerformance.map((q, index) => (
                    <tr key={q.id} className="border-b border-auth-border/70 last:border-0 hover:bg-white/[0.02] transition">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-md bg-white/5 text-auth-muted text-[10px] flex items-center justify-center shrink-0">{questions.length - index}</span>
                          <div>
                            <p className="text-xs text-auth-text leading-5 line-clamp-2">{q.text}</p>
                            {q.answers === 0 && <p className="text-[10px] text-auth-mutedDim mt-1">En attente des premières réponses</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-auth-muted">{q.answers.toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-4">
                        {q.successRate === null ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-white/5" />
                            <span className="w-10 text-right text-xs font-semibold text-auth-muted">—</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-auth-positive" style={{ width: `${q.successRate}%` }} /></div>
                            <span className="w-10 text-right text-xs font-semibold text-auth-text">{q.successRate}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CompactEmpty title="Aucune question jouée" description="Les performances apparaîtront après le lancement d’une question." />
          )}
        </div>

        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border">
            <p className="text-sm font-bold text-auth-text">Activité dans le chat</p>
            <p className="text-[11px] text-auth-muted mt-0.5">Messages par tranche de 5 minutes</p>
          </div>
          {chat.length === 0 ? (
            <CompactEmpty title="Chat encore silencieux" description="Le graphique apparaîtra dès que des commentaires seront reçus." />
          ) : (
            <div className="h-[205px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="#1D2030" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#6B7086", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: "#6B7086", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0A0C16", border: "1px solid #1D2030", borderRadius: 10, color: "#F3F4F8", fontSize: 12 }} />
                  <Bar dataKey="messages" name="Messages" fill="#9B4DFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
