"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/useAuth";

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.length > 0) return name.charAt(0).toUpperCase();
  if (email && email.length > 0) return email.charAt(0).toUpperCase();
  return "U";
};

export default function ProfilePage() {
  const { user, isAuthenticated, loading, refreshSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/sign-in");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!user && isAuthenticated) {
      void refreshSession();
    }
  }, [isAuthenticated, refreshSession, user]);

  if (loading || (!isAuthenticated && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <p className="text-sm text-text-muted">Loading your profile...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-page px-4 py-10 text-text-main sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-muted">
              My account
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Profile</h1>
            <p className="text-text-muted">
              Basic information from your Better Auth session.
            </p>
          </div>
          <Link href="/barber-shop">
            <Button className="bg-brand text-white hover:bg-brand-hover">
              Back to booking
            </Button>
          </Link>
        </div>

        <Card className="border-surface-border bg-surface shadow-card">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16 border border-surface-border">
              <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
              <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl font-semibold">
                {user?.name || user?.email || "Unnamed user"}
              </CardTitle>
              <p className="text-sm text-text-muted">
                {user?.email ? `Email: ${user.email}` : "Email not provided"}
              </p>
              {user?.phoneNumber && (
                <p className="text-sm text-text-muted">Phone: {user.phoneNumber}</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-surface-border bg-page px-4 py-3">
              <p className="text-sm font-semibold text-text-main">
                Profile data placeholder
              </p>
              <p className="text-sm text-text-muted">
                We will hydrate this area with CustomerProfile data from the API. For now, your
                session data is shown above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
