import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Get programs for selection
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, description")
    .order("name");

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if they're already a customer (not pending)
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("id", user.id)
      .single();

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
        <OnboardingForm programs={programs || []} />
      </div>
    </div>
  );
}
