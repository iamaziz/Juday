"use client";

import React from "react";
import { BubbleMenu } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { EditorInstance } from "./LiveMarkdownEditor";

interface EditorToolbarProps {
  editor: EditorInstance | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const textStyleOptions = [
    {
      name: "Paragraph",
      icon: Pilcrow,
      command: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive("paragraph"),
    },
    {
      name: "Heading 1",
      icon: Heading1,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading", { level: 1 }),
    },
    {
      name: "Heading 2",
      icon: Heading2,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive("heading", { level: 2 }),
    },
    {
      name: "Heading 3",
      icon: Heading3,
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive("heading", { level: 3 }),
    },
  ];

  const activeTextStyle = textStyleOptions.find((style) => style.isActive());

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: 'top-start',
        popperOptions: {
          strategy: 'fixed',
        },
      }}
      // This is the key fix.
      // It prevents the menu from trying to render while the editor is being destroyed,
      // which resolves the race condition with React's unmounting process.
      shouldShow={({ editor }) => {
        // Don't show if the editor is being destroyed.
        if (editor.isDestroyed) {
          return false;
        }

        // Don't show if there is no selection.
        const { from, to } = editor.state.selection;
        if (from === to) {
          return false;
        }
        
        // Only show if the editor is focused.
        return editor.isFocused;
      }}
      className="flex items-center gap-1 p-1 bg-background border rounded-lg shadow-md"
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="w-32 justify-between">
            <span>{activeTextStyle?.name || "Style"}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" sideOffset={5}>
          <div className="flex flex-col">
            {textStyleOptions.map((style) => (
              <Button
                key={style.name}
                variant="ghost"
                onClick={style.command}
                className={`w-full justify-start ${style.isActive() ? "is-active bg-accent" : ""}`}
              >
                <style.icon className="mr-2 h-4 w-4" />
                {style.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Toggle bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Toggle strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
    </BubbleMenu>
  );
}