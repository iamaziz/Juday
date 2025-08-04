"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DailySheetEditor from "./DailySheetEditor";
import { format } from "date-fns";

interface SheetItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function DailyJournal() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dailySheet, setDailySheet] = useState<SheetItem | null>(null);

  // Function to fetch or create today's sheet
  const fetchOrCreateDailySheet = useCallback(async (userId: string) => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    // Try to fetch today's sheet
    const { data: existingSheet, error: fetchError } = await supabase
      .from("sheets")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", userId)
      .eq("title", today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      toast.error(`Failed to load daily sheet: ${fetchError.message}`);
      setDailySheet(null);
      setLoading(false);
      return;
    }

    if (existingSheet) {
      setDailySheet(existingSheet);
    } else {
      // If no sheet exists for today, create one
      const { data: newSheet, error: createError } = await supabase
        .from("sheets")
        .insert({ user_id: userId, title: today, content: "" })
        .select()
        .single();

      if (createError) {
        // If creation fails due to unique constraint (e.g., another tab created it), try fetching again
        if (createError.code === '23505') { // PostgreSQL unique violation error code
          const { data: reFetchedSheet, error: reFetchError } = await supabase
            .from("sheets")
            .select("id, title, content, created_at, updated_at")
            .eq("user_id", userId)
            .eq("title", today)
            .single();

          if (reFetchError) {
            toast.error(`Failed to retrieve daily sheet after concurrent creation: ${reFetchError.message}`);
            setDailySheet(null);
          } else {
            setDailySheet(reFetchedSheet);
            toast.success(`Daily sheet retrieved after concurrent creation!`);
          }
        } else {
          toast.error(`Failed to create daily sheet: ${createError.message}`);
          setDailySheet(null);
        }
      } else {
        toast.success(`New daily sheet created for ${today}!`);
        setDailySheet(newSheet);
      }
    }
    setLoading(false);
  }, [supabase]);

  // Effect 1: Handle initial user load and auth state changes
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      const { data: { user: initialUser } } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(initialUser);
        if (!initialUser) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Effect 2: Fetch or create daily sheet whenever the `user` state changes
  useEffect(() => {
    if (user) {
      fetchOrCreateDailySheet(user.id);
    } else {
      setDailySheet(null);
      setLoading(false);
    }
  }, [user, fetchOrCreateDailySheet]);

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
      setDailySheet(null);
    }
    setLoading(false);
  };

  const handleContentSave = useCallback(async (newContent: string) => {
    if (!dailySheet) return;
    const { error } = await supabase
      .from("sheets")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", dailySheet.id);

    if (error) {
      toast.error(`Failed to auto-save: ${error.message}`);
    } else {
      // Optionally, show a subtle success or update a status indicator
      // toast.success("Content auto-saved!", { duration: 1000 });
    }
  }, [dailySheet, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-background">
        <h1 className="text-xl font-semibold">Daily Journal</h1>
        {user ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.email}</span>
            <Button onClick={handleSignOut} disabled={loading} size="sm">
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-48"
            />
            <Button onClick={handleSignIn} disabled={loading || !email} size="sm">
              Sign In
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {user ? (
          dailySheet ? (
            <DailySheetEditor
              sheetId={dailySheet.id} // Pass the sheet ID for realtime updates
              initialContent={dailySheet.content}
              onContentChange={handleContentSave}
            />
          ) : (
            <p className="text-muted-foreground">No daily sheet available. Please try again or contact support.</p>
          )
        ) : (
          <p className="text-muted-foreground">Sign in to start your daily journal.</p>
        )}
      </main>
    </div>
  );
}