"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function SheetManager() {
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for the magic link!");
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out successfully!");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar for desktop */}
      {!isMobile && (
        <aside className="w-64 border-r bg-sidebar text-sidebar-foreground p-4 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-sidebar-primary">My Sheets</h2>
          {user ? (
            <>
              <p className="text-sm mb-2">Welcome, {user.email}</p>
              <Button onClick={handleSignOut} disabled={loading} className="mb-4">
                Sign Out
              </Button>
              <div className="flex-grow border-t border-sidebar-border pt-4">
                {/* Placeholder for sheet list */}
                <p className="text-muted-foreground">No sheets yet. Create one!</p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-sidebar-background text-sidebar-foreground border-sidebar-border focus:ring-sidebar-ring"
              />
              <Button onClick={handleSignIn} disabled={loading || !email}>
                Sign In with Magic Link
              </Button>
            </div>
          )}
        </aside>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col">
        {isMobile && (
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <h1 className="text-xl font-semibold">My Sheets</h1>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground p-4 flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-primary">My Sheets</SheetTitle>
                </SheetHeader>
                {user ? (
                  <>
                    <p className="text-sm mb-2">Welcome, {user.email}</p>
                    <Button onClick={handleSignOut} disabled={loading} className="mb-4">
                      Sign Out
                    </Button>
                    <div className="flex-grow border-t border-sidebar-border pt-4">
                      {/* Placeholder for mobile sheet list */}
                      <p className="text-muted-foreground">No sheets yet. Create one!</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-sidebar-background text-sidebar-foreground border-sidebar-border focus:ring-sidebar-ring"
                    />
                    <Button onClick={handleSignIn} disabled={loading || !email}>
                      Sign In with Magic Link
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </header>
        )}
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Select a sheet or create a new one to start editing.</p>
        </div>
      </main>
    </div>
  );
}