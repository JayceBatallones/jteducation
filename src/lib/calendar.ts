// Google Calendar sync helpers

import { createClient } from "@/lib/supabase/server";

const CALENDAR_SYNC_URL = process.env.SUPABASE_URL + "/functions/v1/calendar-sync";

interface CalendarSyncResult {
  success: boolean;
  googleEventId?: string;
  meetLink?: string;
  error?: string;
}

export async function syncEventToCalendar(eventId: string): Promise<CalendarSyncResult> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(CALENDAR_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        action: "sync_event",
        eventId,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Calendar sync error:", error);
    return { success: false, error: "Failed to sync event" };
  }
}

export async function generateCohortMeetLink(cohortId: string): Promise<CalendarSyncResult> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(CALENDAR_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        action: "generate_meet_link",
        cohortId,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Meet link generation error:", error);
    return { success: false, error: "Failed to generate Meet link" };
  }
}

export async function reconcileCalendarEvents(): Promise<{ success: boolean; reconciled?: string[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(CALENDAR_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        action: "reconcile",
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Calendar reconciliation error:", error);
    return { success: false, error: "Failed to reconcile events" };
  }
}
