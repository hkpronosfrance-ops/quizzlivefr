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

// Ends the currently active session and closes any question still active in it.
export async function DELETE() {
  const db = supabaseAdmin();
  const endedAt = new Date().toISOString();

  const { data: activeSessions, error: lookupError } = await db
    .from("sessions")
    .select("id")
    .eq("status", "active");

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const sessionIds = (activeSessions ?? []).map((session) => session.id);

  if (sessionIds.length > 0) {
    const { error: questionError } = await db
      .from("questions")
      .update({ status: "closed", ends_at: endedAt, paused_at: null })
      .in("session_id", sessionIds)
      .eq("status", "active");

    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 500 });
    }
  }

  const { data, error } = await db
    .from("sessions")
    .update({ status: "ended", ended_at: endedAt })
    .eq("status", "active")
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ended: data });
}
