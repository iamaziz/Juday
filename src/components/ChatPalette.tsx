"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ChatView from "./ChatView";

interface ChatPaletteProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ChatPalette({ isOpen, onOpenChange }: ChatPaletteProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 bg-background/90 backdrop-blur-sm border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Chat with Journal</DialogTitle>
        </DialogHeader>
        <ChatView />
      </DialogContent>
    </Dialog>
  );
}