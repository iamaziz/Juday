"use client";

import React, { useEffect, useState } from "react";
import { getChatSessions } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Session = {
  id: string;
  title: string | null;
  created_at: string;
};

interface ChatHistorySidebarProps {
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  activeSessionId: string | null;
  isOpen: boolean;
}

export default function ChatHistorySidebar({ onSelectSession, onNewChat, activeSessionId, isOpen }: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch sessions only when the dialog is open to get the latest data
    if (isOpen) {
      const fetchSessions = async () => {
        setIsLoading(true);
        const result = await getChatSessions();
        if ("error" in result) {
          toast.error(`Failed to load chat history: ${result.error}`);
          console.error(result.error);
        } else {
          setSessions(result);
        }
        setIsLoading(false);
      };
      fetchSessions();
    }
  }, [isOpen]);

  return (
    <div className="flex flex-col h-full bg-muted/50 border-r">
      <div className="p-2">
        <Button onClick={onNewChat} className="w-full justify-start">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            sessions.map((session) => (
              <Button
                key={session.id}
                variant="ghost"
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "w-full justify-start text-left h-auto py-2",
                  activeSessionId === session.id && "bg-accent text-accent-foreground"
                )}
              >
                <div className="flex flex-col items-start w-full overflow-hidden">
                  <span className="font-medium truncate w-full">{session.title || "Untitled Chat"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}