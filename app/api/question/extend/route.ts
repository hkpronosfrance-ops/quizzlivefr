import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { question_id, seconds } = await req.json();
  if (!question_id || !seconds) {
    return NextResponse.json({ error: "question_id et seconds requis." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: question, error: fetchError } = await db
    .from("questions")
    .select("ends_at, status")
    .eq("id", question_id)
    .single();

  if (fetchError || !question) {
    return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
  }

  const newEndsAt = new Date(new Date(question.ends_at).getTime() + seconds * 1000);

  const { data, error } = await db
    .from("questions")
    .update({ ends_at: newEndsAt.toISOString() })
    .eq("id", question_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
