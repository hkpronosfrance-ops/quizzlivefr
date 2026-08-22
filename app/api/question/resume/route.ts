import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { question_id } = await req.json();
  if (!question_id) {
    return NextResponse.json({ error: "question_id requis." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: question, error: fetchError } = await db
    .from("questions")
    .select("ends_at, paused_at")
    .eq("id", question_id)
    .single();

  if (fetchError || !question || !question.paused_at) {
    return NextResponse.json({ error: "Question introuvable ou non en pause." }, { status: 404 });
  }

  const pausedDurationMs = Date.now() - new Date(question.paused_at).getTime();
  const newEndsAt = new Date(new Date(question.ends_at).getTime() + pausedDurationMs);

  const { data, error } = await db
    .from("questions")
    .update({ ends_at: newEndsAt.toISOString(), paused_at: null })
    .eq("id", question_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
