import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail } from "lucide-react";

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Registration Submitted!</CardTitle>
          <CardDescription>
            Thank you for registering with JT Education
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent confirmation emails to both parent and student addresses.
                Click the links to verify your accounts.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>What happens next?</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Confirm both email addresses</li>
              <li>Our team will review your application</li>
              <li>You&apos;ll be matched with a suitable cohort</li>
              <li>You&apos;ll receive payment instructions</li>
              <li>Once payment is confirmed, classes begin!</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button className="w-full">
                Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
