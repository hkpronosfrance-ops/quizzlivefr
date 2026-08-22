"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Eye,
  Gamepad2,
  HelpCircle,
  MonitorPlay,
  Radio,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminTopControls } from "@/components/AdminTopControls";
import { supabaseBrowser } from "@/lib/supabase";
import type { Question } from "@/lib/supabase";

type SessionRow = { id: string; started_at: string; ended_at?: string | null; status: string; players: number };
type AnswerRow = { question_id: string; tiktok_user: string; is_correct: boolean; created_at?: string | null };
type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  color: string;
  delta?: number | null;
  deltaSuffix?: string;
};

const CHOICE_COLORS: Record<string, string> = { a: "#FF3D8E", b: "#4C6FFF", c: "#3DDCFF", d: "#22C55E" };

function dayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDelta(delta: number | null | undefined, suffix = "vs hier") {
  if (delta === null || delta === undefined) return null;
  const rounded = Math.round(delta);
  return `${rounded > 0 ? "+" : ""}${rounded}% ${suffix}`;
}

function MetricCard({ label, value, helper, icon: Icon, color, delta, deltaSuffix }: MetricCardProps) {
  const deltaLabel = formatDelta(delta, deltaSuffix);
  const positive = (delta ?? 0) >= 0;
  const DeltaIcon = positive ? TrendingUp : TrendingDown;
  return (
    <div className="bg-auth-panel border border-auth-border rounded-xl p-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-[0.15em] truncate">{label}</p>
          <p className="text-auth-text text-2xl font-bold mt-1">{value}</p>
          {deltaLabel ? (
            <p className={`text-[11px] mt-1 flex items-center gap-1 ${positive ? "text-auth-positive" : "text-auth-live"}`}>
              <DeltaIcon size={11} /> {deltaLabel}
            </p>
          ) : (
            <p className="text-auth-muted text-[11px] mt-1">{helper}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-7 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/[0.035] border border-auth-border flex items-center justify-center shrink-0">
        <Radio size={18} className="text-auth-mutedDim" />
      </div>
      <div>
        <p className="text-sm font-semibold text-auth-text">{title}</p>
        <p className="text-[11px] text-auth-muted mt-0.5 leading-5">{description}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [playerCount, setPlayerCount] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<{ current: number; total: number } | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);
  const [allSessions, setAllSessions] = useState<SessionRow[]>([]);
  const [questions, setQuestions] = useState<Array<{ id: string; session_id: string; started_at: string; status: string }>>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadActive() {
    const { data: q } = await db
      .from("questions")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveQuestion(q ?? null);

    if (!q) {
      setAnswerCounts({});
      setPlayerCount(0);
      setQuestionIndex(null);
      return;
    }

    const [{ data: activeAnswers }, { count: players }, { data: allQuestions }] = await Promise.all([
      db.from("answers").select("choice").eq("question_id", q.id),
      db.from("leaderboard").select("*", { count: "exact", head: true }).eq("session_id", q.session_id),
      db.from("questions").select("id,started_at").eq("session_id", q.session_id).order("started_at", { ascending: true }),
    ]);

    const counts: Record<string, number> = {};
    (activeAnswers ?? []).forEach((a) => { counts[a.choice] = (counts[a.choice] ?? 0) + 1; });
    setAnswerCounts(counts);
    setPlayerCount(players ?? 0);
    const idx = (allQuestions ?? []).findIndex((row) => row.id === q.id);
    setQuestionIndex({ current: Math.max(1, idx + 1), total: (allQuestions ?? []).length });
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true);
    const now = new Date();
    const sevenDaysAgo = dayStart(new Date(now.getTime() - 6 * 86400000));

    const { data: sessionsData } = await db
      .from("sessions")
      .select("id,started_at,ended_at,status")
      .gte("started_at", sevenDaysAgo.toISOString())
      .order("started_at", { ascending: false });

    const sessions = sessionsData ?? [];
    const sessionIds = sessions.map((s) => s.id);
    let questionRows: Array<{ id: string; session_id: string; started_at: string; status: string }> = [];
    let answerRows: AnswerRow[] = [];

    if (sessionIds.length) {
      const { data: q } = await db
        .from("questions")
        .select("id,session_id,started_at,status")
        .in("session_id", sessionIds)
        .order("started_at", { ascending: true });
      questionRows = q ?? [];
      if (questionRows.length) {
        const { data: a } = await db
          .from("answers")
          .select("question_id,tiktok_user,is_correct,created_at")
          .in("question_id", questionRows.map((row) => row.id))
          .limit(20000);
        answerRows = (a ?? []) as AnswerRow[];
      }
    }

    const recentWithCounts = await Promise.all(
      sessions.slice(0, 5).map(async (s) => {
        const { count } = await db.from("leaderboard").select("*", { count: "exact", head: true }).eq("session_id", s.id);
        return { ...s, players: count ?? 0 };
      }),
    );

    setAllSessions(sessions.map((s) => ({ ...s, players: 0 })));
    setRecentSessions(recentWithCounts);
    setQuestions(questionRows);
    setAnswers(answerRows);
    setLastUpdated(new Date());
    setLoadingAnalytics(false);
  }

  useEffect(() => {
    loadActive();
    loadAnalytics();
    const interval = window.setInterval(loadAnalytics, 30000);
    const channel = db
      .channel("dashboard-v2-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, loadActive)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => { loadActive(); loadAnalytics(); })
      .subscribe();
    return () => {
      window.clearInterval(interval);
      db.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const isLive = !!activeQuestion;
  const choices = activeQuestion ? (["a", "b", "c", "d"] as const).filter((c) => activeQuestion[`choice_${c}`]) : [];
  const totalVotes = Object.values(answerCounts).reduce((a, b) => a + b, 0);

  const analytics = useMemo(() => {
    const now = new Date();
    const today = dayStart(now);
    const yesterday = new Date(today.getTime() - 86400000);
    const tomorrow = new Date(today.getTime() + 86400000);

    const todaySessions = allSessions.filter((s) => new Date(s.started_at) >= today && new Date(s.started_at) < tomorrow);
    const yesterdaySessions = allSessions.filter((s) => new Date(s.started_at) >= yesterday && new Date(s.started_at) < today);

    const questionDate = new Map(questions.map((q) => [q.id, new Date(q.started_at)]));
    const todayAnswers = answers.filter((a) => {
      const d = a.created_at ? new Date(a.created_at) : questionDate.get(a.question_id);
      return !!d && d >= today && d < tomorrow;
    });
    const yesterdayAnswers = answers.filter((a) => {
      const d = a.created_at ? new Date(a.created_at) : questionDate.get(a.question_id);
      return !!d && d >= yesterday && d < today;
    });

    const uniqueToday = new Set(todayAnswers.map((a) => a.tiktok_user)).size;
    const uniqueYesterday = new Set(yesterdayAnswers.map((a) => a.tiktok_user)).size;
    const successToday = todayAnswers.length ? (todayAnswers.filter((a) => a.is_correct).length / todayAnswers.length) * 100 : null;
    const successYesterday = yesterdayAnswers.length ? (yesterdayAnswers.filter((a) => a.is_correct).length / yesterdayAnswers.length) * 100 : null;

    function relative(current: number, previous: number) {
      if (previous === 0) return current === 0 ? 0 : null;
      return ((current - previous) / previous) * 100;
    }

    return {
      parties: todaySessions.length,
      partiesDelta: relative(todaySessions.length, yesterdaySessions.length),
      players: uniqueToday,
      playersDelta: relative(uniqueToday, uniqueYesterday),
      responses: todayAnswers.length,
      responsesDelta: relative(todayAnswers.length, yesterdayAnswers.length),
      success: successToday,
      successDelta: successToday !== null && successYesterday !== null ? successToday - successYesterday : null,
    };
  }, [allSessions, answers, questions]);

  const activityData = useMemo(() => {
    const now = new Date();
    const questionDate = new Map(questions.map((q) => [q.id, new Date(q.started_at)]));
    return Array.from({ length: 7 }, (_, index) => {
      const start = dayStart(new Date(now.getTime() - (6 - index) * 86400000));
      const end = new Date(start.getTime() + 86400000);
      const dayAnswers = answers.filter((a) => {
        const d = a.created_at ? new Date(a.created_at) : questionDate.get(a.question_id);
        return !!d && d >= start && d < end;
      });
      return {
        day: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", ""),
        joueurs: new Set(dayAnswers.map((a) => a.tiktok_user)).size,
        reponses: dayAnswers.length,
      };
    });
  }, [answers, questions]);

  const hasSevenDayActivity = activityData.some((d) => d.joueurs > 0 || d.reponses > 0);
  const totalStoredQuestions = questions.length;
  const activeStoredQuestions = questions.filter((q) => q.status === "active").length;
  const closedStoredQuestions = questions.filter((q) => q.status === "closed").length;

  const quickActions = [
    { href: "/admin/sessions-live", icon: Gamepad2, label: "Nouvelle partie" },
    { href: "/admin/questions", icon: HelpCircle, label: "Questions" },
    { href: "/admin/statistiques-live", icon: BarChart3, label: "Statistiques live" },
    { href: "/admin/joueurs", icon: Users, label: "Joueurs" },
    { href: "/admin/categories", icon: Target, label: "Catégories" },
  ];

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <p className="text-auth-muted text-xs">Bienvenue,</p>
          <h1 className="text-auth-text font-bold text-2xl tracking-tight">Admin QuizzLiveFR</h1>
          <p className="text-auth-muted text-sm mt-1">Vue d’ensemble de l’activité et de la session en cours.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-auth-border rounded-lg px-3.5 py-2.5 text-auth-text text-xs font-semibold hover:bg-white/5 transition">
            <MonitorPlay size={15} /> Voir le live {isLive && <span className="w-1.5 h-1.5 rounded-full bg-auth-live" />}
          </a>
          <AdminTopControls />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard label="Parties aujourd’hui" value={analytics.parties.toLocaleString("fr-FR")} helper="Sessions lancées aujourd’hui" icon={Gamepad2} color="#4C6FFF" delta={analytics.partiesDelta} />
        <MetricCard label="Joueurs uniques" value={analytics.players.toLocaleString("fr-FR")} helper="Participants détectés aujourd’hui" icon={Users} color="#9B4DFF" delta={analytics.playersDelta} />
        <MetricCard label="Spectateurs live" value="—" helper="Disponible dès remontée TikTok LIVE" icon={Eye} color="#3DDCFF" />
        <MetricCard label="Réponses envoyées" value={analytics.responses.toLocaleString("fr-FR")} helper="Votes A/B/C/D aujourd’hui" icon={Activity} color="#FF3D8E" delta={analytics.responsesDelta} />
        <MetricCard label="Taux de réussite" value={analytics.success === null ? "—" : `${Math.round(analytics.success)}%`} helper="En attente des premières réponses" icon={Target} color="#F5A623" delta={analytics.successDelta} deltaSuffix="pts vs hier" />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start">
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between">
            <div>
              <p className="text-auth-text font-bold text-sm">Partie en cours</p>
              <p className="text-auth-muted text-[11px] mt-0.5">Question et votes reçus en temps réel</p>
            </div>
            {isLive ? <span className="flex items-center gap-1.5 text-auth-live text-[10px] font-bold uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" /> LIVE</span> : <span className="text-auth-mutedDim text-[10px] font-bold uppercase">Hors ligne</span>}
          </div>

          {isLive && activeQuestion ? (
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><p className="text-auth-mutedDim uppercase tracking-wide mb-1">ID session</p><p className="text-auth-text font-mono">#{activeQuestion.session_id.slice(0, 8)}</p></div>
                <div><p className="text-auth-mutedDim uppercase tracking-wide mb-1">Joueurs identifiés</p><p className="text-auth-text font-semibold">{playerCount}</p></div>
                <div className="col-span-2"><p className="text-auth-mutedDim uppercase tracking-wide mb-1">Question actuelle</p><p className="text-auth-text font-semibold">{activeQuestion.text}</p>{questionIndex && <p className="text-auth-mutedDim text-[11px] mt-0.5">Question {questionIndex.current} / {questionIndex.total}</p>}</div>
              </div>
              <div className="flex flex-col gap-2">
                {choices.map((c) => {
                  const count = answerCounts[c] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={c} className="relative rounded-lg overflow-hidden bg-auth-bg border border-auth-border h-9">
                      <div className="absolute inset-y-0 left-0 opacity-20" style={{ width: `${pct}%`, background: CHOICE_COLORS[c], transition: "width .3s" }} />
                      <div className="relative h-full flex items-center justify-between px-3">
                        <div className="flex items-center gap-2 min-w-0"><span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: CHOICE_COLORS[c], color: "#05060C" }}>{c.toUpperCase()}</span><span className="text-auth-text text-xs truncate">{activeQuestion[`choice_${c}`]}</span></div>
                        <span className="text-auth-mutedDim text-xs font-mono ml-3">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs"><span className="text-auth-muted">{totalVotes} réponse{totalVotes > 1 ? "s" : ""} reçue{totalVotes > 1 ? "s" : ""}</span><Link href="/admin/sessions-live" className="text-auth-blue font-semibold hover:text-auth-text transition flex items-center gap-1">Ouvrir la session <ArrowRight size={13} /></Link></div>
            </div>
          ) : (
            <CompactEmpty title="Aucune partie en cours" description="Lance une session pour afficher ici la question active, les votes et le nombre de joueurs." />
          )}
        </div>

        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between">
            <div><p className="text-auth-text font-bold text-sm">Activité des 7 derniers jours</p><p className="text-auth-muted text-[11px] mt-0.5">Joueurs uniques et réponses réellement enregistrées</p></div>
            <BarChart3 size={17} className="text-auth-purple" />
          </div>
          {loadingAnalytics ? (
            <CompactEmpty title="Chargement des statistiques" description="Lecture des sessions, questions et réponses Supabase…" />
          ) : !hasSevenDayActivity ? (
            <CompactEmpty title="Aucune activité récente" description="Le graphique apparaîtra dès que les premières réponses seront enregistrées." />
          ) : (
            <div className="h-[285px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1D2030" vertical={false} />
                  <XAxis dataKey="day" stroke="#6B7086" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7086" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0A0C16", border: "1px solid #1D2030", borderRadius: 10, fontSize: 12, color: "#F3F4F8" }} />
                  <Line type="monotone" dataKey="joueurs" name="Joueurs uniques" stroke="#4C6FFF" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="reponses" name="Réponses" stroke="#9B4DFF" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start">
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between"><div><p className="text-auth-text font-bold text-sm">Dernières sessions live</p><p className="text-auth-muted text-[11px] mt-0.5">5 sessions les plus récentes sur les 7 derniers jours</p></div><Link href="/admin/parties" className="text-auth-blue text-xs font-semibold hover:text-auth-text transition">Voir les parties →</Link></div>
          {recentSessions.length === 0 ? <CompactEmpty title="Aucune session récente" description="Les dernières sessions apparaîtront ici après le premier live." /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-auth-mutedDim text-[9px] uppercase tracking-[0.14em] border-b border-auth-border"><th className="text-left px-5 py-3 font-bold">Session</th><th className="text-left px-3 py-3 font-bold">Date</th><th className="text-left px-3 py-3 font-bold">Joueurs</th><th className="text-left px-3 py-3 font-bold">Statut</th></tr></thead><tbody>{recentSessions.map((s) => <tr key={s.id} className="border-b border-auth-border/70 last:border-0 hover:bg-white/[0.02]"><td className="px-5 py-3 text-auth-text font-mono text-xs">#{s.id.slice(0, 8)}</td><td className="px-3 py-3 text-auth-muted text-xs">{new Date(s.started_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td><td className="px-3 py-3 text-auth-text text-xs">{s.players}</td><td className="px-3 py-3"><span className={`text-[9px] font-bold px-2 py-1 rounded-full ${s.status === "active" ? "bg-auth-live/15 text-auth-live" : "bg-white/5 text-auth-muted"}`}>{s.status === "active" ? "EN COURS" : "TERMINÉE"}</span></td></tr>)}</tbody></table></div>
          )}
        </div>

        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between"><div><p className="text-auth-text font-bold text-sm">Questions enregistrées</p><p className="text-auth-muted text-[11px] mt-0.5">Données réellement présentes dans les sessions des 7 derniers jours</p></div><HelpCircle size={17} className="text-auth-blue" /></div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-auth-border bg-auth-bg/40 p-4"><p className="text-auth-mutedDim text-[9px] font-bold uppercase tracking-widest">Total</p><p className="text-auth-text text-2xl font-bold mt-1">{totalStoredQuestions.toLocaleString("fr-FR")}</p><p className="text-auth-muted text-[11px] mt-1">Questions trouvées</p></div>
            <div className="rounded-xl border border-auth-border bg-auth-bg/40 p-4"><p className="text-auth-mutedDim text-[9px] font-bold uppercase tracking-widest">Actives</p><p className="text-auth-text text-2xl font-bold mt-1">{activeStoredQuestions}</p><p className="text-auth-muted text-[11px] mt-1">En diffusion</p></div>
            <div className="rounded-xl border border-auth-border bg-auth-bg/40 p-4"><p className="text-auth-mutedDim text-[9px] font-bold uppercase tracking-widest">Clôturées</p><p className="text-auth-text text-2xl font-bold mt-1">{closedStoredQuestions}</p><p className="text-auth-muted text-[11px] mt-1">Déjà jouées</p></div>
          </div>
          <div className="px-5 pb-5 flex justify-end"><Link href="/admin/questions" className="text-auth-blue text-xs font-semibold hover:text-auth-text transition">Gérer les questions →</Link></div>
        </div>
      </section>

      <section className="bg-auth-panel border border-auth-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4"><div><p className="text-auth-text font-bold text-sm">Actions rapides</p><p className="text-auth-muted text-[11px] mt-0.5">Accès direct aux fonctions déjà disponibles</p></div>{lastUpdated && <p className="text-auth-mutedDim text-[10px]">Mis à jour à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>}</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickActions.map(({ href, icon: Icon, label }, index) => <Link key={label} href={href} className={`flex flex-col items-center justify-center gap-2 rounded-lg py-4 text-xs font-semibold transition border ${index === 0 ? "border-auth-blue/30 bg-auth-blue/[0.06] text-auth-text hover:bg-auth-blue/[0.1]" : "border-auth-border text-auth-text hover:bg-white/5"}`}><Icon size={18} className={index === 0 ? "text-auth-blue" : "text-auth-muted"} />{label}</Link>)}
        </div>
      </section>
    </div>
  );
}
