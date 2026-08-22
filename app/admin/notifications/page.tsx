"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CircleCheck,
  Clock3,
  Mail,
  Radio,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Smartphone,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";

type NotificationType = "session_started" | "session_ended" | "sensitive_message" | "system";
type Severity = "info" | "success" | "warning" | "critical";
type FilterKey = "all" | "unread" | "sessions" | "sensitive";

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  session_id: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

type Preferences = {
  user_id: string;
  session_started: boolean;
  session_ended: boolean;
  sensitive_message: boolean;
  sound_enabled: boolean;
};

type IconType = typeof Bell;

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full border transition ${checked ? "border-auth-blue bg-auth-blue" : "border-auth-border bg-black/20"}`}
    >
      <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all ${checked ? "left-[21px]" : "left-[3px]"}`} />
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, helper, color }: { icon: IconType; label: string; value: number; helper: string; color: string }) {
  return (
    <div className="rounded-xl border border-auth-border bg-auth-panel px-4 py-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-auth-mutedDim truncate">{label}</p>
          <p className="mt-1 text-[28px] leading-none font-bold text-auth-text tracking-tight">{value}</p>
          <p className="mt-1.5 text-[10px] leading-4 text-auth-muted">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function iconFor(type: NotificationType) {
  if (type === "session_started") return Radio;
  if (type === "session_ended") return CheckCheck;
  if (type === "sensitive_message") return ShieldAlert;
  return Bell;
}

function colorFor(severity: Severity) {
  if (severity === "success") return "#22c55e";
  if (severity === "warning") return "#f59e0b";
  if (severity === "critical") return "#ef4444";
  return "#4C6FFF";
}

export default function NotificationsPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    const [{ data: sessionData }, eventsRes] = await Promise.all([
      db.auth.getSession(),
      db.from("notification_events").select("id,type,title,message,severity,session_id,source_id,metadata,created_at,read_at").order("created_at", { ascending: false }).limit(200),
    ]);

    setItems((eventsRes.data || []) as NotificationRow[]);
    const userId = sessionData.session?.user.id;
    if (userId) {
      const { data: existing } = await db.from("notification_preferences").select("user_id,session_started,session_ended,sensitive_message,sound_enabled").eq("user_id", userId).maybeSingle();
      if (existing) {
        setPrefs(existing as Preferences);
      } else {
        const defaults: Preferences = { user_id: userId, session_started: true, session_ended: true, sensitive_message: true, sound_enabled: false };
        const { data: inserted } = await db.from("notification_preferences").insert(defaults).select("user_id,session_started,session_ended,sensitive_message,sound_enabled").single();
        setPrefs((inserted || defaults) as Preferences);
      }
    }
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [db]);

  useEffect(() => {
    refresh();
    const channel = db
      .channel("notifications-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_events" }, () => refresh())
      .subscribe();
    const fallback = window.setInterval(() => refresh(), 15000);
    return () => {
      window.clearInterval(fallback);
      db.removeChannel(channel);
    };
  }, [db, refresh]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    const { error } = await db.from("notification_events").update({ read_at: now }).eq("id", id);
    if (error) return notify("Impossible de marquer la notification comme lue.");
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    const { error } = await db.from("notification_events").update({ read_at: now }).is("read_at", null);
    if (error) return notify("Impossible de tout marquer comme lu.");
    setItems((current) => current.map((item) => item.read_at ? item : { ...item, read_at: now }));
    notify("Toutes les notifications sont marquées comme lues.");
  }

  async function togglePreference(key: keyof Omit<Preferences, "user_id">) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { error } = await db.from("notification_preferences").update({ [key]: next[key], updated_at: new Date().toISOString() }).eq("user_id", prefs.user_id);
    if (error) {
      setPrefs(prefs);
      notify("La préférence n’a pas pu être enregistrée.");
    }
  }

  const filtered = items.filter((item) => {
    if (filter === "unread") return !item.read_at;
    if (filter === "sessions") return item.type === "session_started" || item.type === "session_ended";
    if (filter === "sensitive") return item.type === "sensitive_message";
    return true;
  });

  const unread = items.filter((x) => !x.read_at).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = items.filter((x) => new Date(x.created_at) >= todayStart).length;
  const sessionEvents = items.filter((x) => x.type === "session_started" || x.type === "session_ended").length;
  const sensitive = items.filter((x) => x.type === "sensitive_message").length;

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Toutes", count: items.length },
    { key: "unread", label: "Non lues", count: unread },
    { key: "sessions", label: "Sessions", count: sessionEvents },
    { key: "sensitive", label: "Mots sensibles", count: sensitive },
  ];

  return (
    <main className="px-8 py-7 max-w-[1800px] mx-auto">
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold text-auth-text tracking-tight">Notifications</h1>
            {unread > 0 && <span className="rounded-full border border-auth-pink/25 bg-auth-pink/10 px-2 py-1 text-[9px] font-bold text-auth-pink">{unread} NON LUE{unread > 1 ? "S" : ""}</span>}
          </div>
          <p className="text-auth-muted text-sm mt-1">Suivez les événements importants détectés par QuizzLiveFR.</p>
          <p className="text-auth-mutedDim text-[10px] mt-2">{lastUpdated ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Synchronisation en cours"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refresh(true)} className="h-9 px-3 rounded-lg border border-auth-border bg-auth-panel text-xs font-semibold text-auth-text flex items-center gap-2 hover:bg-white/5 transition">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualiser
          </button>
          <button onClick={markAllRead} disabled={unread === 0} className="h-9 px-3 rounded-lg border border-auth-border bg-auth-panel text-xs font-semibold text-auth-text flex items-center gap-2 hover:bg-white/5 disabled:opacity-35 transition">
            <CheckCheck size={14} /> Tout marquer comme lu
          </button>
          <AdminTopControls />
        </div>
      </div>

      <section className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard icon={BellRing} label="NON LUES" value={unread} helper="Demandent encore votre attention" color="#9B4DFF" />
        <MetricCard icon={Clock3} label="AUJOURD’HUI" value={today} helper="Événements enregistrés aujourd’hui" color="#4C6FFF" />
        <MetricCard icon={Radio} label="ÉVÉNEMENTS SESSION" value={sessionEvents} helper="Démarrages et fins de session" color="#22c55e" />
        <MetricCard icon={ShieldAlert} label="MOTS SENSIBLES" value={sensitive} helper="Détections issues de vos règles" color="#f59e0b" />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden min-h-[460px]">
          <div className="h-14 px-4 border-b border-auth-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              {filters.map((item) => (
                <button key={item.key} onClick={() => setFilter(item.key)} className={`h-8 rounded-lg px-3 text-[11px] font-semibold transition ${filter === item.key ? "bg-auth-blue/15 text-auth-text border border-auth-blue/30" : "text-auth-muted hover:text-auth-text"}`}>
                  {item.label}
                  <span className={`ml-1.5 inline-flex min-w-4 h-4 items-center justify-center rounded px-1 text-[9px] ${item.count > 0 ? "bg-white/7 text-auth-text" : "text-auth-mutedDim"}`}>{item.count}</span>
                </button>
              ))}
            </div>
            <span className="text-[10px] text-auth-mutedDim">{filtered.length} élément{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-auth-muted text-sm">Chargement des notifications…</div>
          ) : filtered.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center -translate-y-2 text-center px-6">
              <div className="w-14 h-14 rounded-2xl border border-auth-blue/20 bg-auth-blue/[0.06] flex items-center justify-center text-auth-blue mb-4"><BellRing size={23} /></div>
              <p className="text-auth-text font-semibold text-[15px]">Centre de notifications prêt</p>
              <p className="text-auth-muted text-xs mt-1.5 max-w-[430px] leading-5">Aucune alerte pour le moment. Les débuts et fins de session ainsi que les détections sensibles apparaîtront ici automatiquement.</p>
              <div className="mt-5 flex items-center gap-2 text-[10px] text-auth-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] px-2.5 py-1.5 text-emerald-300"><CircleCheck size={12} className="text-emerald-400" /> Suivi interne actif</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.04] px-2.5 py-1.5"><ShieldAlert size={12} className="text-amber-400" /> Règles sensibles surveillées</span>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-auth-border/80">
              {filtered.map((item) => {
                const Icon = iconFor(item.type);
                const color = colorFor(item.severity);
                const unreadItem = !item.read_at;
                return (
                  <button key={item.id} onClick={() => unreadItem && markRead(item.id)} className={`w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-white/[0.025] transition ${unreadItem ? "bg-auth-blue/[0.035]" : ""}`}>
                    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}><Icon size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="text-auth-text text-sm font-semibold truncate">{item.title}</p>{unreadItem && <span className="w-2 h-2 rounded-full bg-auth-pink shrink-0" />}</div>
                      <p className="text-auth-muted text-xs mt-1 leading-5">{item.message}</p>
                      <p className="text-auth-mutedDim text-[10px] mt-1.5">{formatRelative(item.created_at)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-auth-border flex items-center gap-2">
              <Settings2 size={15} className="text-auth-blue" />
              <div><p className="text-auth-text text-xs font-bold">Préférences</p><p className="text-auth-mutedDim text-[10px]">Événements à faire remonter</p></div>
            </div>
            <div className="px-4 py-3.5 space-y-3">
              {prefs && [
                ["session_started", "Début de session", "Quand une session démarre", Radio],
                ["session_ended", "Fin de session", "Quand une session est clôturée", CheckCheck],
                ["sensitive_message", "Mot sensible détecté", "Selon vos mots surveillés", AlertTriangle],
              ].map(([key, title, helper, Icon]) => {
                const PreferenceIcon = Icon as typeof Bell;
                const prefKey = key as "session_started" | "session_ended" | "sensitive_message";
                return (
                  <div key={prefKey} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-auth-border bg-black/15 flex items-center justify-center text-auth-muted"><PreferenceIcon size={14} /></div>
                    <div className="flex-1 min-w-0"><p className="text-auth-text text-xs font-semibold">{String(title)}</p><p className="text-auth-mutedDim text-[10px] mt-0.5">{String(helper)}</p></div>
                    <Switch checked={prefs[prefKey]} onChange={() => togglePreference(prefKey)} />
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2.5 border-t border-auth-border bg-black/[0.08] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted">{prefs?.sound_enabled ? <Volume2 size={14} className="text-auth-purple" /> : <VolumeX size={14} />}</div>
              <div className="flex-1"><p className="text-auth-text text-xs font-semibold">Alerte sonore</p><p className="text-auth-mutedDim text-[10px] mt-0.5">Dans ce navigateur</p></div>
              {prefs && <Switch checked={prefs.sound_enabled} onChange={() => togglePreference("sound_enabled")} />}
            </div>
          </div>

          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-auth-border">
              <p className="text-auth-text text-xs font-bold">Canaux de notification</p>
              <p className="text-auth-mutedDim text-[10px] mt-0.5">Modes de réception actuellement disponibles</p>
            </div>
            <div className="p-3 space-y-2">
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.055] px-3 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Bell size={14} /></div>
                <div className="flex-1"><p className="text-auth-text text-xs font-semibold">Panel QuizzLiveFR</p><p className="text-auth-mutedDim text-[10px] mt-0.5">Centre + cloche du header</p></div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold tracking-wide text-emerald-300">ACTIF</span>
              </div>
              <div className="rounded-lg border border-auth-border px-3 py-2.5 flex items-center gap-3 bg-white/[0.01]">
                <div className="w-8 h-8 rounded-lg bg-white/[0.035] text-auth-muted flex items-center justify-center"><Mail size={14} /></div>
                <div className="flex-1"><p className="text-auth-text/85 text-xs font-semibold">Email</p><p className="text-auth-muted text-[10px] mt-0.5">Aucun service configuré</p></div>
                <span className="rounded border border-auth-border bg-white/[0.025] px-1.5 py-1 text-[8px] font-bold text-auth-muted">NON CONFIGURÉ</span>
              </div>
              <div className="rounded-lg border border-auth-border px-3 py-2.5 flex items-center gap-3 bg-white/[0.01]">
                <div className="w-8 h-8 rounded-lg bg-white/[0.035] text-auth-muted flex items-center justify-center"><Smartphone size={14} /></div>
                <div className="flex-1"><p className="text-auth-text/85 text-xs font-semibold">Push / mobile</p><p className="text-auth-muted text-[10px] mt-0.5">Aucun canal externe connecté</p></div>
                <span className="rounded border border-auth-border bg-white/[0.025] px-1.5 py-1 text-[8px] font-bold text-auth-muted">NON CONFIGURÉ</span>
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-auth-border bg-auth-blue/[0.025]">
              <Link href="/admin/chat-moderation" className="text-[10px] font-semibold text-auth-blue hover:underline">Gérer les mots surveillés →</Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}