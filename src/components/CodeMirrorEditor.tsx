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

const getEditorTheme = (theme: string | undefined) => EditorView.theme({
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
    padding: '0 2px',
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
  '.cm-strong': { fontWeight: 'bold' },
  '.cm-em': { fontStyle: 'italic' },
  '.cm-strikethrough': { textDecoration: 'line-through' },

  '.cm-header': {
    fontWeight: 'bold',
    lineHeight: '1.25',
    marginTop: '1em',
    marginBottom: '0.4em',
  },
  '.cm-header-1': { fontSize: '2em' },
  '.cm-header-2': { fontSize: '1.75em' },
  '.cm-header-3': { fontSize: '1.5em' },
  '.cm-header-4': { fontSize: '1.25em' },
  '.cm-header-5': { fontSize: '1.1em' },
  '.cm-header-6': { fontSize: '1em', color: 'hsl(var(--muted-foreground))' },

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
    padding: '0.1em 0.3em',
    borderRadius: '0.25rem',
  },
  '.cm-codeblock': {
    fontFamily: 'var(--font-geist-mono)',
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--muted-foreground))',
    paddingLeft: '1rem',
    paddingRight: '1rem',
  },

  // List styling
  '.cm-list-item .cm-line': {
    position: 'relative',
    paddingLeft: '1.5rem',
    lineHeight: '1.5',
  },
  '.cm-list-ul > .cm-list-item .cm-line::before': {
    content: "'•'",
    position: 'absolute',
    left: '0.5rem',
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-list-ol': {
    counterReset: 'list-counter',
  },
  '.cm-list-ol > .cm-list-item': {
    counterIncrement: 'list-counter',
  },
  '.cm-list-ol > .cm-list-item .cm-line::before': {
    content: 'counter(list-counter) "."',
    position: 'absolute',
    left: '0',
    width: '1.2rem',
    textAlign: 'right',
    marginRight: '0.3rem',
    color: 'hsl(var(--muted-foreground))',
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

  return <div ref={editorRef} className="h-full w-full" />;
}