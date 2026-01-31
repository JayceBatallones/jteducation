// Token generation helpers

import { createClient } from "@/lib/supabase/server";

export async function generateNotAttendingToken(
  userId: string,
  eventId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Token expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("not_attending_tokens")
    .insert({
      user_id: userId,
      event_id: eventId,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create not-attending token:", error);
    return null;
  }

  return data.id;
}

export async function cleanupExpiredTokens(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("not_attending_tokens")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Failed to cleanup expired tokens:", error);
    return 0;
  }

  return data?.length || 0;
}
