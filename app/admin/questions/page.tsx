"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileQuestion,
  HelpCircle,
  Radio,
  RefreshCw,
  Search,
  Target,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { supabaseBrowser } from "@/lib/supabase";

type QuestionStatus = "active" | "closed";
type Tab = "all" | QuestionStatus;
type ChoiceKey = "a" | "b" | "c" | "d";

type QuestionRow = {
  id: string;
  session_id: string;
  text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string | null;
  correct_choice: ChoiceKey;
  duration_seconds: number;
  started_at: string;
  ends_at: string;
  status: QuestionStatus;
  created_at: string;
};

type AnswerRow = {
  question_id: string;
  tiktok_user: string;
  choice: ChoiceKey;
  is_correct: boolean;
  answered_at: string;
};

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: "active" | "ended";
};

type QuestionView = QuestionRow & {
  answers: number;
  uniquePlayers: number;
  correctAnswers: number;
  successRate: number | null;
};

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  color: string;
};

const STATUS_LABEL: Record<QuestionStatus, string> = { active: "Active", closed: "Clôturée" };
const STATUS_COLOR: Record<QuestionStatus, string> = { active: "#22C55E", closed: "#6B7086" };
const CHOICES: ChoiceKey[] = ["a", "b", "c", "d"];

function MetricCard({ label, value, helper, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-auth-border bg-auth-panel p-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-auth-mutedDim truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-auth-text">{value}</p>
          <p className="mt-1 text-[11px] text-auth-muted">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
      <div className="w-11 h-11 rounded-xl border border-auth-border bg-white/[0.025] flex items-center justify-center mb-3">
        <FileQuestion size={18} className="text-auth-mutedDim" />
      </div>
      <p className="text-sm font-semibold text-auth-text">{title}</p>
      <p className="text-[11px] text-auth-muted mt-1 max-w-md leading-5">{description}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function compactUuid(id: string) {
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

export default function QuestionsPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [{ data: questionRows }, { data: answerRows }, { data: sessionRows }] = await Promise.all([
      db
        .from("questions")
        .select("id,session_id,text,choice_a,choice_b,choice_c,choice_d,correct_choice,duration_seconds,started_at,ends_at,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      db
        .from("answers")
        .select("question_id,tiktok_user,choice,is_correct,answered_at")
        .order("answered_at", { ascending: false })
        .limit(20000),
      db
        .from("sessions")
        .select("id,started_at,ended_at,status")
        .order("started_at", { ascending: false })
        .limit(500),
    ]);

    const nextQuestions = (questionRows ?? []) as QuestionRow[];
    setQuestions(nextQuestions);
    setAnswers((answerRows ?? []) as AnswerRow[]);
    setSessions((sessionRows ?? []) as SessionRow[]);
    setSelectedId((current) => current && nextQuestions.some((q) => q.id === current) ? current : nextQuestions[0]?.id ?? null);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 15000);
    const channel = db
      .channel("questions-v2-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, loadData)
      .subscribe();

    return () => {
      window.clearInterval(interval);
      db.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const questionViews = useMemo<QuestionView[]>(() => {
    const answersByQuestion = new Map<string, AnswerRow[]>();
    answers.forEach((answer) => {
      const rows = answersByQuestion.get(answer.question_id) ?? [];
      rows.push(answer);
      answersByQuestion.set(answer.question_id, rows);
    });

    return questions.map((question) => {
      const rows = answersByQuestion.get(question.id) ?? [];
      const uniquePlayers = new Set(rows.map((row) => row.tiktok_user)).size;
      const correctAnswers = rows.filter((row) => row.is_correct).length;
      return {
        ...question,
        answers: rows.length,
        uniquePlayers,
        correctAnswers,
        successRate: rows.length ? (correctAnswers / rows.length) * 100 : null,
      };
    });
  }, [questions, answers]);

  const stats = useMemo(() => {
    const totalAnswers = questionViews.reduce((sum, question) => sum + question.answers, 0);
    const totalCorrect = questionViews.reduce((sum, question) => sum + question.correctAnswers, 0);
    return {
      total: questionViews.length,
      active: questionViews.filter((question) => question.status === "active").length,
      closed: questionViews.filter((question) => question.status === "closed").length,
      answers: totalAnswers,
      successRate: totalAnswers ? (totalCorrect / totalAnswers) * 100 : null,
    };
  }, [questionViews]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questionViews.filter((question) => {
      if (tab !== "all" && question.status !== tab) return false;
      if (sessionFilter !== "all" && question.session_id !== sessionFilter) return false;
      if (!query) return true;
      return `${question.text} ${question.id} ${question.session_id}`.toLowerCase().includes(query);
    });
  }, [questionViews, tab, sessionFilter, search]);

  const selected = questionViews.find((question) => question.id === selectedId) ?? questionViews[0] ?? null;
  const selectedAnswers = useMemo(() => answers.filter((answer) => answer.question_id === selected?.id), [answers, selected?.id]);

  const answerBreakdown = useMemo(() => {
    const counts: Record<ChoiceKey, number> = { a: 0, b: 0, c: 0, d: 0 };
    selectedAnswers.forEach((answer) => { counts[answer.choice] += 1; });
    return counts;
  }, [selectedAnswers]);

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1600);
    } catch {}
  }

  function choiceText(question: QuestionView, key: ChoiceKey) {
    return question[`choice_${key}` as keyof QuestionRow] ?? "—";
  }

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-auth-text">Questions</h1>
          <p className="text-sm text-auth-muted mt-1">Consultez les questions réellement diffusées pendant vos sessions live.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Question ou ID..."
              className="w-56 rounded-lg border border-auth-border bg-auth-panel py-2.5 pl-9 pr-3 text-xs text-auth-text outline-none placeholder:text-auth-mutedDim focus:border-auth-blue"
            />
          </div>
          <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <Link href="/admin/sessions-live" className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #4C6FFF 0%, #9B4DFF 52%, #FF3D8E 100%)" }}>
            <Radio size={15} /> Ajouter une question live
          </Link>
          <div className="hidden xl:block h-8 w-px bg-auth-border mx-1" />
          <AdminTopControls />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard label="Questions totales" value={stats.total.toLocaleString("fr-FR")} helper="Questions enregistrées dans Supabase" icon={HelpCircle} color="#9B4DFF" />
        <MetricCard label="Actives" value={stats.active.toLocaleString("fr-FR")} helper={stats.active ? "Questions actuellement ouvertes" : "Aucune question active"} icon={Activity} color="#22C55E" />
        <MetricCard label="Clôturées" value={stats.closed.toLocaleString("fr-FR")} helper="Questions déjà terminées" icon={CheckCircle2} color="#6B7086" />
        <MetricCard label="Réponses reçues" value={stats.answers.toLocaleString("fr-FR")} helper="Votes A, B, C ou D enregistrés" icon={Users2} color="#4C6FFF" />
        <MetricCard label="Taux de réussite" value={stats.successRate == null ? "—" : `${stats.successRate.toFixed(1).replace(".", ",")}%`} helper={stats.successRate == null ? "En attente des premières réponses" : "Sur l’ensemble des réponses"} icon={Target} color="#3DDCFF" />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
          <div className="px-4 pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {([["all", "Toutes"], ["active", "Actives"], ["closed", "Clôturées"]] as Array<[Tab, string]>).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === key ? "bg-auth-blue/15 text-auth-text" : "text-auth-muted hover:text-auth-text"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-auth-mutedDim">{lastUpdated ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Chargement…"}</div>
          </div>

          <div className="px-4 py-3 border-b border-auth-border flex flex-wrap items-center gap-2">
            <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none max-w-[250px]">
              <option value="all">Toutes les sessions</option>
              {sessions.map((session) => <option key={session.id} value={session.id}>{shortId(session.id)} · {formatDate(session.started_at)}</option>)}
            </select>
            <span className="text-[11px] text-auth-muted">{filtered.length} question{filtered.length > 1 ? "s" : ""}</span>
            {(tab !== "all" || sessionFilter !== "all" || search) && (
              <button onClick={() => { setTab("all"); setSessionFilter("all"); setSearch(""); }} className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-auth-muted hover:text-auth-text transition">
                <RefreshCw size={11} /> Réinitialiser
              </button>
            )}
          </div>

          {loading && questionViews.length === 0 ? (
            <EmptyState title="Chargement des questions" description="Lecture des questions, réponses et sessions depuis Supabase." />
          ) : filtered.length === 0 ? (
            <EmptyState title="Aucune question trouvée" description="Aucune question ne correspond aux filtres actuels." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left table-fixed">
                <colgroup><col className="w-[110px]" /><col /><col className="w-[120px]" /><col className="w-[110px]" /><col className="w-[90px]" /><col className="w-[100px]" /><col className="w-[90px]" /><col className="w-[70px]" /></colgroup>
                <thead>
                  <tr className="border-b border-auth-border text-[9px] uppercase tracking-[0.15em] text-auth-mutedDim">
                    <th className="px-4 py-3 font-bold">ID</th><th className="px-3 py-3 font-bold">Question</th><th className="px-3 py-3 font-bold">Statut</th><th className="px-3 py-3 font-bold">Session</th><th className="px-3 py-3 font-bold">Réponses</th><th className="px-3 py-3 font-bold">Réussite</th><th className="px-3 py-3 font-bold">Durée</th><th className="px-3 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((question) => (
                    <tr key={question.id} onClick={() => setSelectedId(question.id)} className={`border-b border-auth-border/70 last:border-0 cursor-pointer transition ${selected?.id === question.id ? "bg-white/[0.04]" : "hover:bg-white/[0.025]"}`}>
                      <td className="px-4 py-3.5 font-mono text-[11px] tracking-wide font-semibold text-auth-text">{shortId(question.id)}</td>
                      <td className="px-3 py-3.5 min-w-0"><p className="text-xs text-auth-text truncate">{question.text}</p><p className="text-[10px] text-auth-mutedDim mt-0.5">Créée le {formatDate(question.created_at)}</p></td>
                      <td className="px-3 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${STATUS_COLOR[question.status]}18`, color: STATUS_COLOR[question.status] }}>{question.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}{STATUS_LABEL[question.status]}</span></td>
                      <td className="px-3 py-3.5 font-mono text-[10px] text-auth-muted">{shortId(question.session_id)}</td>
                      <td className="px-3 py-3.5 text-xs text-auth-text">{question.answers}</td>
                      <td className="px-3 py-3.5 text-xs font-semibold" style={{ color: question.successRate == null ? "#8B8FA6" : question.successRate >= 70 ? "#22C55E" : question.successRate >= 50 ? "#F5A623" : "#EF4444" }}>{question.successRate == null ? "En attente" : `${question.successRate.toFixed(1)}%`}</td>
                      <td className="px-3 py-3.5 text-xs text-auth-muted">{question.duration_seconds}s</td>
                      <td className="px-3 py-3.5"><div className="flex items-center gap-2 text-auth-mutedDim"><button onClick={(e) => { e.stopPropagation(); setSelectedId(question.id); }} className="hover:text-auth-text transition" title="Voir les détails"><Eye size={14} /></button><button onClick={(e) => { e.stopPropagation(); copyId(question.id); }} className="hover:text-auth-text transition" title="Copier l’ID"><Copy size={14} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden 2xl:sticky 2xl:top-5">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between gap-3">
            <div><p className="text-sm font-bold text-auth-text">Détails de la question</p><p className="text-[11px] text-auth-muted mt-0.5">Données de la question sélectionnée</p></div>
            {selected && <span className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${STATUS_COLOR[selected.status]}18`, color: STATUS_COLOR[selected.status] }}>{STATUS_LABEL[selected.status]}</span>}
          </div>

          {!selected ? (
            <EmptyState title="Aucune question" description="Les détails apparaîtront ici dès qu’une question sera disponible." />
          ) : (
            <div className="p-5">
              <p className="text-base font-bold text-auth-text leading-6">{selected.text}</p>
              <button onClick={() => copyId(selected.id)} className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-auth-muted hover:text-auth-blue transition" title={selected.id}>{compactUuid(selected.id)} <Copy size={11} />{copiedId === selected.id && <span className="font-sans text-auth-positive">Copié</span>}</button>

              <div className="grid grid-cols-3 gap-2 mt-5">
                <div className="rounded-lg border border-auth-border bg-auth-bg/40 p-3 text-center"><Clock3 size={14} className="mx-auto text-auth-blue mb-1.5" /><p className="text-sm font-bold text-auth-text">{selected.duration_seconds}s</p><p className="text-[9px] uppercase tracking-wider text-auth-mutedDim">Temps</p></div>
                <div className="rounded-lg border border-auth-border bg-auth-bg/40 p-3 text-center"><Users2 size={14} className="mx-auto text-auth-purple mb-1.5" /><p className="text-sm font-bold text-auth-text">{selected.uniquePlayers}</p><p className="text-[9px] uppercase tracking-wider text-auth-mutedDim">Joueurs</p></div>
                <div className="rounded-lg border border-auth-border bg-auth-bg/40 p-3 text-center"><Target size={14} className="mx-auto text-auth-cyan mb-1.5" /><p className={`text-sm font-bold ${selected.successRate == null ? "text-auth-muted" : "text-auth-text"}`}>{selected.successRate == null ? "En attente" : `${selected.successRate.toFixed(1)}%`}</p><p className="text-[9px] uppercase tracking-wider text-auth-mutedDim">Réussite</p></div>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-auth-mutedDim mb-2.5">Réponses</p>
                <div className="space-y-2">
                  {CHOICES.map((key) => {
                    const isCorrect = selected.correct_choice === key;
                    const count = answerBreakdown[key];
                    const pct = selected.answers ? (count / selected.answers) * 100 : 0;
                    return (
                      <div key={key} className={`rounded-lg border px-3 py-2.5 ${isCorrect ? "border-auth-positive/60 bg-auth-positive/[0.07]" : "border-auth-border bg-auth-bg/40"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${isCorrect ? "bg-auth-positive/15 text-auth-positive" : "bg-white/[0.04] text-auth-muted"}`}>{key}</span>
                          <span className="text-xs text-auth-text flex-1 truncate">{String(choiceText(selected, key))}</span>
                          {isCorrect && <Check size={13} className="text-auth-positive" />}
                          <span className="text-[10px] text-auth-muted tabular-nums">{count} · {pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4"><span className="text-auth-muted">Session</span><span className="font-mono text-[10px] text-auth-text">{shortId(selected.session_id)}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-auth-muted">Début</span><span className="text-auth-text">{formatDate(selected.started_at)}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-auth-muted">Fin prévue</span><span className="text-auth-text">{formatDate(selected.ends_at)}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-auth-muted">Réponses</span><span className="text-auth-text font-semibold">{selected.answers}</span></div>
              </div>

              <div className="mt-4 rounded-lg border border-auth-border/70 bg-auth-bg/30 px-3 py-2.5">
                <div className="flex items-center gap-2"><HelpCircle size={13} className="text-auth-purple" /><p className="text-[10px] font-semibold text-auth-muted">Question de session live</p></div>
                <p className="text-[10px] text-auth-mutedDim mt-1 leading-4">Les attributs de catalogue seront disponibles avec la Banque de questions.</p>
              </div>

              <div className="mt-4 grid gap-2">
                <Link href="/admin/sessions-live" className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #4C6FFF 0%, #9B4DFF 52%, #FF3D8E 100%)" }}>Ouvrir la session live</Link>
                <Link href="/admin/statistiques-live" className="flex items-center justify-center gap-2 rounded-lg border border-auth-border px-4 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition">Voir les statistiques</Link>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="rounded-lg border border-auth-border/70 bg-white/[0.015] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.025] border border-auth-border/70 flex items-center justify-center shrink-0"><FileQuestion size={14} className="text-auth-mutedDim" /></div>
          <div><p className="text-[11px] font-semibold text-auth-muted">Catalogue de questions réutilisables à venir</p><p className="text-[10px] text-auth-mutedDim mt-0.5">Cette page reflète aujourd’hui uniquement les questions réellement diffusées en session.</p></div>
        </div>
        <span className="text-[11px] font-semibold text-auth-mutedDim whitespace-nowrap">Banque de questions bientôt disponible</span>
      </section>
    </div>
  );
}