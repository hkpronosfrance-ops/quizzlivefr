"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  PlayCircle,
  BarChart3,
  MessageCircle,
  Lock as LockSmall,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import type { LeaderboardRow, Question } from "@/lib/supabase";

function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4C6FFF" />
          <stop offset="0.55" stopColor="#9B4DFF" />
          <stop offset="1" stopColor="#FF3D8E" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="90 24" />
      <path d="M20 12a8 8 0 1 1-5.66 2.34" stroke="url(#logoGrad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M20 12l3.2 3.2-4.4 1.2 1.2-4.4z" fill="url(#logoGrad)" />
    </svg>
  );
}

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: PlayCircle,
    title: "Gestion des sessions live",
    desc: "Créez, lancez et gérez vos parties en direct en toute simplicité.",
  },
  {
    icon: BarChart3,
    title: "Suivi des statistiques",
    desc: "Analysez les performances et l'engagement de vos joueurs en temps réel.",
  },
  {
    icon: MessageCircle,
    title: "Modération du chat",
    desc: "Supervisez les discussions et assurez un environnement sain et sécurisé.",
  },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const db = supabaseBrowser(true);
    db.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setCheckingSession(false);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    const db = supabaseBrowser(remember);
    const { error: signInError } = await db.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError("Adresse e-mail ou mot de passe incorrect.");
      return;
    }

    setAuthed(true);
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Renseigne ton adresse e-mail pour recevoir le lien de réinitialisation.");
      return;
    }
    const db = supabaseBrowser(true);
    const { error: resetError } = await db.auth.resetPasswordForEmail(email);
    if (resetError) {
      setError("Impossible d'envoyer le lien pour le moment.");
    } else {
      setError("");
      setInfo("Lien de réinitialisation envoyé si ce compte existe.");
    }
  }

  if (checkingSession) {
    return <div className="min-h-screen bg-auth-bg" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-auth-bg font-body flex flex-col">
        {/* Top bar */}
        <div className="max-w-[1200px] w-full mx-auto px-6 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="text-auth-text font-bold text-lg tracking-tight">
              QUIZLIVE
              <sup className="text-[10px] font-bold text-auth-blue ml-0.5">FR</sup>
            </span>
          </div>
          <div className="flex items-center gap-2 text-auth-muted text-sm">
            <ShieldCheck size={16} />
            <span>Accès réservé aux administrateurs</span>
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="max-w-[1140px] w-full rounded-2xl border border-auth-border overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-auth-panel">
            {/* Left: form */}
            <div className="p-10 md:p-14 flex flex-col justify-center">
              <span className="text-auth-blue text-xs font-bold tracking-[0.15em] uppercase mb-3">
                Espace admin
              </span>
              <h1 className="text-auth-text text-3xl font-bold mb-2">Connexion à l'espace admin</h1>
              <p className="text-auth-muted text-sm mb-8">Accédez au panel de gestion QuizzLiveFR</p>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-auth-text text-sm">Adresse e-mail</span>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-auth-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@quizzlivefr.fr"
                      className="w-full bg-auth-bg border border-auth-border rounded-lg pl-10 pr-4 py-3 text-auth-text text-sm outline-none focus:border-auth-blue placeholder:text-auth-mutedDim"
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-auth-text text-sm">Mot de passe</span>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-auth-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="w-full bg-auth-bg border border-auth-border rounded-lg pl-10 pr-11 py-3 text-auth-text text-sm outline-none focus:border-auth-blue placeholder:text-auth-mutedDim"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-auth-muted hover:text-auth-text transition"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-auth-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded accent-auth-blue"
                    />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-auth-blue hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {error && <p className="text-auth-danger text-sm">{error}</p>}
                {info && !error && <p className="text-auth-blue text-sm">{info}</p>}

                <button
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white transition disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 55%, #FF3D8E 100%)" }}
                >
                  <LogIn size={18} />
                  {submitting ? "Connexion…" : "Se connecter"}
                </button>

                <div className="flex items-center gap-4 text-auth-mutedDim text-xs">
                  <div className="flex-1 h-px bg-auth-border" />
                  OU
                  <div className="flex-1 h-px bg-auth-border" />
                </div>

                <button
                  type="button"
                  onClick={() => setInfo("Connexion Google bientôt disponible.")}
                  className="flex items-center justify-center gap-2.5 border border-auth-border rounded-lg py-3 text-auth-text text-sm hover:bg-white/5 transition"
                >
                  <GoogleG />
                  Se connecter avec Google
                </button>

                <div className="flex items-center justify-center gap-1.5 text-auth-mutedDim text-xs mt-2">
                  <LockSmall size={12} />
                  Connexion sécurisée via HTTPS
                </div>
              </form>
            </div>

            {/* Right: marketing panel */}
            <div className="relative bg-auth-panelAlt border-t md:border-t-0 md:border-l border-auth-border p-10 md:p-14 flex flex-col overflow-hidden">
              <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, #4C6FFF, transparent 70%)" }}
              />
              <div className="flex justify-center mb-10 relative">
                <Logo size={88} />
              </div>
              <div className="flex flex-col relative">
                {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                  <div
                    key={title}
                    className={`flex items-start gap-4 py-4 ${i < FEATURES.length - 1 ? "border-b border-auth-border" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-auth-blue">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-auth-text text-sm font-semibold mb-0.5">{title}</p>
                      <p className="text-auth-muted text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-4 pt-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-auth-blue">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-auth-text text-sm font-semibold mb-0.5">Plateforme sécurisée et fiable</p>
                    <p className="text-auth-muted text-xs leading-relaxed">Vos données sont protégées et confidentielles.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-auth-mutedDim text-xs pb-8">
          © 2026 QuizzLiveFR. Tous droits réservés.
        </div>
      </div>
    );
  }

  return <ControlPanel />;
}

const CHANNELS = [
  { key: "a" as const, label: "CH.A", color: "#FF2D6A" },
  { key: "b" as const, label: "CH.B", color: "#FFD400" },
  { key: "c" as const, label: "CH.C", color: "#3DDCFF" },
  { key: "d" as const, label: "CH.D", color: "#7CFF6B" },
];

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
