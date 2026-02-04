import { redirect } from "next/navigation";
import { getProfileRole } from "@/lib/supabase/server";
import { Sidebar, tutorLinks } from "@/components/layout/sidebar";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, userId } = await getProfileRole();

  if (!userId) {
    redirect("/login");
  }

  if (role !== "tutor" && role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex">
      <Sidebar links={tutorLinks} />
      <div className="ml-64 flex-1 p-6">{children}</div>
    </div>
  );
}
