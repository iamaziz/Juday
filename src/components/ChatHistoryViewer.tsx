"use client";

import React, { useEffect, useState, useRef } from "react";
import { getChatMessages } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatHistoryViewerProps {
  sessionId: string;
}

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

export default function ChatHistoryViewer({ sessionId }: ChatHistoryViewerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      const result = await getChatMessages(sessionId);
      if ("error" in result) {
        toast.error(`Failed to load messages: ${result.error}`);
        console.error(result.error);
      } else {
        setMessages(result);
      }
      setIsLoading(false);
    };

    fetchMessages();
  }, [sessionId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const messagePairs = groupMessages(messages);
  const reversedPairs = [...messagePairs].reverse();

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="p-4 md:p-6 space-y-8">
        {reversedPairs.map((pair, index) => (
          <div key={pair.user.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" />
              <p className="font-semibold text-lg leading-tight">{pair.user.content}</p>
            </div>
            {pair.assistant && (
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
                <div className="w-full prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {formatAssistantContent(pair.assistant.content)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {index < reversedPairs.length - 1 && <hr className="border-border/50" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}