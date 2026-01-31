import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JT Education - Tutoring Platform",
  description: "JMSS tutoring booking and scheduling platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <Header user={profile} />
        <main className="pt-14">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
