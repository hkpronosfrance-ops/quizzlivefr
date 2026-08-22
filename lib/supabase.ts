import { createClient } from "@supabase/supabase-js";

// Client-side: read-only for data, but also used for Supabase Auth
// (email/password sign-in for the admin panel).
// `remember` controls session persistence: localStorage survives browser
// restarts, sessionStorage clears when the tab closes.
export function supabaseBrowser(remember: boolean = true) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storage: typeof window !== "undefined" ? (remember ? window.localStorage : window.sessionStorage) : undefined,
      },
    }
  );
}

// Server-side only: full write access. NEVER import this from a "use client"
// component — it must only run inside app/api/** route handlers.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type Question = {
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
  ends_at: string;
  status: "active" | "closed";
};

export type LeaderboardRow = {
  session_id: string;
  tiktok_user: string;
  total_points: number;
  correct_answers: number;
  total_answers: number;
};

export type AnswerRow = {
  id: string;
  question_id: string;
  tiktok_user: string;
  choice: "a" | "b" | "c" | "d";
  is_correct: boolean;
  points_earned: number;
};
