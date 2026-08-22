import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Starts a fresh session, or returns the currently active one if it exists.
export async function POST() {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("sessions")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ session: existing, reused: true });
  }

  const { data, error } = await db
    .from("sessions")
    .insert({ status: "active" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data, reused: false });
}

// Ends the currently active session.
export async function DELETE() {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("status", "active")
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ended: data });
}
