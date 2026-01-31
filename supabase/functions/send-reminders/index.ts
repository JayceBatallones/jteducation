// Supabase Edge Function for sending event reminders
// Triggered by pg_cron to send 24h and 1h reminders

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "JT Education <noreply@jaycetutoring.com>";
const APP_URL = Deno.env.get("APP_URL") || "https://app.jaycetutoring.com";

interface EventBooking {
  user_id: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    start_time: string;
    cohorts?: { stable_meet_link: string | null } | { stable_meet_link: string | null }[] | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

async function sendReminderEmail(
  to: string,
  studentName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  timeUntil: string,
  meetLink?: string,
  notAttendingUrl?: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .event-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px; margin-right: 8px; }
        .button-secondary { background: #64748b; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Class Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName},</p>
          <p>Your class is coming up ${timeUntil}:</p>
          <div class="event-card">
            <h3 style="margin: 0 0 8px 0;">${eventTitle}</h3>
            <p style="margin: 0; color: #64748b;">${eventDate} at ${eventTime}</p>
          </div>
          ${meetLink ? `<a href="${meetLink}" class="button">Join Meeting</a>` : ""}
          ${notAttendingUrl ? `<a href="${notAttendingUrl}" class="button button-secondary">I Can't Attend</a>` : ""}
        </div>
        <div class="footer">
          <p>JT Education - Jayce Tutoring</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reminder: ${eventTitle}`,
      html,
    }),
  });

  return response.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type } = await req.json();

    const now = new Date();
    let startTime: Date;
    let endTime: Date;
    let timeUntil: string;

    if (type === "24h") {
      // Events starting in 23-25 hours
      startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      timeUntil = "in 24 hours";
    } else if (type === "1h") {
      // Events starting in 50-70 minutes
      startTime = new Date(now.getTime() + 50 * 60 * 1000);
      endTime = new Date(now.getTime() + 70 * 60 * 1000);
      timeUntil = "in 1 hour";
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid type. Use '24h' or '1h'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get upcoming events with bookings
    const { data: bookings, error } = await supabaseClient
      .from("event_bookings")
      .select(`
        user_id,
        event_id,
        events!inner (
          id,
          title,
          start_time,
          cohorts (stable_meet_link)
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .gte("events.start_time", startTime.toISOString())
      .lt("events.start_time", endTime.toISOString());

    if (error) {
      throw error;
    }

    const sentCount = { success: 0, failed: 0 };

    for (const booking of bookings as unknown as EventBooking[]) {
      const event = Array.isArray(booking.events) ? booking.events[0] : booking.events;
      const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;

      if (!event || !profile?.email) continue;

      const cohort = event.cohorts
        ? Array.isArray(event.cohorts) ? event.cohorts[0] : event.cohorts
        : null;
      const meetLink = cohort?.stable_meet_link;

      // Generate not-attending token
      const { data: token } = await supabaseClient
        .from("not_attending_tokens")
        .insert({
          user_id: profile.id,
          event_id: event.id,
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      const notAttendingUrl = token ? `${APP_URL}/api/not-attending?token=${token.id}` : undefined;

      const eventDate = new Date(event.start_time).toLocaleDateString("en-AU", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const eventTime = new Date(event.start_time).toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      });

      const success = await sendReminderEmail(
        profile.email,
        profile.full_name || "Student",
        event.title,
        eventDate,
        eventTime,
        timeUntil,
        meetLink,
        notAttendingUrl
      );

      if (success) {
        sentCount.success++;
      } else {
        sentCount.failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        sent: sentCount.success,
        failed: sentCount.failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
