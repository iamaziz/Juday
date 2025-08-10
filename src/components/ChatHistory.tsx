"use client";

import React, { useEffect, useState } from "react";
import { getChatSessions } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ChatHistoryViewer from "./ChatHistoryViewer";

type Session = {
  id: string;
  title: string | null;
  created_at: string;
};

interface ChatHistoryProps {
  onSwitchToChat: () => void;
}

export default function ChatHistory({ onSwitchToChat }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      const result = await getChatSessions();
      if ("error" in result) {
        toast.error(`Failed to load chat history: ${result.error}`);
      } else {
        setSessions(result);
      }
      setIsLoading(false);
    };
    fetchSessions();
  }, []);

  if (viewingSessionId) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-2 pr-12 border-b">
          <Button variant="ghost" onClick={() => setViewingSessionId(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </div>
        <ChatHistoryViewer sessionId={viewingSessionId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pr-12 border-b flex justify-between items-center">
        <h3 className="font-semibold text-lg">Chat History</h3>
        <Button variant="outline" onClick={onSwitchToChat}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <Button
                key={session.id}
                variant="ghost"
                onClick={() => setViewingSessionId(session.id)}
                className="w-full justify-start text-left h-auto py-2"
              >
                <div className="flex flex-col items-start w-full overflow-hidden">
                  <span className="font-medium truncate w-full">{session.title || "Untitled Chat"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Button>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">No chat history found.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}