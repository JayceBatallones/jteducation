import { Sidebar, studentLinks } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar links={studentLinks} />
      <div className="ml-64 flex-1 p-6">{children}</div>
    </div>
  );
}
