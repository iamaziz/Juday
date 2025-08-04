"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface DailySheetEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
}

export default function DailySheetEditor({ initialContent, onContentChange }: DailySheetEditorProps) {
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
      <ResizablePanelGroup direction="horizontal" className="flex-1 border rounded-lg overflow-hidden">
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