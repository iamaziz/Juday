"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from 'next-themes';

interface CodeMirrorEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

// Basic CodeMirror theme to match the app's look and feel
const getEditorTheme = (theme: string | undefined) => EditorView.theme({
  '&': {
    color: 'hsl(var(--foreground))',
    backgroundColor: 'hsl(var(--background))',
    height: '100%',
    minHeight: '400px',
    fontSize: '1rem',
    fontFamily: 'var(--font-geist-sans)',
  },
  '.cm-content': {
    caretColor: 'hsl(var(--foreground))',
    padding: '2rem 0',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--muted-foreground))',
    border: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.7',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'hsl(var(--foreground))'
  },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: theme === 'dark' ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--primary) / 0.1)',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  }
});

export default function CodeMirrorEditor({
  initialContent,
  onContentChange,
  onFocusChange,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { theme } = useTheme();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        keymap.of([...defaultKeymap]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        getEditorTheme(theme),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.focusChanged) {
            onFocusChange?.(update.view.hasFocus);
          }
          if (update.docChanged) {
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(() => {
              onContentChange(update.state.doc.toString());
            }, 1000);
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      view.destroy();
      viewRef.current = null;
    };
  // We only want this to run once on mount, content updates are handled by the next effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    if (viewRef.current && initialContent !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: initialContent },
      });
    }
  }, [initialContent]);

  return <div ref={editorRef} className="h-full w-full prose dark:prose-invert max-w-none" />;
}