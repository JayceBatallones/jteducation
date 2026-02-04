import { createClient, createAdminClient, getUser, getProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

interface OnboardingData {
  parentName: string;
  parentEmail: string;
  parentPassword: string;
  parentPhone: string;
  studentName: string;
  studentEmail: string;
  studentPassword: string;
  programId: string;
  studentMotivation: string;
  teachingPreference: string;
  availability: boolean[][];
  timezone: string;
  consentContact: boolean;
  consentRecording: boolean;
  consentTerms: boolean;
}

async function submitOnboarding(data: OnboardingData): Promise<{ success: boolean; error?: string }> {
  "use server";

  try {
    const supabase = await createAdminClient();

    // Create parent account
    const { data: parentAuth, error: parentError } = await supabase.auth.admin.createUser({
      email: data.parentEmail,
      password: data.parentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.parentName,
        role: "parent",
        timezone: data.timezone,
        phone: data.parentPhone,
      },
    });

    if (parentError) {
      return { success: false, error: `Parent registration failed: ${parentError.message}` };
    }

    // Update parent profile
    await supabase
      .from("profiles")
      .update({
        full_name: data.parentName,
        timezone: data.timezone,
        phone: data.parentPhone,
        role: "parent",
        status: "pending_customer",
      })
      .eq("id", parentAuth.user.id);

    // Create student account
    const { data: studentAuth, error: studentError } = await supabase.auth.admin.createUser({
      email: data.studentEmail,
      password: data.studentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.studentName,
        role: "student",
        timezone: data.timezone,
      },
    });

    if (studentError) {
      return { success: false, error: `Student registration failed: ${studentError.message}` };
    }

    // Update student profile
    await supabase
      .from("profiles")
      .update({
        full_name: data.studentName,
        timezone: data.timezone,
        role: "student",
        status: "pending_customer",
      })
      .eq("id", studentAuth.user.id);

    // Link parent to student
    const { error: linkError } = await supabase
      .from("parent_student_links")
      .insert({
        parent_id: parentAuth.user.id,
        student_id: studentAuth.user.id,
      });

    if (linkError) {
      console.error("Failed to link parent to student:", linkError);
      // Don't fail the whole registration, admin can fix this
    }

    // Store student availability
    const { error: availError } = await supabase
      .from("user_availability")
      .upsert({
        user_id: studentAuth.user.id,
        weekly_grid: data.availability,
        date_overrides: {},
      });

    if (availError) {
      console.error("Failed to store availability:", availError);
    }

    // Store program preference and other info in a pending_registrations or notes field
    // For now, we'll use the profiles table's metadata or a separate table
    // TODO: Store program preference, motivation, teaching preference for admin review

    return { success: true };
  } catch (err) {
    console.error("Onboarding error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Registration failed" };
  }
}

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Get programs for selection
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, description")
    .order("name");

  // Check if user is already logged in
  const { user } = await getUser();

  if (user) {
    // Check if they're already a customer (not pending)
    const { profile } = await getProfile();

    if (profile?.status === "customer") {
      // Already onboarded, redirect to dashboard
      if (profile.role === "admin") redirect("/admin");
      if (profile.role === "tutor") redirect("/tutor");
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome to JT Education</h1>
          <p className="text-muted-foreground mt-2">
            Complete your registration to get started with JMSS tutoring
          </p>
        </div>
        <OnboardingForm programs={programs || []} onSubmit={submitOnboarding} />
      </div>
    </div>
  );
}
