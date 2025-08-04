"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import LiveMarkdownEditor from "./LiveMarkdownEditor";
import { format, isSameDay, parseISO } from "date-fns";
import DateTimeDisplay from "./DateTimeDisplay";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import HistoricalSheetItem from "./HistoricalSheetItem";
import { useUserActivity } from "@/hooks/use-user-activity";
import { ThemeSwitcher } from "./theme-switcher";

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
  const [currentDaySheet, setCurrentDaySheet] = useState<SheetItem | null>(null);
  const [loadedHistoricalSheets, setLoadedHistoricalSheets] = useState<SheetItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [earliestLoadedDate, setEarliestLoadedDate] = useState<Date | null>(null);
  const [hasMoreSheets, setHasMoreSheets] = useState(true);
  
  const isUserActive = useUserActivity();
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  });

  const SHEETS_PER_LOAD = 5;

  // Function to fetch or create a sheet for a given date (for the current day)
  const fetchOrCreateCurrentSheet = useCallback(async (userId: string, date: Date) => {
    setLoading(true);
    const formattedDate = format(date, "yyyy-MM-dd");

    const { data: existingSheet, error: fetchError } = await supabase
      .from("sheets")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", userId)
      .eq("title", formattedDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      toast.error(`Failed to load current sheet: ${fetchError.message}`);
      setCurrentDaySheet(null);
      setLoading(false);
      return;
    }

    if (existingSheet) {
      setCurrentDaySheet(existingSheet);
    } else {
      if (isSameDay(date, new Date()) || date > new Date()) {
        const { data: newSheet, error: createError } = await supabase
          .from("sheets")
          .insert({ user_id: userId, title: formattedDate, content: "" })
          .select()
          .single();

        if (createError) {
          if (createError.code === '23505') {
            const { data: reFetchedSheet, error: reFetchError } = await supabase
              .from("sheets")
              .select("id, title, content, created_at, updated_at")
              .eq("user_id", userId)
              .eq("title", formattedDate)
              .single();

            if (reFetchError) {
              toast.error(`Failed to retrieve sheet after concurrent creation: ${reFetchError.message}`);
              setCurrentDaySheet(null);
            } else {
              setCurrentDaySheet(reFetchedSheet);
              toast.success(`Sheet retrieved after concurrent creation!`);
            }
          } else {
            toast.error(`Failed to create sheet: ${createError.message}`);
            setCurrentDaySheet(null);
          }
        } else {
          toast.success(`New sheet created for ${formattedDate}!`);
          setCurrentDaySheet(newSheet);
        }
      } else {
        setCurrentDaySheet(null);
        toast.info(`No sheet found for ${formattedDate}.`);
      }
    }
    setLoading(false);
  }, [supabase]);

  // Function to fetch historical sheets
  const fetchHistoricalSheets = useCallback(async (userId: string, beforeDate: Date, limit: number) => {
    setLoading(true);
    const formattedBeforeDate = format(beforeDate, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("sheets")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", userId)
      .lt("title", formattedBeforeDate) // Fetch sheets with titles *before* the given date
      .order("title", { ascending: false })
      .limit(limit);

    if (error) {
      toast.error(`Failed to load historical sheets: ${error.message}`);
      setLoading(false);
      return;
    }

    if (data.length > 0) {
      setLoadedHistoricalSheets(prev => {
        const newSheets = data.filter(
          (newSheet) => !prev.some((existingSheet) => existingSheet.id === newSheet.id)
        );
        return [...prev, ...newSheets];
      });
      setEarliestLoadedDate(parseISO(data[data.length - 1].title));
      setHasMoreSheets(data.length === limit);
    } else {
      setHasMoreSheets(false);
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

  // Effect 2: Fetch current day sheet and initial historical sheets whenever `user` or `selectedDate` changes
  useEffect(() => {
    if (user && selectedDate) {
      setCurrentDaySheet(null);
      setLoadedHistoricalSheets([]);
      setEarliestLoadedDate(null);
      setHasMoreSheets(true);

      fetchOrCreateCurrentSheet(user.id, selectedDate);
      // Fix: Pass selectedDate directly to fetch historical sheets to include the day before selectedDate
      fetchHistoricalSheets(user.id, selectedDate, SHEETS_PER_LOAD);
    } else if (!user) {
      setCurrentDaySheet(null);
      setLoadedHistoricalSheets([]);
      setLoading(false);
    }
  }, [user, selectedDate, fetchOrCreateCurrentSheet, fetchHistoricalSheets]);

  // Effect 3: Infinite scroll trigger
  useEffect(() => {
    if (inView && hasMoreSheets && !loading && user && earliestLoadedDate) {
      fetchHistoricalSheets(user.id, earliestLoadedDate, SHEETS_PER_LOAD);
    }
  }, [inView, hasMoreSheets, loading, user, earliestLoadedDate, fetchHistoricalSheets]);


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
      setCurrentDaySheet(null);
      setLoadedHistoricalSheets([]);
      setSelectedDate(new Date());
    }
    setLoading(false);
  };

  const handleContentSave = useCallback(async (newContent: string) => {
    if (!currentDaySheet) return;
    const { error } = await supabase
      .from("sheets")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", currentDaySheet.id);

    if (error) {
      console.error("Failed to auto-save content:", error);
      toast.error(`Failed to auto-save: ${error.message}`);
    } else {
      // Optionally, show a subtle success or update a status indicator
      // toast.success("Content auto-saved!", { duration: 1000 });
    }
  }, [currentDaySheet, supabase]);

  // Determine if focus mode should be active
  // Focus mode is active if user is idle OR if the editor is focused
  const isFocusModeActive = !isUserActive || isEditorFocused;

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className={cn(
        "flex items-center justify-between px-4 py-4 bg-background transition-opacity duration-300",
        isFocusModeActive && "opacity-5 pointer-events-none" // Apply low opacity and disable pointer events when focus mode is active
      )}>
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
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 overflow-y-auto">
        {user ? (
          <>
            {currentDaySheet ? (
              <div className="w-full max-w-4xl flex-1">
                <LiveMarkdownEditor
                  sheetId={currentDaySheet.id}
                  initialContent={currentDaySheet.content}
                  onContentChange={handleContentSave}
                  onFocusChange={setIsEditorFocused}
                />
              </div>
            ) : (
              <p className="text-muted-foreground mb-8">No sheet available for this date. You can create one by typing if it's today or a future date.</p>
            )}

            {loadedHistoricalSheets.length > 0 && (
              <div className={cn(
                "w-full max-w-4xl space-y-8 mt-8 transition-opacity duration-300",
                isFocusModeActive && "opacity-5 pointer-events-none"
              )}>
                {loadedHistoricalSheets.map((sheet) => (
                  <HistoricalSheetItem key={sheet.id} sheet={sheet} />
                ))}
              </div>
            )}

            {hasMoreSheets && user && (
              <div ref={ref} className={cn(
                "flex justify-center py-8 transition-opacity duration-300",
                isFocusModeActive && "opacity-5 pointer-events-none"
              )}>
                {loading ? (
                  <p className="text-muted-foreground">Loading more sheets...</p>
                ) : (
                  <Button
                    onClick={() => {
                      if (earliestLoadedDate) {
                        fetchHistoricalSheets(user.id, earliestLoadedDate, SHEETS_PER_LOAD);
                      }
                    }}
                    variant="outline"
                  >
                    Load More
                  </Button>
                )}
              </div>
            )}
            {!hasMoreSheets && loadedHistoricalSheets.length > 0 && (
              <p className={cn(
                "text-muted-foreground py-8 transition-opacity duration-300",
                isFocusModeActive && "opacity-5 pointer-events-none"
              )}>No more historical sheets.</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Sign in to start your daily journal.</p>
        )}
      </main>
    </div>
  );
}