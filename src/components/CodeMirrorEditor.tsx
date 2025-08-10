"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from 'next-themes';
import { livePreviewPlugin } from './codemirror/live-preview-plugin';

interface CodeMirrorEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

// Expanded CodeMirror theme for a richer "Obsidian-like" live preview
const getEditorTheme = (theme: string | undefined) => EditorView.theme({
  // Base styles
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
  
  // Markdown-specific styles
  '.cm-strong': {
    fontWeight: 'bold',
  },
  '.cm-em': {
    fontStyle: 'italic',
  },
  '.cm-strikethrough': {
    textDecoration: 'line-through',
  },
  '.cm-header-1': { fontSize: '2rem', fontWeight: 'bold', lineHeight: '1.2' },
  '.cm-header-2': { fontSize: '1.75rem', fontWeight: 'bold', lineHeight: '1.2' },
  '.cm-header-3': { fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' },
  '.cm-header-4': { fontSize: '1.25rem', fontWeight: 'bold', lineHeight: '1.2' },
  '.cm-header-5': { fontSize: '1.1rem', fontWeight: 'bold', lineHeight: '1.2' },
  '.cm-header-6': { fontSize: '1rem', fontWeight: 'bold', color: 'hsl(var(--muted-foreground))', lineHeight: '1.2' },
  '.cm-quote': {
    fontStyle: 'italic',
    borderLeft: '3px solid hsl(var(--border))',
    paddingLeft: '0.8rem',
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-link': {
    color: 'hsl(var(--primary))',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  '.cm-inline-code': {
    fontFamily: 'var(--font-geist-mono)',
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--muted-foreground))',
    padding: '0.1rem 0.3rem',
    borderRadius: '0.25rem',
  },
  '.cm-hr-widget': {
    width: '100%',
    borderTop: '2px solid hsl(var(--border))',
    margin: '1em 0',
  },
  '.cm-list-item': {
    paddingLeft: '0.5rem', /* Indent list items slightly */
  },
  '.cm-task-marker': {
    marginRight: '0.5em',
  },
  '.cm-task-checked .cm-line': {
    textDecoration: 'line-through',
    color: 'hsl(var(--muted-foreground))',
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
        livePreviewPlugin,
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