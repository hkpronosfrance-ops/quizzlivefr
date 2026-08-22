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
    .update({ paused_at: new Date().toISOString() })
    .eq("id", question_id)
    .is("paused_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
