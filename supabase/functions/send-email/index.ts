// Supabase Edge Function for sending emails via Resend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "JT Education <noreply@jaycetutoring.com>";

interface EmailPayload {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// Email templates
const templates: Record<string, (data: Record<string, unknown>) => string> = {
  booking_confirmation: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .cohort-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; color: white; font-weight: 500; }
        .button { display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Welcome to Your Cohort!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.studentName},</p>
          <p>You've been placed in:</p>
          <p>
            <span class="cohort-badge" style="background: ${data.cohortColor};">
              ${data.cohortName}
            </span>
          </p>
          <p><strong>Program:</strong> ${data.programName}</p>
          <p><strong>Schedule:</strong> ${data.schedule}</p>
          ${data.meetLink ? `<p><strong>Meet Link:</strong> <a href="${data.meetLink}">${data.meetLink}</a></p>` : ""}
          <a href="${data.dashboardUrl}" class="button">View Your Dashboard</a>
        </div>
        <div class="footer">
          <p>JT Education - Jayce Tutoring</p>
        </div>
      </div>
    </body>
    </html>
  `,

  event_reminder: (data) => `
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
          <p>Hi ${data.studentName},</p>
          <p>Your class is coming up ${data.timeUntil}:</p>
          <div class="event-card">
            <h3 style="margin: 0 0 8px 0;">${data.eventTitle}</h3>
            <p style="margin: 0; color: #64748b;">${data.eventDate} at ${data.eventTime}</p>
          </div>
          ${data.meetLink ? `<a href="${data.meetLink}" class="button">Join Meeting</a>` : ""}
          <a href="${data.notAttendingUrl}" class="button button-secondary">I Can't Attend</a>
        </div>
        <div class="footer">
          <p>JT Education - Jayce Tutoring</p>
        </div>
      </div>
    </body>
    </html>
  `,

  reschedule_update: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .status-approved { color: #16a34a; font-weight: 600; }
        .status-denied { color: #dc2626; font-weight: 600; }
        .button { display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Reschedule Request Update</h1>
        </div>
        <div class="content">
          <p>Hi ${data.studentName},</p>
          <p>Your reschedule request for <strong>${data.eventTitle}</strong> has been
            <span class="${data.status === 'approved' ? 'status-approved' : 'status-denied'}">${data.status}</span>.
          </p>
          ${data.adminNotes ? `<p><strong>Notes:</strong> ${data.adminNotes}</p>` : ""}
          <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
        </div>
        <div class="footer">
          <p>JT Education - Jayce Tutoring</p>
        </div>
      </div>
    </body>
    </html>
  `,

  payment_reminder: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Payment Required</h1>
        </div>
        <div class="content">
          <p>Hi ${data.parentName},</p>
          <div class="warning">
            <strong>Action Required:</strong> Your payment is pending.
            ${data.daysRemaining} days remaining before account deactivation.
          </div>
          <p>Please complete your payment to continue access to classes for ${data.studentName}.</p>
          <a href="${data.paymentUrl}" class="button">Complete Payment</a>
        </div>
        <div class="footer">
          <p>JT Education - Jayce Tutoring</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const payload: EmailPayload = await req.json();
    const { to, subject, template, data } = payload;

    // Get template
    const templateFn = templates[template];
    if (!templateFn) {
      throw new Error(`Unknown template: ${template}`);
    }

    const html = templateFn(data);

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
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
