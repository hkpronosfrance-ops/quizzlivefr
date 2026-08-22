import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DURATION_SECONDS = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const { session_id, text, choice_a, choice_b, choice_c, choice_d, correct_choice } = body;

  if (!session_id || !text || !choice_a || !choice_b || !correct_choice) {
    return NextResponse.json(
      { error: "Champs requis manquants (session_id, text, choice_a, choice_b, correct_choice)." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Close any question still active in this session before opening a new one.
  await db
    .from("questions")
    .update({ status: "closed" })
    .eq("session_id", session_id)
    .eq("status", "active");

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + DURATION_SECONDS * 1000);

  const { data, error } = await db
    .from("questions")
    .insert({
      session_id,
      text,
      choice_a,
      choice_b,
      choice_c,
      choice_d: choice_d || null,
      correct_choice,
      duration_seconds: DURATION_SECONDS,
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
