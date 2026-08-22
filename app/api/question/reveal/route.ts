import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { question_id } = await req.json();
  if (!question_id) {
    return NextResponse.json({ error: "question_id requis." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data, error } = await db
    .from("questions")
    .update({ ends_at: new Date().toISOString(), paused_at: null })
    .eq("id", question_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
