import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile();

  // Check if user needs onboarding (not yet a customer)
  if (!profile || profile.status !== "customer") {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
