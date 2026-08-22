"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserRoundSearch,
  Users,
  Vote,
  X,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";

type SessionRow = { id: string; status: string; started_at: string; ended_at?: string | null };
type ChatRow = {
  id: string;
  session_id: string;
  tiktok_user: string;
  message: string;
  is_vote: boolean;
  choice: "a" | "b" | "c" | "d" | null;
  created_at: string;
};
type MessageState = { message_id: string; hidden: boolean; flagged: boolean; updated_at: string };
type UserState = {
  tiktok_user: string;
  watched: boolean;
  hidden_locally: boolean;
  note: string;
  updated_at: string;
};
type TermRow = { id: string; term: string; is_active: boolean; created_at: string; updated_at: string };
type FilterKey = "all" | "messages" | "votes" | "flagged" | "sensitive";

function MetricCard({ icon: Icon, label, value, helper, color }: { icon: typeof MessageSquare; label: string; value: string; helper: string; color: string }) {
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

function formatClock(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function shortId(id: string) {
  return `#${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export default function ChatModerationPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [messageStates, setMessageStates] = useState<MessageState[]>([]);
  const [userStates, setUserStates] = useState<UserState[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newTerm, setNewTerm] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    const { data: activeSession } = await db
      .from("sessions")
      .select("id,status,started_at,ended_at")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [messageStatesRes, userStatesRes, termsRes] = await Promise.all([
      db.from("moderation_message_states").select("message_id,hidden,flagged,updated_at"),
      db.from("moderation_user_states").select("tiktok_user,watched,hidden_locally,note,updated_at"),
      db.from("moderation_terms").select("id,term,is_active,created_at,updated_at").order("term", { ascending: true }),
    ]);

    setMessageStates((messageStatesRes.data || []) as MessageState[]);
    setUserStates((userStatesRes.data || []) as UserState[]);
    setTerms((termsRes.data || []) as TermRow[]);

    if (activeSession) {
      const currentSession = activeSession as SessionRow;
      setSession(currentSession);
      const { data: chatData } = await db
        .from("chat_messages")
        .select("id,session_id,tiktok_user,message,is_vote,choice,created_at")
        .eq("session_id", currentSession.id)
        .order("created_at", { ascending: false })
        .limit(600);
      setMessages(((chatData || []) as ChatRow[]).reverse());
    } else {
      setSession(null);
      setMessages([]);
    }

    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [db]);

  useEffect(() => {
    refresh(false);
    const timer = window.setInterval(() => refresh(false), 15000);
    const channel = db
      .channel("admin-chat-moderation-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "moderation_message_states" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "moderation_user_states" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "moderation_terms" }, () => refresh(false))
      .subscribe();
    return () => {
      window.clearInterval(timer);
      db.removeChannel(channel);
    };
  }, [db, refresh]);

  const messageStateMap = useMemo(() => new Map(messageStates.map((row) => [row.message_id, row])), [messageStates]);
  const userStateMap = useMemo(() => new Map(userStates.map((row) => [row.tiktok_user.toLowerCase(), row])), [userStates]);
  const activeTerms = useMemo(() => terms.filter((term) => term.is_active).map((term) => term.term.trim().toLowerCase()).filter(Boolean), [terms]);

  const hasSensitiveTerm = useCallback((text: string) => {
    const lower = text.toLowerCase();
    return activeTerms.some((term) => lower.includes(term));
  }, [activeTerms]);

  const filteredMessages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return messages.filter((row) => {
      const state = messageStateMap.get(row.id);
      const sensitive = hasSensitiveTerm(row.message);
      if (filter === "messages" && row.is_vote) return false;
      if (filter === "votes" && !row.is_vote) return false;
      if (filter === "flagged" && !state?.flagged) return false;
      if (filter === "sensitive" && !sensitive) return false;
      if (needle && !row.tiktok_user.toLowerCase().includes(needle) && !row.message.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [filter, hasSensitiveTerm, messageStateMap, messages, query]);

  const realMessages = messages.filter((row) => !row.is_vote);
  const uniqueUsers = new Set(messages.map((row) => row.tiktok_user.toLowerCase())).size;
  const flaggedCount = messageStates.filter((row) => row.flagged && messages.some((m) => m.id === row.message_id)).length;
  const sensitiveCount = realMessages.filter((row) => hasSensitiveTerm(row.message)).length;
  const watchedCount = userStates.filter((row) => row.watched).length;

  const selectedUserRows = selectedUser ? messages.filter((row) => row.tiktok_user.toLowerCase() === selectedUser.toLowerCase()) : [];
  const selectedState = selectedUser ? userStateMap.get(selectedUser.toLowerCase()) : undefined;
  const selectedRealMessages = selectedUserRows.filter((row) => !row.is_vote).length;
  const selectedVotes = selectedUserRows.filter((row) => row.is_vote).length;
  const selectedFlags = selectedUserRows.filter((row) => messageStateMap.get(row.id)?.flagged).length;

  useEffect(() => {
    setNoteDraft(selectedState?.note || "");
  }, [selectedState, selectedUser]);

  async function setMessageState(messageId: string, patch: Partial<Pick<MessageState, "hidden" | "flagged">>) {
    const current = messageStateMap.get(messageId);
    const payload = {
      message_id: messageId,
      hidden: patch.hidden ?? current?.hidden ?? false,
      flagged: patch.flagged ?? current?.flagged ?? false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from("moderation_message_states").upsert(payload, { onConflict: "message_id" });
    if (error) return notify(`Impossible d'enregistrer la modération : ${error.message}`);
    await refresh(false);
  }

  async function setUserState(user: string, patch: Partial<Pick<UserState, "watched" | "hidden_locally" | "note">>) {
    const current = userStateMap.get(user.toLowerCase());
    const payload = {
      tiktok_user: user,
      watched: patch.watched ?? current?.watched ?? false,
      hidden_locally: patch.hidden_locally ?? current?.hidden_locally ?? false,
      note: patch.note ?? current?.note ?? "",
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from("moderation_user_states").upsert(payload, { onConflict: "tiktok_user" });
    if (error) return notify(`Impossible d'enregistrer l'utilisateur : ${error.message}`);
    await refresh(false);
  }

  async function addTerm() {
    const term = newTerm.trim();
    if (!term) return;
    const { error } = await db.from("moderation_terms").insert({ term, is_active: true });
    if (error) return notify(error.code === "23505" ? "Ce mot est déjà surveillé." : `Impossible d'ajouter le mot : ${error.message}`);
    setNewTerm("");
    notify(`« ${term} » ajouté aux mots surveillés.`);
    await refresh(false);
  }

  async function toggleTerm(term: TermRow) {
    const { error } = await db.from("moderation_terms").update({ is_active: !term.is_active, updated_at: new Date().toISOString() }).eq("id", term.id);
    if (error) return notify(`Impossible de modifier le mot : ${error.message}`);
    await refresh(false);
  }

  async function deleteTerm(term: TermRow) {
    const { error } = await db.from("moderation_terms").delete().eq("id", term.id);
    if (error) return notify(`Impossible de supprimer le mot : ${error.message}`);
    notify(`« ${term.term} » retiré des mots surveillés.`);
    await refresh(false);
  }

  if (loading) {
    return <div className="min-h-[70vh] flex items-center justify-center text-auth-muted text-sm">Chargement du chat et des règles de modération…</div>;
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "messages", label: "Messages" },
    { key: "votes", label: "Votes" },
    { key: "flagged", label: "Signalés" },
    { key: "sensitive", label: "À surveiller" },
  ];

  return (
    <main className="px-8 pt-7 pb-10 max-w-[1900px] mx-auto">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold text-auth-text tracking-tight">Chat & Modération</h1>
            <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${session ? "text-auth-green bg-auth-green/10" : "text-auth-muted bg-white/5"}`}>
              {session ? "En direct" : "Hors ligne"}
            </span>
          </div>
          <p className="text-auth-muted text-sm mt-1">Surveillez les commentaires TikTok et modérez l'affichage dans QuizzLiveFR.</p>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-auth-mutedDim">
            <span>{session ? `Session ${shortId(session.id)}` : "Aucune session active"}</span>
            {lastUpdated && <span>Mis à jour à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh(true)} disabled={refreshing} className="h-9 px-3 rounded-lg border border-auth-border bg-auth-panel text-auth-text text-xs font-semibold flex items-center gap-2 hover:bg-white/5 disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualiser
          </button>
          {session ? (
            <Link href="/admin/sessions-live" className="h-9 px-3 rounded-lg border border-auth-border bg-auth-panel text-auth-text text-xs font-semibold flex items-center gap-2 hover:bg-white/5">
              <Radio size={14} /> Ouvrir la session
            </Link>
          ) : (
            <Link href="/admin/sessions-live" className="h-9 px-4 rounded-lg text-white text-xs font-semibold flex items-center gap-2" style={{ background: "linear-gradient(90deg,#4C6FFF,#9B4DFF,#FF3D8E)" }}>
              <Radio size={14} /> Démarrer une session
            </Link>
          )}
          <AdminTopControls />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-5">
        <MetricCard icon={MessageSquare} label="Messages" value={String(realMessages.length)} helper="Commentaires TikTok hors votes" color="#3DDCFF" />
        <MetricCard icon={Vote} label="Votes détectés" value={String(messages.filter((row) => row.is_vote).length)} helper="Réponses A, B, C ou D" color="#4C6FFF" />
        <MetricCard icon={Users} label="Participants" value={String(uniqueUsers)} helper="Pseudos vus dans le chat" color="#9B4DFF" />
        <MetricCard icon={Flag} label="Signalements" value={String(flaggedCount)} helper="Messages marqués dans le panel" color="#EF4444" />
        <MetricCard icon={ShieldAlert} label="À surveiller" value={String(sensitiveCount)} helper={`${watchedCount} utilisateur${watchedCount > 1 ? "s" : ""} surveillé${watchedCount > 1 ? "s" : ""}`} color="#F5A623" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_350px] gap-4 items-start">
        <section className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {filters.map((item) => (
                <button key={item.key} onClick={() => setFilter(item.key)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition ${filter === item.key ? "bg-auth-blue/15 text-auth-text border border-auth-blue/25" : "text-auth-muted hover:text-auth-text border border-transparent"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="relative w-64 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pseudo ou message…" className="w-full h-8 rounded-lg border border-auth-border bg-auth-bg pl-9 pr-8 text-xs text-auth-text outline-none focus:border-auth-blue placeholder:text-auth-mutedDim" />
              {query && <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-auth-mutedDim hover:text-auth-text"><X size={13} /></button>}
            </div>
          </div>

          {!session ? (
            <div className="min-h-[330px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-xl border border-auth-border bg-auth-blue/10 text-auth-blue flex items-center justify-center mb-3"><Radio size={20} /></div>
              <p className="text-sm font-semibold text-auth-text">Aucune session en cours</p>
              <p className="text-[11px] leading-5 text-auth-muted mt-1 max-w-md">Les commentaires TikTok apparaîtront ici dès qu'une session sera active. Les règles de modération restent configurables à droite.</p>
              <Link href="/admin/sessions-live" className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "linear-gradient(90deg,#4C6FFF,#9B4DFF,#FF3D8E)" }}>Démarrer une session</Link>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="min-h-[330px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-11 h-11 rounded-xl border border-auth-border bg-white/[0.025] text-auth-mutedDim flex items-center justify-center mb-3"><MessageSquare size={19} /></div>
              <p className="text-sm font-semibold text-auth-text">{messages.length === 0 ? "Chat encore silencieux" : "Aucun message pour ce filtre"}</p>
              <p className="text-[11px] leading-5 text-auth-muted mt-1">{messages.length === 0 ? "Les commentaires et votes TikTok seront ajoutés automatiquement." : "Modifiez la recherche ou choisissez un autre filtre."}</p>
            </div>
          ) : (
            <div className="max-h-[570px] overflow-y-auto">
              {filteredMessages.map((row) => {
                const state = messageStateMap.get(row.id);
                const userState = userStateMap.get(row.tiktok_user.toLowerCase());
                const sensitive = !row.is_vote && hasSensitiveTerm(row.message);
                const locallyHidden = state?.hidden || userState?.hidden_locally;
                return (
                  <div key={row.id} className={`px-4 py-3 border-b border-auth-border/80 last:border-b-0 flex gap-3 group ${locallyHidden ? "opacity-50" : ""} ${selectedUser?.toLowerCase() === row.tiktok_user.toLowerCase() ? "bg-auth-blue/[0.045]" : "hover:bg-white/[0.018]"}`}>
                    <button onClick={() => setSelectedUser(row.tiktok_user)} className="w-8 h-8 rounded-full bg-gradient-to-br from-auth-blue/80 to-auth-purple/80 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {row.tiktok_user.slice(0, 2).toUpperCase()}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button onClick={() => setSelectedUser(row.tiktok_user)} className="text-xs font-semibold text-auth-text hover:text-auth-blue truncate">@{row.tiktok_user}</button>
                        <span className="text-[10px] text-auth-mutedDim">{formatClock(row.created_at)}</span>
                        {row.is_vote && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-auth-blue bg-auth-blue/10">VOTE {row.choice?.toUpperCase()}</span>}
                        {sensitive && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-auth-orange bg-auth-orange/10">À SURVEILLER</span>}
                        {state?.flagged && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-auth-live bg-auth-live/10">SIGNALÉ</span>}
                        {locallyHidden && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-auth-muted bg-white/5">MASQUÉ</span>}
                      </div>
                      <p className={`mt-1 text-[13px] leading-5 break-words ${row.is_vote ? "text-auth-muted" : "text-auth-text"}`}>{row.message}</p>
                    </div>
                    <div className="flex items-start gap-1 opacity-60 group-hover:opacity-100 transition shrink-0">
                      <button title={state?.flagged ? "Retirer le signalement" : "Signaler dans le panel"} onClick={() => setMessageState(row.id, { flagged: !state?.flagged })} className={`w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center hover:bg-white/5 ${state?.flagged ? "text-auth-live border-auth-live/25 bg-auth-live/5" : "text-auth-muted"}`}><Flag size={14} /></button>
                      <button title={state?.hidden ? "Réafficher le message" : "Masquer dans le panel"} onClick={() => setMessageState(row.id, { hidden: !state?.hidden })} className={`w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center hover:bg-white/5 ${state?.hidden ? "text-auth-blue border-auth-blue/25 bg-auth-blue/5" : "text-auth-muted"}`}>{state?.hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                      <button title="Voir le profil de modération" onClick={() => setSelectedUser(row.tiktok_user)} className="w-8 h-8 rounded-lg border border-auth-border text-auth-muted flex items-center justify-center hover:bg-white/5 hover:text-auth-text"><UserRoundSearch size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-2.5 border-t border-auth-border flex items-center justify-between text-[10px] text-auth-mutedDim">
            <span>{filteredMessages.length} élément{filteredMessages.length > 1 ? "s" : ""} affiché{filteredMessages.length > 1 ? "s" : ""}</span>
            <span>Les actions de modération sont internes à QuizzLiveFR.</span>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between">
              <div><p className="text-xs font-bold text-auth-text">Profil de modération</p><p className="text-[10px] text-auth-muted mt-0.5">Utilisateur sélectionné</p></div>
              <Shield size={16} className="text-auth-blue" />
            </div>
            {!selectedUser ? (
              <div className="px-4 py-8 text-center"><UserRoundSearch size={20} className="text-auth-mutedDim mx-auto" /><p className="text-xs font-semibold text-auth-text mt-2">Aucun utilisateur sélectionné</p><p className="text-[10px] text-auth-muted mt-1 leading-4">Cliquez sur un pseudo dans le chat pour afficher ses informations.</p></div>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-auth-blue to-auth-purple text-white text-xs font-bold flex items-center justify-center">{selectedUser.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0"><p className="text-sm font-bold text-auth-text truncate">@{selectedUser}</p><p className="text-[10px] text-auth-muted">{selectedUserRows.length} interaction{selectedUserRows.length > 1 ? "s" : ""} dans cette session</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg border border-auth-border bg-auth-bg p-2.5"><p className="text-[9px] uppercase tracking-wide text-auth-mutedDim">Messages</p><p className="text-base font-bold text-auth-text mt-1">{selectedRealMessages}</p></div>
                  <div className="rounded-lg border border-auth-border bg-auth-bg p-2.5"><p className="text-[9px] uppercase tracking-wide text-auth-mutedDim">Votes</p><p className="text-base font-bold text-auth-text mt-1">{selectedVotes}</p></div>
                  <div className="rounded-lg border border-auth-border bg-auth-bg p-2.5"><p className="text-[9px] uppercase tracking-wide text-auth-mutedDim">Signalés</p><p className="text-base font-bold text-auth-text mt-1">{selectedFlags}</p></div>
                </div>
                <div className="space-y-2">
                  <button onClick={() => setUserState(selectedUser, { watched: !selectedState?.watched })} className={`w-full h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 ${selectedState?.watched ? "border-auth-orange/30 bg-auth-orange/10 text-auth-orange" : "border-auth-border text-auth-text hover:bg-white/5"}`}><ShieldAlert size={14} />{selectedState?.watched ? "Retirer de la surveillance" : "Mettre sous surveillance"}</button>
                  <button onClick={() => setUserState(selectedUser, { hidden_locally: !selectedState?.hidden_locally })} className={`w-full h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 ${selectedState?.hidden_locally ? "border-auth-blue/30 bg-auth-blue/10 text-auth-blue" : "border-auth-border text-auth-text hover:bg-white/5"}`}>{selectedState?.hidden_locally ? <Eye size={14} /> : <EyeOff size={14} />}{selectedState?.hidden_locally ? "Réafficher dans le panel" : "Masquer dans le panel"}</button>
                  <button onClick={() => notify("Les sanctions TikTok (mute/ban) ne sont pas encore connectées au worker.")} className="w-full h-9 rounded-lg border border-auth-live/20 bg-auth-live/[0.035] text-auth-live/70 text-xs font-semibold flex items-center justify-center gap-2"><Ban size={14} />Sanction TikTok non connectée</button>
                </div>
                <div className="mt-4">
                  <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-auth-mutedDim">Note interne</label>
                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} placeholder="Ajouter une note de modération…" className="mt-1.5 w-full rounded-lg border border-auth-border bg-auth-bg p-2.5 text-xs text-auth-text outline-none focus:border-auth-blue resize-none placeholder:text-auth-mutedDim" />
                  <button onClick={() => setUserState(selectedUser, { note: noteDraft })} className="mt-2 w-full h-8 rounded-lg bg-auth-blue/15 border border-auth-blue/25 text-auth-text text-[11px] font-semibold hover:bg-auth-blue/20">Enregistrer la note</button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between">
              <div><p className="text-xs font-bold text-auth-text">Mots surveillés</p><p className="text-[10px] text-auth-muted mt-0.5">Détection visuelle dans le chat</p></div>
              <AlertTriangle size={15} className="text-auth-orange" />
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTerm(); }} placeholder="Ajouter un mot…" className="h-9 flex-1 min-w-0 rounded-lg border border-auth-border bg-auth-bg px-3 text-xs text-auth-text outline-none focus:border-auth-blue placeholder:text-auth-mutedDim" />
                <button onClick={addTerm} disabled={!newTerm.trim()} className="w-9 h-9 rounded-lg bg-auth-blue/15 border border-auth-blue/25 text-auth-blue flex items-center justify-center disabled:opacity-40"><Plus size={15} /></button>
              </div>
              <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto">
                {terms.length === 0 ? (
                  <div className="py-5 text-center"><CheckCircle2 size={18} className="text-auth-mutedDim mx-auto" /><p className="text-[10px] text-auth-muted mt-2">Aucun mot surveillé pour le moment.</p></div>
                ) : terms.map((term) => (
                  <div key={term.id} className="flex items-center gap-2 rounded-lg border border-auth-border bg-auth-bg px-2.5 py-2">
                    <button onClick={() => toggleTerm(term)} className={`w-2 h-2 rounded-full shrink-0 ${term.is_active ? "bg-auth-orange" : "bg-auth-mutedDim"}`} title={term.is_active ? "Désactiver" : "Activer"} />
                    <span className={`text-[11px] flex-1 truncate ${term.is_active ? "text-auth-text" : "text-auth-muted line-through"}`}>{term.term}</span>
                    <button onClick={() => deleteTerm(term)} className="text-auth-mutedDim hover:text-auth-live"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <p className="text-[9px] leading-4 text-auth-mutedDim mt-3">La détection est locale au panel. Elle n'efface pas automatiquement un commentaire sur TikTok.</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
