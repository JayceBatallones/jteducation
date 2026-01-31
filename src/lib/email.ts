// Email sending helpers

const SEND_EMAIL_URL = process.env.SUPABASE_URL + "/functions/v1/send-email";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

async function sendEmail(
  to: string | string[],
  subject: string,
  template: string,
  data: Record<string, unknown>
): Promise<SendEmailResult> {
  try {
    const response = await fetch(SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ to, subject, template, data }),
    });

    return await response.json();
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendBookingConfirmation(
  email: string,
  studentName: string,
  cohortName: string,
  cohortColor: string,
  programName: string,
  schedule: string,
  meetLink?: string
): Promise<SendEmailResult> {
  return sendEmail(email, `Welcome to ${cohortName}!`, "booking_confirmation", {
    studentName,
    cohortName,
    cohortColor,
    programName,
    schedule,
    meetLink,
    dashboardUrl: `${APP_URL}/dashboard`,
  });
}

export async function sendEventReminder(
  email: string,
  studentName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  timeUntil: string,
  meetLink?: string,
  notAttendingToken?: string
): Promise<SendEmailResult> {
  return sendEmail(email, `Reminder: ${eventTitle}`, "event_reminder", {
    studentName,
    eventTitle,
    eventDate,
    eventTime,
    timeUntil,
    meetLink,
    notAttendingUrl: notAttendingToken
      ? `${APP_URL}/api/not-attending?token=${notAttendingToken}`
      : undefined,
  });
}

export async function sendRescheduleUpdate(
  email: string,
  studentName: string,
  eventTitle: string,
  status: "approved" | "denied",
  adminNotes?: string
): Promise<SendEmailResult> {
  return sendEmail(
    email,
    `Reschedule Request ${status === "approved" ? "Approved" : "Denied"}`,
    "reschedule_update",
    {
      studentName,
      eventTitle,
      status,
      adminNotes,
      dashboardUrl: `${APP_URL}/dashboard`,
    }
  );
}

export async function sendPaymentReminder(
  email: string,
  parentName: string,
  studentName: string,
  daysRemaining: number
): Promise<SendEmailResult> {
  return sendEmail(email, "Payment Required - Action Needed", "payment_reminder", {
    parentName,
    studentName,
    daysRemaining,
    paymentUrl: `${APP_URL}/onboarding`,
  });
}
