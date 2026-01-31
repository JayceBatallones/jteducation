import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  const supabase = await createClient();

  // Find the token
  const { data: tokenData, error: tokenError } = await supabase
    .from("not_attending_tokens")
    .select("id, user_id, event_id, expires_at")
    .eq("id", token)
    .single();

  if (tokenError || !tokenData) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  // Check if token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/login?error=token_expired", request.url));
  }

  // Update attendance to not_attending
  const { error: attendanceError } = await supabase
    .from("attendance")
    .upsert({
      user_id: tokenData.user_id,
      event_id: tokenData.event_id,
      status: "not_attending",
      marked_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,event_id",
    });

  if (attendanceError) {
    console.error("Failed to update attendance:", attendanceError);
    return NextResponse.redirect(new URL("/login?error=update_failed", request.url));
  }

  // Delete the used token
  await supabase
    .from("not_attending_tokens")
    .delete()
    .eq("id", token);

  // Redirect to success page
  return NextResponse.redirect(new URL("/not-attending-confirmed", request.url));
}
