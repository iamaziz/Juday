"use client";

import React, { useEffect, useState } from "react";
import { clearAllChatHistory, deleteChatSession, getChatSessions } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Trash2, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ChatHistoryViewer from "./ChatHistoryViewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [dialogState, setDialogState] = useState<{ type: 'single' | 'all'; sessionId?: string } | null>(null);

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

  const handleDeleteConfirm = async () => {
    if (!dialogState) return;

    if (dialogState.type === 'single' && dialogState.sessionId) {
      const sessionIdToDelete = dialogState.sessionId;
      setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      
      const result = await deleteChatSession(sessionIdToDelete);
      if (result.error) {
        toast.error(`Failed to delete session: ${result.error}`);
        // Consider re-fetching or reverting state here if needed
      } else {
        toast.success("Chat session deleted.");
      }
    } else if (dialogState.type === 'all') {
      setSessions([]);
      const result = await clearAllChatHistory();
      if (result.error) {
        toast.error(`Failed to clear history: ${result.error}`);
      } else {
        toast.success("Chat history cleared.");
      }
    }
    setDialogState(null);
  };

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
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 pr-12 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Chat History</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onSwitchToChat}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => setDialogState({ type: 'all' })}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="group relative rounded-md hover:bg-accent">
                  <Button
                    variant="ghost"
                    onClick={() => setViewingSessionId(session.id)}
                    className="w-full justify-start text-left h-auto py-2 bg-transparent hover:bg-transparent"
                  >
                    <div className="flex flex-col items-start w-full overflow-hidden">
                      <span className="font-medium truncate w-full">{session.title || "Untitled Chat"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDialogState({ type: 'single', sessionId: session.id })}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">No chat history found.</p>
            )}
          </div>
        </ScrollArea>
      </div>
      <AlertDialog open={!!dialogState} onOpenChange={(open) => !open && setDialogState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState?.type === 'single'
                ? 'This will permanently delete this chat session and its messages.'
                : 'This will permanently delete all of your chat history. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}