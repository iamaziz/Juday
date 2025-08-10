"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from 'next-themes';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { lineStylingPlugin } from './codemirror/line-styling-plugin';

interface CodeMirrorEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

const getObsidianLikeTheme = (theme: string | undefined) => EditorView.theme({
  // Base styles
  '&': {
    color: 'hsl(var(--foreground))',
    backgroundColor: 'hsl(var(--background))',
    height: '100%',
    minHeight: '400px',
    fontSize: '16px',
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
  '.cm-line': {
    padding: '0 2rem',
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
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--background))',
    border: 'none',
  },

  // --- Syntax Highlighting & Styling ---

  // De-emphasize markdown formatting characters
  '& .cm-formatting, & .cm-formatting-link, & .cm-formatting-list, & .cm-formatting-quote': {
    color: 'hsl(var(--muted-foreground))',
    opacity: 0.8,
    fontWeight: 'normal',
  },
  '& .cm-formatting-heading': {
    color: 'hsl(var(--muted-foreground))',
    opacity: 0.6,
    fontWeight: 'bold',
  },

  // Headers
  '& .cm-header': {
    fontWeight: 'bold',
  },
  '& .cm-header-1': { fontSize: '2em' },
  '& .cm-header-2': { fontSize: '1.7em' },
  '& .cm-header-3': { fontSize: '1.4em' },
  '& .cm-header-4': { fontSize: '1.2em' },
  '& .cm-header-5': { fontSize: '1.1em' },
  '& .cm-header-6': { fontSize: '1.0em' },

  // Emphasis
  '& .cm-emphasis': {
    fontStyle: 'italic',
  },
  '& .cm-strong': {
    fontWeight: 'bold',
  },
  '& .cm-strikethrough': {
    textDecoration: 'line-through',
  },

  // Links
  '& .cm-link': {
    color: 'hsl(var(--primary))',
    textDecoration: 'underline',
    textDecorationColor: 'hsl(var(--primary) / 0.5)',
  },
  '& .cm-url': {
    color: 'hsl(var(--muted-foreground))',
    opacity: 0.8,
  },

  // Blockquotes (line style added by plugin)
  '& .cm-quote': {
    fontStyle: 'italic',
    color: 'hsl(var(--muted-foreground))',
  },
  '& .cm-styled-quote-line': {
    borderLeft: '3px solid hsl(var(--accent))',
    paddingLeft: '1rem !important', // Override the default line padding
  },

  // Code
  '& .cm-inline-code, & .cm-code-block': {
    fontFamily: 'var(--font-geist-mono)',
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--muted-foreground))',
    padding: '0.1em 0.3em',
    borderRadius: '4px',
  },
  '& .cm-formatting-code': {
    backgroundColor: 'hsl(var(--muted) / 0.5)',
  },

  // Horizontal Rule
  '& .cm-hr': {
    display: 'block',
    border: 'none',
    borderTop: '2px solid hsl(var(--accent))',
    margin: '1em 0',
    height: '0',
  },

  // Task Lists (line style added by plugin)
  '& .cm-task-marker': {
    fontFamily: 'var(--font-geist-mono)',
  },
  '& .cm-styled-task-line-checked': {
    textDecoration: 'line-through',
    color: 'hsl(var(--muted-foreground))',
  },
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
        getObsidianLikeTheme(theme),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        lineStylingPlugin,
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
        EditorView.lineWrapping,
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

  return <div ref={editorRef} className="h-full w-full" />;
}