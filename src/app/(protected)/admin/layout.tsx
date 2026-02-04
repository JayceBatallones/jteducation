import { redirect } from "next/navigation";
import { getProfileRole } from "@/lib/supabase/server";
import { Sidebar, adminLinks } from "@/components/layout/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, userId } = await getProfileRole();

  if (!userId) {
    redirect("/login");
  }

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex">
      <Sidebar links={adminLinks} />
      <div className="ml-64 flex-1 p-6">{children}</div>
    </div>
  );
}
