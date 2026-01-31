import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">JT Education</h1>
      <p className="text-muted-foreground mb-8">JMSS Tutoring Platform</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
