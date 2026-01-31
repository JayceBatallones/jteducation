import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, adminLinks } from "@/components/layout/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex">
      <Sidebar links={adminLinks} />
      <div className="ml-64 flex-1 p-6">{children}</div>
    </div>
  );
}
