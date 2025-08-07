"use client";

import React, { useEffect, useRef } from "react";
import { useChat } from "ai/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatPaletteProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ChatPalette({ isOpen, onOpenChange }: ChatPaletteProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    onError: (err) => {
      // The useChat hook will set the error state, which we display below.
      // No need for a toast here as the UI provides clear feedback.
    },
    onFinish: () => {
      // Optional: any logic to run when a stream finishes.
    }
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Clear messages when the dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
    }
  }, [isOpen, setMessages]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col p-0 gap-0 bg-background/80 backdrop-blur-sm border shadow-2xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 font-normal text-muted-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Chat with your Journal
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground pt-8">
                <p>Ask anything about your past entries.</p>
                <p className="text-xs mt-2">e.g., "What did I work on last week?" or "Summarize my entry from May 15th."</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-start gap-3",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {m.role === "assistant" && (
                  <div className="bg-primary text-primary-foreground rounded-full p-2">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-md rounded-lg px-4 py-2 prose dark:prose-invert",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.role === "user" && (
                  <div className="bg-muted text-muted-foreground rounded-full p-2">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages.slice(-1)[0]?.role === 'user' && (
              <div className="flex items-center justify-start gap-3">
                 <div className="bg-primary text-primary-foreground rounded-full p-2">
                    <Bot className="h-5 w-5" />
                  </div>
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {error && (
          <div className="p-4 border-t text-destructive text-sm bg-destructive/10">
            <p><strong>Error:</strong> {error.message}</p>
          </div>
        )}

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question... (Cmd+K to open)"
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}