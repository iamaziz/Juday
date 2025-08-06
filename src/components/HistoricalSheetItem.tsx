"use client";

import React from "react";
import { useInView } from "react-intersection-observer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface SheetItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface HistoricalSheetItemProps {
  sheet: SheetItem;
}

export default function HistoricalSheetItem({ sheet }: HistoricalSheetItemProps) {
  const { ref, inView } = useInView({
    threshold: 0.5, // An item is "in view" when 50% of it is visible
    triggerOnce: false,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "p-6 bg-card rounded-lg shadow-lg", // Enhanced card styling
        "transition-all duration-500 ease-in-out transform",
        "will-change-transform", // Performance hint for the browser
        inView
          ? "opacity-100 scale-100" // In-focus style
          : "opacity-40 scale-95"  // Out-of-focus style
      )}
    >
      <h3 className="text-xl font-semibold mb-4 text-muted-foreground">
        {format(parseISO(sheet.title), "EEEE, MMMM d, yyyy")}
      </h3>
      {/* Functional Fix: Removed ScrollArea to allow content to expand */}
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {sheet.content || "*No content for this day.*"}
        </ReactMarkdown>
      </div>
    </div>
  );
}