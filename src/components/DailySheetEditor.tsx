"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface DailySheetEditorProps {
  sheetId: string;
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void; // Re-added prop for focus change
}

export default function DailySheetEditor({ sheetId, initialContent, onContentChange, onFocusChange }: DailySheetEditorProps) {
  const supabase = createClient();
  const [content, setContent] = useState(initialContent);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to update content and adjust textarea height when initialContent changes
  useEffect(() => {
    setContent(initialContent);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  }, [initialContent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Auto-grow textarea as content is typed
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }

    // Debounce the save operation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onContentChange(newContent);
    }, 1000);
  };

  const handleFocus = () => {
    onFocusChange?.(true); // Notify parent when textarea gains focus
  };

  const handleBlur = () => {
    onFocusChange?.(false); // Notify parent when textarea loses focus
  };

  // Realtime subscription for content synchronization
  useEffect(() => {
    if (!sheetId) return;

    const channel = supabase
      .channel(`sheet_updates:${sheetId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sheets',
          filter: `id=eq.${sheetId}`
        },
        (payload) => {
          if (payload.new.content !== content) {
            setContent(payload.new.content);
            // Also adjust textarea height if content changes from external source
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sheetId, supabase, content]);

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    // Outer div of DailySheetEditor should grow to take available space
    <div className="w-full max-w-[1200px] flex flex-col flex-grow">
      {/* ResizablePanelGroup should also grow */}
      <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg">
        <ResizablePanel defaultSize={50} minSize={30} className="h-full">
          {/* This div should fill its panel and be a flex container for the textarea */}
          <div className="p-4 h-full flex flex-col">
            <Textarea
              ref={textareaRef}
              placeholder="Start writing your daily tasks and notes here in Markdown..."
              value={content}
              onChange={handleInputChange}
              onFocus={handleFocus} {/* Added onFocus handler */}
              onBlur={handleBlur}   {/* Added onBlur handler */}
              className="w-full resize-none border-none focus-visible:ring-0 font-mono text-base flex-grow overflow-y-hidden"
              style={{ height: 'auto' }}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30} className="h-full">
          {/* This div should fill its panel and allow its content to scroll if needed */}
          <div className="p-4 prose dark:prose-invert max-w-none h-full overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}