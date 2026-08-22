"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Eye,
  Gamepad2,
  HelpCircle,
  Radio,
  RefreshCw,
  Search,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { supabaseBrowser } from "@/lib/supabase";

type SessionStatus = "active" | "ended";
type Tab = "all" | SessionStatus;
type SessionRow = { id: string; started_at: string; ended_at: string | null; status: SessionStatus };
type QuestionRow = { id: string; session_id: string; text: string; status: "active" | "closed"; started_at: string };
type LeaderboardRow = { session_id: string; tiktok_user: string };
type PartyView = SessionRow & { questions: QuestionRow[]; players: number; firstQuestion: string | null; activeQuestion: string | null };
type MetricCardProps = { label: string; value: string; helper: string; icon: LucideIcon; color: string };

const STATUS_LABEL: Record<SessionStatus, string> = { active: "En direct", ended: "Terminée" };
const STATUS_COLOR: Record<SessionStatus, string> = { active: "#EF4444", ended: "#22C55E" };

function MetricCard({ label, value, helper, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-auth-border bg-auth-panel p-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}><Icon size={18} /></div>
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
    <div className="px-5 py-10 flex flex-col items-center justify-center text-center">
      <div className="w-11 h-11 rounded-xl border border-auth-border bg-white/[0.025] flex items-center justify-center mb-3"><Gamepad2 size={18} className="text-auth-mutedDim" /></div>
      <p className="text-sm font-semibold text-auth-text">{title}</p>
      <p className="text-[11px] text-auth-muted mt-1 max-w-md leading-5">{description}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string | null) {
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  const totalMinutes = Math.max(0, Math.floor((to - from) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, "0")} min` : `${minutes} min`;
}

function shortId(id: string) { return `#${id.slice(0, 8).toUpperCase()}`; }
function compactUuid(id: string) { return `${id.slice(0, 8)}…${id.slice(-6)}`; }

export default function PartiesPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [{ data: sessionRows }, { data: questionRows }, { data: leaderboardRows }] = await Promise.all([
      db.from("sessions").select("id,started_at,ended_at,status").order("started_at", { ascending: false }).limit(250),
      db.from("questions").select("id,session_id,text,status,started_at").order("started_at", { ascending: true }).limit(5000),
      db.from("leaderboard").select("session_id,tiktok_user").limit(20000),
    ]);
    const nextSessions = (sessionRows ?? []) as SessionRow[];
    setSessions(nextSessions);
    setQuestions((questionRows ?? []) as QuestionRow[]);
    setLeaderboard((leaderboardRows ?? []) as LeaderboardRow[]);
    setSelectedId((current) => current && nextSessions.some((s) => s.id === current) ? current : nextSessions[0]?.id ?? null);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 15000);
    const channel = db.channel("parties-v2-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, loadData)
      .subscribe();
    return () => { window.clearInterval(interval); db.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const parties = useMemo<PartyView[]>(() => {
    const questionsBySession = new Map<string, QuestionRow[]>();
    questions.forEach((q) => { const rows = questionsBySession.get(q.session_id) ?? []; rows.push(q); questionsBySession.set(q.session_id, rows); });
    const playersBySession = new Map<string, Set<string>>();
    leaderboard.forEach((row) => { const players = playersBySession.get(row.session_id) ?? new Set<string>(); players.add(row.tiktok_user); playersBySession.set(row.session_id, players); });
    return sessions.map((session) => {
      const sessionQuestions = questionsBySession.get(session.id) ?? [];
      return { ...session, questions: sessionQuestions, players: playersBySession.get(session.id)?.size ?? 0, firstQuestion: sessionQuestions[0]?.text ?? null, activeQuestion: sessionQuestions.find((q) => q.status === "active")?.text ?? null };
    });
  }, [sessions, questions, leaderboard]);

  const stats = useMemo(() => ({
    total: parties.length,
    active: parties.filter((p) => p.status === "active").length,
    ended: parties.filter((p) => p.status === "ended").length,
    questions: parties.reduce((sum, p) => sum + p.questions.length, 0),
  }), [parties]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return parties.filter((party) => {
      if (tab !== "all" && party.status !== tab) return false;
      if (!query) return true;
      return [party.id, party.firstQuestion ?? "", party.activeQuestion ?? ""].join(" ").toLowerCase().includes(query);
    });
  }, [parties, search, tab]);

  const selected = parties.find((p) => p.id === selectedId) ?? parties[0] ?? null;

  async function copySessionId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1600);
    } catch {}
  }

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-auth-text">Parties</h1>
          <p className="text-sm text-auth-muted mt-1">Consultez les sessions réellement enregistrées et leur activité.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID ou question..." className="w-56 rounded-lg border border-auth-border bg-auth-panel py-2.5 pl-9 pr-3 text-xs text-auth-text outline-none placeholder:text-auth-mutedDim focus:border-auth-blue" /></div>
          <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>
          <Link href="/admin/sessions-live" className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #4C6FFF 0%, #9B4DFF 52%, #FF3D8E 100%)" }}><Gamepad2 size={15} /> Nouvelle session</Link>
          <div className="hidden xl:block h-8 w-px bg-auth-border mx-1" /><AdminTopControls />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Parties totales" value={stats.total.toLocaleString("fr-FR")} helper="Sessions enregistrées dans Supabase" icon={Gamepad2} color="#9B4DFF" />
        <MetricCard label="En direct" value={stats.active.toLocaleString("fr-FR")} helper={stats.active ? "Session actuellement active" : "Aucune session active"} icon={Radio} color="#EF4444" />
        <MetricCard label="Terminées" value={stats.ended.toLocaleString("fr-FR")} helper="Sessions clôturées" icon={CheckCircle2} color="#22C55E" />
        <MetricCard label="Questions enregistrées" value={stats.questions.toLocaleString("fr-FR")} helper="Questions rattachées aux sessions" icon={Target} color="#4C6FFF" />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
          <div className="px-4 pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">{([["all","Toutes"],["active","En direct"],["ended","Terminées"]] as Array<[Tab,string]>).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === key ? "bg-auth-blue/15 text-auth-text" : "text-auth-muted hover:text-auth-text"}`}>{label}</button>)}</div>
            <div className="text-[10px] text-auth-mutedDim">{lastUpdated ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Chargement…"}</div>
          </div>
          <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between gap-3"><p className="text-[11px] text-auth-muted">{filtered.length} session{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}</p>{(tab !== "all" || search) && <button onClick={() => { setTab("all"); setSearch(""); }} className="inline-flex items-center gap-1.5 text-[11px] text-auth-muted hover:text-auth-text transition"><RefreshCw size={11} /> Réinitialiser</button>}</div>

          {loading && parties.length === 0 ? <EmptyState title="Chargement des parties" description="Lecture des sessions, questions et joueurs depuis Supabase." /> : filtered.length === 0 ? <EmptyState title="Aucune partie trouvée" description="Aucune session ne correspond aux filtres actuels. Modifiez la recherche ou réinitialisez les filtres." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left table-fixed">
                <colgroup><col className="w-[110px]" /><col /><col className="w-[115px]" /><col className="w-[155px]" /><col className="w-[80px]" /><col className="w-[75px]" /><col className="w-[110px]" /><col className="w-[70px]" /></colgroup>
                <thead><tr className="border-b border-auth-border text-[9px] uppercase tracking-[0.15em] text-auth-mutedDim"><th className="px-4 py-3 font-bold">Session</th><th className="px-3 py-3 font-bold">Aperçu</th><th className="px-3 py-3 font-bold">Statut</th><th className="px-3 py-3 font-bold">Démarrée</th><th className="px-3 py-3 font-bold">Questions</th><th className="px-3 py-3 font-bold">Joueurs</th><th className="px-3 py-3 font-bold">Durée</th><th className="px-3 py-3 font-bold">Actions</th></tr></thead>
                <tbody>{filtered.map((party) => <tr key={party.id} onClick={() => setSelectedId(party.id)} className={`border-b border-auth-border/70 last:border-0 cursor-pointer transition ${selected?.id === party.id ? "bg-white/[0.04]" : "hover:bg-white/[0.025]"}`}>
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-auth-text">{shortId(party.id)}</td>
                  <td className="px-3 py-3.5 min-w-0"><p className="text-xs text-auth-text truncate">{party.activeQuestion ?? party.firstQuestion ?? "Aucune question enregistrée"}</p><p className="text-[10px] text-auth-mutedDim mt-0.5">{party.activeQuestion ? "Question en cours" : party.questions.length ? "Première question" : "Session vide"}</p></td>
                  <td className="px-3 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${STATUS_COLOR[party.status]}18`, color: STATUS_COLOR[party.status] }}>{party.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}{STATUS_LABEL[party.status]}</span></td>
                  <td className="px-3 py-3.5 text-xs text-auth-muted">{formatDate(party.started_at)}</td><td className="px-3 py-3.5 text-xs text-auth-text">{party.questions.length}</td><td className="px-3 py-3.5 text-xs text-auth-text">{party.players}</td>
                  <td className="px-3 py-3.5"><p className="text-xs text-auth-muted whitespace-nowrap">{formatDuration(party.started_at, party.ended_at)}</p>{party.status === "active" && <p className="mt-0.5 text-[9px] font-semibold text-auth-live">En cours</p>}</td>
                  <td className="px-3 py-3.5"><div className="flex items-center gap-2 text-auth-mutedDim"><button onClick={(e) => { e.stopPropagation(); setSelectedId(party.id); }} className="hover:text-auth-text transition" title="Voir les détails"><Eye size={14} /></button><button onClick={(e) => { e.stopPropagation(); copySessionId(party.id); }} className="hover:text-auth-text transition" title="Copier l’ID"><Copy size={14} /></button></div></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden 2xl:sticky 2xl:top-5">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-auth-text">Détails de la partie</p><p className="text-[11px] text-auth-muted mt-0.5">Données de la session sélectionnée</p></div>{selected && <span className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${STATUS_COLOR[selected.status]}18`, color: STATUS_COLOR[selected.status] }}>{STATUS_LABEL[selected.status]}</span>}</div>
          {!selected ? <EmptyState title="Aucune session" description="Les détails apparaîtront ici dès qu’une session sera disponible." /> : <div className="p-5">
            <div className="w-12 h-12 rounded-xl border border-auth-border bg-auth-blue/[0.07] flex items-center justify-center mb-4"><Gamepad2 size={21} className="text-auth-blue" /></div>
            <p className="text-base font-bold text-auth-text">Session {shortId(selected.id)}</p><p className="text-[11px] text-auth-muted mt-1 leading-5 line-clamp-3">{selected.activeQuestion ?? selected.firstQuestion ?? "Aucune question n’a encore été ajoutée à cette session."}</p>
            <div className="mt-5 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-4"><span className="text-auth-muted">ID session</span><button onClick={() => copySessionId(selected.id)} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-auth-text hover:text-auth-blue transition" title={selected.id}><span>{compactUuid(selected.id)}</span><Copy size={11} />{copiedId === selected.id && <span className="font-sans text-auth-positive">Copié</span>}</button></div>
              <div className="flex items-center justify-between"><span className="text-auth-muted">Début</span><span className="text-auth-text">{formatDate(selected.started_at)}</span></div>
              <div className="flex items-center justify-between"><span className="text-auth-muted">Fin</span>{selected.status === "active" ? <span className="inline-flex items-center gap-1.5 text-auth-live font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" />En cours</span> : <span className="text-auth-text">{selected.ended_at ? formatDate(selected.ended_at) : "—"}</span>}</div>
              <div className="flex items-center justify-between"><span className="text-auth-muted">Durée</span><span className="text-auth-text">{formatDuration(selected.started_at, selected.ended_at)}{selected.status === "active" && <span className="text-auth-live"> · en cours</span>}</span></div>
              <div className="flex items-center justify-between"><span className="text-auth-muted">Questions</span><span className="text-auth-text font-semibold">{selected.questions.length}</span></div><div className="flex items-center justify-between"><span className="text-auth-muted">Joueurs identifiés</span><span className="text-auth-text font-semibold">{selected.players}</span></div><div className="flex items-center justify-between"><span className="text-auth-muted">Spectateurs TikTok</span><span className="text-auth-mutedDim">—</span></div>
            </div>
            <div className="mt-5 rounded-xl border border-auth-border bg-auth-bg/40 p-4"><div className="flex items-center gap-2 mb-2"><HelpCircle size={14} className="text-auth-purple" /><p className="text-[10px] font-bold uppercase tracking-wider text-auth-mutedDim">Contenu</p></div><p className="text-xs font-semibold text-auth-text">{selected.questions.length ? `${selected.questions.length} question${selected.questions.length > 1 ? "s" : ""} dans cette session` : "Aucune question enregistrée"}</p><p className="text-[10px] text-auth-muted mt-1">Les catégories et titres seront ajoutés quand le catalogue de quiz sera disponible dans le backend.</p></div>
            <div className="mt-5 grid gap-2"><Link href="/admin/sessions-live" className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #4C6FFF 0%, #9B4DFF 52%, #FF3D8E 100%)" }}>{selected.status === "active" ? "Ouvrir la session live" : "Voir les sessions"}</Link><Link href="/admin/statistiques-live" className="flex items-center justify-center gap-2 rounded-lg border border-auth-border px-4 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition">Voir les statistiques</Link></div>
          </div>}
        </aside>
      </section>

      <section className="rounded-lg border border-auth-border/70 bg-white/[0.015] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/[0.025] border border-auth-border/70 flex items-center justify-center shrink-0"><Users size={14} className="text-auth-mutedDim" /></div><div><p className="text-[11px] font-semibold text-auth-muted">Programmation non disponible</p><p className="text-[10px] text-auth-mutedDim mt-0.5">Le backend actuel gère uniquement les sessions actives et terminées.</p></div></div>
        <Link href="/admin/sessions-live" className="text-[11px] font-semibold text-auth-muted hover:text-auth-text transition whitespace-nowrap">Gérer les sessions →</Link>
      </section>
    </div>
  );
}