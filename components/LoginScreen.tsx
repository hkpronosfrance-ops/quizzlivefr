"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, PlayCircle, BarChart3, MessageCircle, Lock as LockSmall } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { Logo, GoogleG } from "./Logo";

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

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    onSuccess();
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

  return (
    <div className="min-h-screen bg-auth-bg font-body flex flex-col">
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

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-[1140px] w-full rounded-2xl border border-auth-border overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-auth-panel">
          <div className="p-10 md:p-14 flex flex-col justify-center">
            <span className="text-auth-blue text-xs font-bold tracking-[0.15em] uppercase mb-3">Espace admin</span>
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
                <button type="button" onClick={handleForgotPassword} className="text-auth-blue hover:underline">
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
                <div key={title} className={`flex items-start gap-4 py-4 ${i < FEATURES.length - 1 ? "border-b border-auth-border" : ""}`}>
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

      <div className="text-center text-auth-mutedDim text-xs pb-8">© 2026 QuizzLiveFR. Tous droits réservés.</div>
    </div>
  );
}
