"use client";

import React, { useEffect, useRef } from "react";
import { useChat, type Message } from "ai/react";
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
import ReactMarkdown from "react-markdown";

interface ChatPaletteProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Group user and assistant messages into pairs for the Q&A block structure
const groupMessages = (messages: Message[]) => {
  const pairs: { user: Message; assistant: Message | null }[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const pair = { user: messages[i], assistant: null as Message | null };
      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        pair.assistant = messages[i + 1];
        i++; // Skip the assistant message in the next loop
      }
      pairs.push(pair);
    }
  }
  return pairs;
};


export default function ChatPalette({ isOpen, onOpenChange }: ChatPaletteProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    onError: (err: Error) => {
      // Error is handled in the UI below
    },
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to top on new message to show the latest Q&A
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [messages]);

  // Clear messages and focus input when dialog opens for a fresh start
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      // Delay focus slightly to ensure dialog is fully rendered and ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, setMessages]);

  const messagePairs = groupMessages(messages);
  const reversedPairs = [...messagePairs].reverse(); // Show newest at the top

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col p-0 gap-0 bg-background/80 backdrop-blur-sm border shadow-2xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 font-normal text-muted-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Chat with your Journal
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question... (Cmd+K to open)"
              className="flex-1 h-10 text-base"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
           {error && (
            <div className="mt-2 text-destructive text-sm">
              <p><strong>Error:</strong> {error.message}</p>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-4 md:p-6 space-y-8">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground pt-8">
                <p>Ask anything about your past entries.</p>
                <p className="text-xs mt-2">e.g., "What did I work on last week?" or "Summarize my entry from May 15th."</p>
              </div>
            )}

            {reversedPairs.map((pair, index) => (
              <div key={pair.user.id} className="space-y-4">
                {/* User Query */}
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" />
                  <p className="font-semibold text-lg leading-tight">{pair.user.content}</p>
                </div>

                {/* AI Answer */}
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
                  <div className="w-full">
                    {pair.assistant ? (
                      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                        <ReactMarkdown>{pair.assistant.content}</ReactMarkdown>
                      </div>
                    ) : isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                {/* Separator */}
                {index < reversedPairs.length - 1 && <hr className="border-border/50" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}