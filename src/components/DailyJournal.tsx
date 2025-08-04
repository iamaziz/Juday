"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DailySheetEditor from "./DailySheetEditor";
import { format, isSameDay, parseISO } from "date-fns";
import DateTimeDisplay from "./DateTimeDisplay";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Function to fetch or create a sheet for a given date
  const fetchOrCreateSheetForDate = useCallback(async (userId: string, date: Date) => {
    setLoading(true);
    const formattedDate = format(date, "yyyy-MM-dd");

    // Try to fetch the sheet for the given date
    const { data: existingSheet, error: fetchError } = await supabase
      .from("sheets")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", userId)
      .eq("title", formattedDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      toast.error(`Failed to load sheet: ${fetchError.message}`);
      setDailySheet(null);
      setLoading(false);
      return;
    }

    if (existingSheet) {
      setDailySheet(existingSheet);
    } else {
      // If no sheet exists for this date, create one (only if it's today or a future date)
      if (isSameDay(date, new Date()) || date > new Date()) {
        const { data: newSheet, error: createError } = await supabase
          .from("sheets")
          .insert({ user_id: userId, title: formattedDate, content: "" })
          .select()
          .single();

        if (createError) {
          if (createError.code === '23505') { // PostgreSQL unique violation error code
            const { data: reFetchedSheet, error: reFetchError } = await supabase
              .from("sheets")
              .select("id, title, content, created_at, updated_at")
              .eq("user_id", userId)
              .eq("title", formattedDate)
              .single();

            if (reFetchError) {
              toast.error(`Failed to retrieve sheet after concurrent creation: ${reFetchError.message}`);
              setDailySheet(null);
            } else {
              setDailySheet(reFetchedSheet);
              toast.success(`Sheet retrieved after concurrent creation!`);
            }
          } else {
            toast.error(`Failed to create sheet: ${createError.message}`);
            setDailySheet(null);
          }
        } else {
          toast.success(`New sheet created for ${formattedDate}!`);
          setDailySheet(newSheet);
        }
      } else {
        // If it's a past date and no sheet exists, just set dailySheet to null
        setDailySheet(null);
        toast.info(`No sheet found for ${formattedDate}.`);
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

  // Effect 2: Fetch or create daily sheet whenever the `user` state or `selectedDate` changes
  useEffect(() => {
    if (user && selectedDate) {
      fetchOrCreateSheetForDate(user.id, selectedDate);
    } else if (!user) {
      setDailySheet(null);
      setLoading(false);
    }
  }, [user, selectedDate, fetchOrCreateSheetForDate]);

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
      setSelectedDate(new Date()); // Reset to today after sign out
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
      console.error("Failed to auto-save content:", error);
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
      <header className="flex items-center justify-between px-4 py-4 bg-background">
        <h1 className="text-4xl font-semibold relative inline-flex items-baseline">
          Today
          <DateTimeDisplay />
        </h1>
        <div className="flex items-center space-x-2">
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.email}</span>
              <Button onClick={handleSignOut} disabled={loading} size="sm" className="h-8 px-3 text-sm">
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-48 h-8 text-sm"
              />
              <Button onClick={handleSignIn} disabled={loading || !email} size="sm" className="h-8 px-3 text-sm">
                Sign In
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {user ? (
          dailySheet ? (
            <DailySheetEditor
              sheetId={dailySheet.id}
              initialContent={dailySheet.content}
              onContentChange={handleContentSave}
            />
          ) : (
            <p className="text-muted-foreground">No sheet available for this date. You can create one by typing if it's today or a future date.</p>
          )
        ) : (
          <p className="text-muted-foreground">Sign in to start your daily journal.</p>
        )}
      </main>
    </div>
  );
}