"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, FileText } from "lucide-react";
import SheetEditor from "./SheetEditor";

interface SheetItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function SheetManager() {
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<SheetItem[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Helper function to fetch sheets data, not a useCallback
  const fetchSheetsData = async (userId: string) => {
    const { data, error } = await supabase
      .from("sheets")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load sheets: ${error.message}`);
      return [];
    }
    return data || [];
  };

  // This function will be called to refresh the sheet list and manage selection
  // It takes the currently selected sheet ID as an argument to avoid dependency issues
  const handleRefreshSheets = useCallback(async (currentUserId: string, prevSelectedSheetId: string | null) => {
    setLoading(true);
    const fetchedSheets = await fetchSheetsData(currentUserId);
    setSheets(fetchedSheets);

    // Logic to set selectedSheetId after sheets are fetched
    if (prevSelectedSheetId && fetchedSheets.some(sheet => sheet.id === prevSelectedSheetId)) {
      setSelectedSheetId(prevSelectedSheetId); // Keep current selection if it still exists
    } else if (fetchedSheets.length > 0) {
      setSelectedSheetId(fetchedSheets[0].id); // Select the first sheet
    } else {
      setSelectedSheetId(null); // No sheets available
    }
    setLoading(false);
  }, [supabase]); // Only depends on supabase, which is stable.

  // Effect to load sheets when user changes or on initial mount
  useEffect(() => {
    const initializeUserAndSheets = async () => {
      setLoading(true);
      const { data: { user: initialUser } } = await supabase.auth.getUser();
      setUser(initialUser);

      if (initialUser) {
        // Pass the current value of selectedSheetId from the state closure
        await handleRefreshSheets(initialUser.id, selectedSheetId);
      } else {
        setSheets([]);
        setSelectedSheetId(null);
        setLoading(false);
      }
    };

    initializeUserAndSheets();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only update user and trigger sheet load if the user object actually changes
      if (session?.user?.id !== user?.id) {
        setUser(session?.user || null);
        if (session?.user) {
          // Pass the current value of selectedSheetId from the state closure
          handleRefreshSheets(session.user.id, selectedSheetId);
        } else {
          setSheets([]);
          setSelectedSheetId(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, handleRefreshSheets, user]); // Removed selectedSheetId from dependencies here to prevent re-fetch loops.

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
      setSheets([]);
      setSelectedSheetId(null); // Clear selected sheet on sign out
    }
    setLoading(false);
  };

  const handleCreateSheet = async () => {
    if (!user) {
      toast.error("Please sign in to create a sheet.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("sheets")
      .insert({ user_id: user.id, title: "Untitled Sheet", content: "" })
      .select()
      .single();

    if (error) {
      toast.error(`Failed to create sheet: ${error.message}`);
    } else {
      toast.success("New sheet created!");
      // After creating, refresh sheets and select the new one
      await handleRefreshSheets(user.id, data.id); // Pass the new sheet's ID to select it
      if (isMobile) setIsSheetOpen(false);
    }
    setLoading(false);
  };

  const handleSelectSheet = (sheetId: string) => {
    setSelectedSheetId(sheetId);
    if (isMobile) setIsSheetOpen(false);
  };

  const selectedSheet = sheets.find((sheet) => sheet.id === selectedSheetId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const renderSidebarContent = () => (
    <>
      {user ? (
        <>
          <p className="text-sm mb-2">Welcome, {user.email}</p>
          <Button onClick={handleSignOut} disabled={loading} className="mb-4">
            Sign Out
          </Button>
          <Button onClick={handleCreateSheet} className="mb-4">
            New Sheet
          </Button>
          <div className="flex-grow border-t border-sidebar-border pt-4">
            <h3 className="text-lg font-medium mb-2">Your Sheets</h3>
            {sheets.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-200px)] pr-2">
                {sheets.map((sheet) => (
                  <Button
                    key={sheet.id}
                    variant={selectedSheetId === sheet.id ? "secondary" : "ghost"}
                    className="w-full justify-start mb-1"
                    onClick={() => handleSelectSheet(sheet.id)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {sheet.title || "Untitled Sheet"}
                  </Button>
                ))}
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-sm">No sheets yet. Create one!</p>
            )}
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
    </>
  );

  return (
    <div className="flex h-screen">
      {!isMobile && (
        <aside className="w-64 border-r bg-sidebar text-sidebar-foreground p-4 flex flex-col">
          {renderSidebarContent()}
        </aside>
      )}

      <main className="flex-1 flex flex-col">
        {isMobile && (
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <h1 className="text-xl font-semibold">My Sheets</h1>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground p-4 flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-primary">My Sheets</SheetTitle>
                </SheetHeader>
                {renderSidebarContent()}
              </SheetContent>
            </Sheet>
          </header>
        )}
        <div className="flex-1 flex items-center justify-center p-4">
          {selectedSheet ? (
            <SheetEditor
              sheetId={selectedSheet.id}
              initialTitle={selectedSheet.title}
              initialContent={selectedSheet.content}
              onSaveSuccess={() => handleRefreshSheets(user.id, selectedSheet.id)} // Pass current user and selected ID
            />
          ) : (
            <p className="text-muted-foreground">Select a sheet or create a new one to start editing.</p>
          )}
        </div>
      </main>
    </div>
  );
}