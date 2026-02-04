import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUser();

  // If user is already logged in, redirect them away from auth pages
  if (user) {
    const { profile } = await getProfile();

    // Check if they need onboarding
    if (profile?.status !== "customer") {
      redirect("/onboarding");
    }

    // Redirect based on role
    if (profile?.role === "admin") redirect("/admin");
    if (profile?.role === "tutor") redirect("/tutor");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-muted/50">
      {children}
    </div>
  );
}
