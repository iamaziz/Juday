"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client"; // Import Supabase client

interface DailySheetEditorProps {
  sheetId: string; // New prop for the sheet ID
  initialContent: string;
  onContentChange: (content: string) => void;
}

export default function DailySheetEditor({ sheetId, initialContent, onContentChange }: DailySheetEditorProps) {
  const supabase = createClient(); // Initialize Supabase client
  const [content, setContent] = useState(initialContent);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Debounce the save operation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onContentChange(newContent);
    }, 1000); // Save after 1 second of no typing
  };

  // Realtime subscription for content synchronization
  useEffect(() => {
    if (!sheetId) return;

    const channel = supabase
      .channel(`sheet_updates:${sheetId}`) // Unique channel name for this sheet
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sheets',
          filter: `id=eq.${sheetId}`
        },
        (payload) => {
          // Only update if the change came from another source (not this client's own typing)
          // A more robust check might involve a client-side UUID for each save,
          // but for now, comparing content is a simple way to avoid self-updates.
          if (payload.new.content !== content) {
            setContent(payload.new.content);
            // Optionally, show a subtle toast: toast.info("Content updated from another session.");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sheetId, supabase, content]); // Add content to dependencies to ensure the latest content is used for comparison

  useEffect(() => {
    // Clear timeout on component unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full max-w-[1200px] flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg overflow-hidden">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full p-4">
            <Textarea
              placeholder="Start writing your daily tasks and notes here in Markdown..."
              value={content}
              onChange={handleInputChange}
              className="flex-1 resize-none border-none focus-visible:ring-0 h-full font-mono text-base"
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full p-4 prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}