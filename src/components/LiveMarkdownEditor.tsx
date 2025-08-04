"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { createClient } from "@/lib/supabase/client";

interface LiveMarkdownEditorProps {
  sheetId: string;
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

export default function LiveMarkdownEditor({
  sheetId,
  initialContent,
  onContentChange,
  onFocusChange,
}: LiveMarkdownEditorProps) {
  const supabase = createClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Markdown,
      Placeholder.configure({
        placeholder: "Start writing your daily tasks and notes here...",
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "ProseMirror",
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        onContentChange(markdown);
      }, 1000);
    },
    onFocus: () => {
      onFocusChange?.(true);
    },
    onBlur: () => {
      onFocusChange?.(false);
    },
    immediatelyRender: false,
  });

  // Effect to update editor content when initialContent prop changes (e.g., on date change)
  useEffect(() => {
    if (editor && editor.storage.markdown.getMarkdown() !== initialContent) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor]);

  // Realtime subscription for content synchronization
  useEffect(() => {
    if (!sheetId || !editor) return;

    const channel = supabase
      .channel(`sheet_updates:${sheetId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sheets",
          filter: `id=eq.${sheetId}`,
        },
        (payload) => {
          const newContent = payload.new.content as string;
          const currentContent = editor.storage.markdown.getMarkdown();
          
          if (newContent !== currentContent) {
            // To avoid overwriting what the user is currently typing,
            // we can check cursor position. If it's not at the end,
            // maybe the user is editing mid-document. For simplicity now,
            // we will just update. A more robust solution could be more complex.
            const { from, to } = editor.state.selection;
            editor.commands.setContent(newContent, false);
            // Try to restore selection
            editor.commands.setTextSelection({ from, to });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sheetId, supabase, editor]);

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return <EditorContent editor={editor} className="h-full" />;
}