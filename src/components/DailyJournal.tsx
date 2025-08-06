"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import LiveMarkdownEditor from "./LiveMarkdownEditor";
import { format, isSameDay, parseISO } from "date-fns";
import DateTimeDisplay from "./DateTimeDisplay";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Github, Download, Upload, Menu, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import HistoricalSheetItem from "./HistoricalSheetItem";
import { useUserActivity } from "@/hooks/use-user-activity";
import { ThemeSwitcher } from "./theme-switcher";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportAllData, importAllData } from "@/app/actions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isUserActive = useUserActivity();
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const isMobile = useIsMobile();
  const { setTheme } = useTheme();

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

  const handleGitHubSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // On success, the page will redirect, so no need to set loading to false.
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

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("Preparing your data for download...");

    const result = await exportAllData();

    if (result.error) {
      toast.error(result.error);
      setIsExporting(false);
      return;
    }

    if (result.success && result.content && result.filename) {
      const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", result.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded!");
    } else {
      toast.error("An unexpected error occurred during export.");
    }

    setIsExporting(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.info("Starting data import...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const result = await importAllData(content);

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        const { importedCount = 0, skippedCount = 0 } = result;
        toast.success(`Import complete!`, {
          description: `${importedCount} new entries added. ${skippedCount} existing entries skipped. Page will now reload.`,
          duration: 5000,
        });
        // Reload the page to reflect the changes
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        toast.error("An unexpected error occurred during import.");
      }
      setIsImporting(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read the selected file.");
      setIsImporting(false);
    };
    reader.readAsText(file);

    // Reset the file input value to allow re-uploading the same file
    event.target.value = '';
  };

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
    <TooltipProvider>
      <div className="flex flex-col">
        <header className={cn(
          "sticky top-0 z-10 flex items-start justify-between px-4 py-4 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          isFocusModeActive && "opacity-5 pointer-events-none"
        )}>
          <div>
            <h1 className="text-4xl font-semibold relative">
              Juday
              <DateTimeDisplay />
            </h1>
            <div style={{ position: "fixed", top: 16, left: 16, zIndex: 50 }}>
              <Image src="/Juday-logo.png" alt="Juday Logo" width={130} height={130} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-auto md:w-[180px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      <>
                        <span className="hidden md:inline">{format(selectedDate, "PPP")}</span>
                        <span className="md:hidden">{format(selectedDate, "MMM d, yyyy")}</span>
                      </>
                    ) : <span>Pick a date</span>}
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

            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user && (
                    <>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent justify-center">
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleImportClick} disabled={isImporting || isExporting}>
                        <Upload className="mr-2 h-4 w-4" />
                        <span>Import Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExport} disabled={isExporting || isImporting}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Export Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <a href="https://github.com/iamaziz/Juday" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Github className="mr-2 h-4 w-4" />
                      <span>GitHub</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-4 w-4 mr-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="ml-2">Toggle Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  {user && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                {user ? (
                  <>
                    <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.email}</span>
                    <Button onClick={handleSignOut} disabled={loading} size="sm" className="h-8 px-3 text-sm">
                      Sign Out
                    </Button>
                  </>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                      <a href="https://github.com/iamaziz/Juday" target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4" />
                        <span className="sr-only">View on GitHub</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on GitHub</p>
                  </TooltipContent>
                </Tooltip>
                {user && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleExport} disabled={isExporting || isImporting} variant="outline" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download All Data</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download All Data</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleImportClick} disabled={isImporting || isExporting} variant="outline" size="icon" className="h-8 w-8">
                          <Upload className="h-4 w-4" />
                          <span className="sr-only">Import Data</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Import Data</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                <ThemeSwitcher />
              </>
            )}
            {user && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".md,.txt"
              />
            )}
          </div>
        </header>

        <main>
          {user ? (
            <div className="w-full max-w-4xl mx-auto">
              <section className="flex flex-col px-4 min-h-screen">
                <div className="flex-1 flex flex-col pt-8 pb-16">
                  {currentDaySheet ? (
                    <LiveMarkdownEditor
                      sheetId={currentDaySheet.id}
                      initialContent={currentDaySheet.content}
                      onContentChange={handleContentSave}
                      onFocusChange={setIsEditorFocused}
                    />
                  ) : (
                    <div className="h-full flex-1 flex items-center justify-center">
                      <p className="text-muted-foreground text-center">
                        No sheet available for this date. You can create one by typing if it's today or a future date.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="px-4 pb-16">
                {loadedHistoricalSheets.length > 0 && (
                  <div className={cn(
                    "w-full space-y-8 transition-opacity duration-300",
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
                    "text-center text-muted-foreground py-8 transition-opacity duration-300",
                    isFocusModeActive && "opacity-5 pointer-events-none"
                  )}>No more historical sheets.</p>
                )}
              </section>
            </div>
          ) : (
            <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-16">
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="space-y-4 text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Juday... Just Today!</h2>
                  <p className="text-lg text-muted-foreground">
                    A minimalist digital journal to maximize your signal-to-noise ratio.
                    Capture your thoughts, tasks, and reflections without the clutter.
                  </p>
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2 pt-4">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-base"
                    />
                    <Button onClick={handleSignIn} disabled={loading || !email} size="lg" className="h-10">
                      Sign In with Email
                    </Button>
                  </div>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                  <Button onClick={handleGitHubSignIn} disabled={loading} variant="outline" size="lg" className="w-full h-10">
                    <Github className="mr-2 h-4 w-4" />
                    Continue with GitHub
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden shadow-2xl">
                  <video
                    key="demo-video"
                    controls
                    muted
                    autoPlay
                    loop
                    playsInline
                    poster="/Juday-logo-simple.png"
                    className="w-full h-full object-cover"
                  >
                    <source src="/juday-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}