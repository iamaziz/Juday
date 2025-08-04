"use client";

import React from "react";
import { useInView } from "react-intersection-observer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    threshold: 0.1, // Trigger when 10% of the component is visible
    triggerOnce: false, // Keep updating inView status
  });

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "p-4 bg-card transition-opacity duration-300",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        (inView || isHovered) ? "opacity-100" : "opacity-20" // Increased default opacity to 20%
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="text-xl font-semibold mb-2 text-muted-foreground">
        {format(parseISO(sheet.title), "EEEE, MMMM d, yyyy")}
      </h3>
      <ScrollArea className="h-auto max-h-[300px] prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {sheet.content || "*No content for this day.*"}
        </ReactMarkdown>
      </ScrollArea>
    </div>
  );
}