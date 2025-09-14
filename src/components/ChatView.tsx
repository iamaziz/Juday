"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat, type Message } from "ai/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Sparkles, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import ChatHistory from "./ChatHistory";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const groupMessages = (messages: Message[]) => {
  const pairs: { user: Message; assistant: Message | null }[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const pair = { user: messages[i], assistant: null as Message | null };
      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        pair.assistant = messages[i + 1];
        i++;
      }
      pairs.push(pair);
    }
  }
  return pairs;
};

const formatAssistantContent = (content: string) => {
  const blockRegex = /\[\s*([\s\S]*?)\s*\]/g;
  return content.replace(blockRegex, (_match, group1) => `$$${group1}$$`);
};

export default function ChatView() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    body: {
      sessionId,
    },
    onResponse: (response) => {
      const newSessionId = response.headers.get('x-juday-session-id');
      if (newSessionId) {
        setSessionId(newSessionId);
      }
    },
    onError: (err: Error) => {
      // Error is handled in the UI below
    },
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    handleNewChat();
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setViewMode('chat');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const messagePairs = groupMessages(messages);
  const reversedPairs = [...messagePairs].reverse();

  return (
    <div className="flex flex-col h-full">
      {viewMode === 'chat' ? (
        <>
          <div className="p-4 pr-12 border-b flex items-center gap-2">
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                placeholder="Ask a question..."
                className="flex-1 h-10 text-base"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setViewMode('history')}>
                    <History className="h-5 w-5" />
                    <span className="sr-only">View Chat History</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Chat History</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {error && (
            <div className="p-4 pt-0 text-destructive text-sm">
              <p><strong>Error:</strong> {error.message}</p>
            </div>
          )}
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 md:p-6 space-y-8">
              {messages.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground pt-8">
                   <Sparkles className="mx-auto h-10 w-10 text-primary/50 mb-4" />
                  <p className="font-semibold">Chat with your Journal</p>
                  <p className="text-xs mt-2">e.g., "What did I work on last week?" or "Summarize my entry from May 15th."</p>
                </div>
              )}
              {reversedPairs.map((pair, index) => (
                <div key={pair.user.id} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" />
                    <p className="font-semibold text-lg leading-tight">{pair.user.content}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
                    <div className="w-full">
                      {pair.assistant ? (
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {formatAssistantContent(pair.assistant.content)}
                          </ReactMarkdown>
                        </div>
                      ) : isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {index < reversedPairs.length - 1 && <hr className="border-border/50" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <ChatHistory onSwitchToChat={handleNewChat} />
      )}
    </div>
  );
}