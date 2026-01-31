// Supabase Edge Function for Google Calendar Sync
// Handles event creation/update and Meet link generation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  cohort_id?: string;
  event_type: string;
  google_event_id?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Get access token using service account
async function getAccessToken(): Promise<string> {
  const serviceAccountKey = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") || "{}");

  if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
    throw new Error("Invalid service account configuration");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Create JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const claimB64 = btoa(JSON.stringify(claim));
  const unsignedToken = `${headerB64}.${claimB64}`;

  // Sign with private key
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccountKey.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData: GoogleTokenResponse = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Create or update Google Calendar event
async function syncEventToCalendar(
  accessToken: string,
  event: CalendarEvent,
  attendeeEmails: string[],
  stableMeetLink?: string
): Promise<{ googleEventId: string; meetLink?: string }> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";

  const eventBody: Record<string, unknown> = {
    summary: event.title,
    start: {
      dateTime: event.start_time,
      timeZone: "Australia/Melbourne",
    },
    end: {
      dateTime: event.end_time,
      timeZone: "Australia/Melbourne",
    },
    attendees: attendeeEmails.map((email) => ({ email })),
  };

  // Add conferencing for consults (generate new link) or use stable link for cohort events
  if (event.event_type === "consult") {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `consult-${event.id}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  } else if (stableMeetLink) {
    // For cohort events, add the stable meet link in description
    eventBody.description = `Join: ${stableMeetLink}`;
  }

  const url = event.google_event_id
    ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.google_event_id}?conferenceDataVersion=1`
    : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`;

  const response = await fetch(url, {
    method: event.google_event_id ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${error}`);
  }

  const result = await response.json();
  return {
    googleEventId: result.id,
    meetLink: result.conferenceData?.entryPoints?.[0]?.uri,
  };
}

// Generate stable Meet link for cohort
async function generateMeetLink(accessToken: string, cohortName: string): Promise<string> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";

  // Create a temporary event to generate a Meet link
  const now = new Date();
  const eventBody = {
    summary: `${cohortName} - Stable Meeting`,
    start: {
      dateTime: now.toISOString(),
      timeZone: "Australia/Melbourne",
    },
    end: {
      dateTime: new Date(now.getTime() + 3600000).toISOString(),
      timeZone: "Australia/Melbourne",
    },
    conferenceData: {
      createRequest: {
        requestId: `cohort-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to generate Meet link");
  }

  const result = await response.json();
  const meetLink = result.conferenceData?.entryPoints?.[0]?.uri;

  // Delete the temporary event
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${result.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return meetLink;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, eventId, cohortId } = await req.json();

    const accessToken = await getAccessToken();

    if (action === "sync_event") {
      // Get event details
      const { data: event, error: eventError } = await supabaseClient
        .from("events")
        .select(`
          *,
          cohorts (
            id,
            name,
            stable_meet_link
          )
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        throw new Error("Event not found");
      }

      // Get attendee emails
      const { data: bookings } = await supabaseClient
        .from("event_bookings")
        .select("profiles:user_id (email)")
        .eq("event_id", eventId);

      const attendeeEmails = (bookings || [])
        .map((b) => {
          const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
          return profile?.email;
        })
        .filter(Boolean);

      const cohort = Array.isArray(event.cohorts) ? event.cohorts[0] : event.cohorts;
      const { googleEventId, meetLink } = await syncEventToCalendar(
        accessToken,
        event,
        attendeeEmails,
        cohort?.stable_meet_link
      );

      // Update event with google_event_id
      await supabaseClient
        .from("events")
        .update({ google_event_id: googleEventId })
        .eq("id", eventId);

      return new Response(
        JSON.stringify({ success: true, googleEventId, meetLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_meet_link") {
      // Get cohort
      const { data: cohort, error: cohortError } = await supabaseClient
        .from("cohorts")
        .select("name")
        .eq("id", cohortId)
        .single();

      if (cohortError || !cohort) {
        throw new Error("Cohort not found");
      }

      const meetLink = await generateMeetLink(accessToken, cohort.name);

      // Update cohort with stable meet link
      await supabaseClient
        .from("cohorts")
        .update({ stable_meet_link: meetLink })
        .eq("id", cohortId);

      return new Response(
        JSON.stringify({ success: true, meetLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reconcile") {
      // Reconcile all events with google_event_id
      const { data: events } = await supabaseClient
        .from("events")
        .select("*")
        .not("google_event_id", "is", null)
        .gte("start_time", new Date().toISOString());

      const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";
      const reconciled: string[] = [];

      for (const event of events || []) {
        try {
          // Check if event exists in Google Calendar
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.google_event_id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!response.ok) {
            // Event missing in Google, recreate it
            const { data: bookings } = await supabaseClient
              .from("event_bookings")
              .select("profiles:user_id (email)")
              .eq("event_id", event.id);

            const attendeeEmails = (bookings || [])
              .map((b) => {
                const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                return profile?.email;
              })
              .filter(Boolean);

            // Clear the old google_event_id and resync
            await supabaseClient
              .from("events")
              .update({ google_event_id: null })
              .eq("id", event.id);

            const { googleEventId } = await syncEventToCalendar(
              accessToken,
              { ...event, google_event_id: undefined },
              attendeeEmails
            );

            await supabaseClient
              .from("events")
              .update({ google_event_id: googleEventId })
              .eq("id", event.id);

            reconciled.push(event.id);
          }
        } catch (err) {
          console.error(`Error reconciling event ${event.id}:`, err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, reconciled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
