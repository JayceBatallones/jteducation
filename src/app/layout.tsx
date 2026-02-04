import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { getProfile } from "@/lib/supabase/server";
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
  const { profile } = await getProfile();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Header user={profile} />
        <main className="pt-14">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
