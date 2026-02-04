import { Sidebar, studentLinks, parentLinks } from "@/components/layout/sidebar";
import { getProfile } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getProfile();

  // Parents see parent links, students see student links (currently identical)
  const links = profile?.role === "parent" ? parentLinks : studentLinks;

  return (
    <div className="flex">
      <Sidebar links={links} />
      <div className="ml-64 flex-1 p-6">{children}</div>
    </div>
  );
}
