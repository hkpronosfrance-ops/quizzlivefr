"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Users,
  Eye,
  MessageCircle,
  Target,
  TrendingUp,
  Plus,
  Upload,
  BarChart3,
  Settings,
  ArrowRight,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabaseBrowser } from "@/lib/supabase";
import type { Question } from "@/lib/supabase";

// Mock data — no analytics/aggregation backend yet, wired for real once it exists.
const STAT_CARDS = [
  { icon: Gamepad2, label: "Parties aujourd'hui", value: "12", delta: "+20% vs hier", color: "#4C6FFF" },
  { icon: Users, label: "Joueurs uniques", value: "1 248", delta: "+18% vs hier", color: "#9B4DFF" },
  { icon: Eye, label: "Spectateurs live", value: "2 853", delta: "+32% vs hier", color: "#3DDCFF" },
  { icon: MessageCircle, label: "Réponses envoyées", value: "18 392", delta: "+25% vs hier", color: "#FF3D8E" },
  { icon: Target, label: "Taux de réussite", value: "67%", delta: "+4% vs hier", color: "#F5A623" },
];

const ACTIVITY_DATA = [
  { day: "16 mai", joueurs: 1900, reponses: 3400 },
  { day: "17 mai", joueurs: 2100, reponses: 3100 },
  { day: "18 mai", joueurs: 1750, reponses: 3600 },
  { day: "19 mai", joueurs: 2300, reponses: 3300 },
  { day: "20 mai", joueurs: 2450, reponses: 3900 },
  { day: "21 mai", joueurs: 2200, reponses: 3700 },
  { day: "22 mai", joueurs: 2600, reponses: 4200 },
];

const QUESTION_BANK = [
  { name: "Culture générale", count: 1042, color: "#4C6FFF" },
  { name: "Sport", count: 452, color: "#22C55E" },
  { name: "Cinéma", count: 386, color: "#9B4DFF" },
  { name: "Histoire", count: 312, color: "#F5A623" },
  { name: "Géographie", count: 258, color: "#3DDCFF" },
];

type SessionRow = {
  id: string;
  started_at: string;
  status: string;
  players: number;
};

export default function DashboardPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [playerCount, setPlayerCount] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<{ current: number; total: number } | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    async function loadActive() {
      const { data: q } = await db
        .from("questions")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveQuestion(q ?? null);

      if (q) {
        const { data: answers } = await db.from("answers").select("choice").eq("question_id", q.id);
        const counts: Record<string, number> = {};
        (answers ?? []).forEach((a) => {
          counts[a.choice] = (counts[a.choice] ?? 0) + 1;
        });
        setAnswerCounts(counts);

        const { count: players } = await db
          .from("leaderboard")
          .select("*", { count: "exact", head: true })
          .eq("session_id", q.session_id);
        setPlayerCount(players ?? 0);

        const { count: totalQuestions } = await db
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("session_id", q.session_id);
        const { data: allQuestions } = await db
          .from("questions")
          .select("id, started_at")
          .eq("session_id", q.session_id)
          .order("started_at", { ascending: true });
        const idx = (allQuestions ?? []).findIndex((row) => row.id === q.id);
        setQuestionIndex({ current: idx + 1, total: totalQuestions ?? 0 });
      }
    }
    loadActive();

    const channel = db
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, loadActive)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, loadActive)
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [db]);

  useEffect(() => {
    async function loadSessions() {
      const { data: sessions } = await db
        .from("sessions")
        .select("id, started_at, status")
        .order("started_at", { ascending: false })
        .limit(5);

      if (!sessions) return;

      const withCounts = await Promise.all(
        sessions.map(async (s) => {
          const { count } = await db
            .from("leaderboard")
            .select("*", { count: "exact", head: true })
            .eq("session_id", s.id);
          return { ...s, players: count ?? 0 };
        })
      );
      setRecentSessions(withCounts);
    }
    loadSessions();
  }, [db]);

  const isLive = !!activeQuestion;
  const choices = activeQuestion
    ? (["a", "b", "c", "d"] as const).filter((c) => activeQuestion[`choice_${c}`])
    : [];
  const totalVotes = Object.values(answerCounts).reduce((a, b) => a + b, 0);
  const CHOICE_COLORS: Record<string, string> = { a: "#FF3D8E", b: "#4C6FFF", c: "#3DDCFF", d: "#22C55E" };

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map(({ icon: Icon, label, value, delta, color }) => (
          <div key={label} className="bg-auth-panel border border-auth-border rounded-xl p-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${color}22`, color }}
            >
              <Icon size={17} />
            </div>
            <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-auth-text text-2xl font-bold mb-1">{value}</p>
            <p className="text-auth-positive text-xs flex items-center gap-1">
              <TrendingUp size={11} />
              {delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partie en cours — REAL data */}
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between">
            <span className="text-auth-text font-bold text-sm uppercase tracking-wide">Partie en cours</span>
            {isLive ? (
              <span className="flex items-center gap-1.5 text-auth-live text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="text-auth-mutedDim text-xs">Hors ligne</span>
            )}
          </div>

          {isLive && activeQuestion ? (
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-auth-mutedDim uppercase tracking-wide mb-1">ID session</p>
                  <p className="text-auth-text font-mono">#{activeQuestion.session_id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-auth-mutedDim uppercase tracking-wide mb-1">Joueurs en live</p>
                  <p className="text-auth-text font-semibold">{playerCount}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-auth-mutedDim uppercase tracking-wide mb-1">Question actuelle</p>
                  <p className="text-auth-text font-semibold">{activeQuestion.text}</p>
                  {questionIndex && (
                    <p className="text-auth-mutedDim text-[11px] mt-0.5">
                      Question {questionIndex.current} / {questionIndex.total}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {choices.map((c) => {
                  const count = answerCounts[c] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <div key={c} className="relative rounded-lg overflow-hidden bg-auth-bg border border-auth-border h-9">
                      <div
                        className="absolute inset-y-0 left-0 opacity-25"
                        style={{ width: `${pct}%`, background: CHOICE_COLORS[c], transition: "width 0.3s" }}
                      />
                      <div className="relative h-full flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: CHOICE_COLORS[c], color: "#05060C" }}
                          >
                            {c.toUpperCase()}
                          </span>
                          <span className="text-auth-text text-xs">{activeQuestion[`choice_${c}`]}</span>
                        </div>
                        <span className="text-auth-mutedDim text-xs font-mono">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-auth-mutedDim text-xs">{totalVotes} réponses au total</p>

              <Link
                href="/admin/sessions-live"
                className="flex items-center justify-center gap-1.5 border border-auth-border rounded-lg py-2.5 text-auth-text text-sm hover:bg-white/5 transition"
              >
                Voir le live <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
              <p className="text-auth-muted text-sm">Aucune partie en cours.</p>
              <Link
                href="/admin/sessions-live"
                className="flex items-center gap-1.5 text-white text-sm font-semibold rounded-lg px-4 py-2"
                style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
              >
                <Plus size={15} /> Lancer une question
              </Link>
            </div>
          )}
        </div>

        {/* Activity chart — mock */}
        <div className="bg-auth-panel border border-auth-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-auth-text font-bold text-sm uppercase tracking-wide">Activité des 7 derniers jours</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ACTIVITY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1D2030" />
              <XAxis dataKey="day" stroke="#6B7086" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7086" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0A0C16", border: "1px solid #1D2030", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#F3F4F8" }}
              />
              <Line type="monotone" dataKey="joueurs" name="Joueurs uniques" stroke="#4C6FFF" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="reponses" name="Réponses" stroke="#9B4DFF" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sessions — REAL data */}
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between">
            <span className="text-auth-text font-bold text-sm uppercase tracking-wide">Dernières sessions live</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-auth-mutedDim text-[10px] uppercase tracking-wide border-b border-auth-border">
                <th className="text-left px-5 py-2 font-medium">Session</th>
                <th className="text-left px-2 py-2 font-medium">Date</th>
                <th className="text-left px-2 py-2 font-medium">Joueurs</th>
                <th className="text-left px-2 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-auth-mutedDim text-xs">
                    Aucune session pour l'instant.
                  </td>
                </tr>
              )}
              {recentSessions.map((s) => (
                <tr key={s.id} className="border-b border-auth-border last:border-b-0">
                  <td className="px-5 py-3 text-auth-text font-mono text-xs">#{s.id.slice(0, 8)}</td>
                  <td className="px-2 py-3 text-auth-muted text-xs">
                    {new Date(s.started_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-2 py-3 text-auth-text text-xs">{s.players}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.status === "active" ? "bg-auth-live/15 text-auth-live" : "bg-white/5 text-auth-mutedDim"
                      }`}
                    >
                      {s.status === "active" ? "EN COURS" : "TERMINÉE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Question bank — mock */}
        <div className="bg-auth-panel border border-auth-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-auth-text font-bold text-sm uppercase tracking-wide">Banque de questions</span>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-auth-text text-3xl font-bold">2 450</p>
              <p className="text-auth-mutedDim text-xs">Questions totales</p>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {QUESTION_BANK.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-auth-muted">{c.name}</span>
                  </div>
                  <span className="text-auth-text font-mono">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-auth-panel border border-auth-border rounded-xl p-5">
        <span className="text-auth-text font-bold text-sm uppercase tracking-wide mb-4 block">Actions rapides</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link
            href="/admin/sessions-live"
            className="flex flex-col items-center gap-2 border border-auth-border rounded-lg py-4 text-auth-text text-xs hover:bg-white/5 transition"
          >
            <Plus size={18} />
            Nouvelle partie
          </Link>
          {[
            { icon: Plus, label: "Ajouter question" },
            { icon: Upload, label: "Importer questions" },
            { icon: BarChart3, label: "Statistiques" },
            { icon: Settings, label: "Paramètres" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => alert(`${label} — bientôt disponible.`)}
              className="flex flex-col items-center gap-2 border border-auth-border rounded-lg py-4 text-auth-text text-xs hover:bg-white/5 transition"
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
