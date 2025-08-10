"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from 'next-themes';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

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
  
  // Syntax Highlighting Styles
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--background))',
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'hsl(var(--accent))',
  },
  '.cm-keyword': { color: 'hsl(var(--primary))', opacity: 0.8 },
  '.cm-atom': { color: '#66f' },
  '.cm-number': { color: '#f07' },
  '.cm-string': { color: '#0a8' },
  '.cm-meta': { color: '#555' },
  '.cm-variable-2, .cm-variable-3, .cm-type': { color: '#085' },
  '.cm-property': { color: '#05a' },
  '.cm-operator': { color: 'hsl(var(--primary))' },
  '.cm-comment': { color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' },
  '.cm-link': { color: '#20f', textDecoration: 'underline' },
  '.cm-url': { color: '#20f' },
  '.cm-strong': { fontWeight: 'bold' },
  '.cm-emphasis': { fontStyle: 'italic' },
  '.cm-strikethrough': { textDecoration: 'line-through' },
  '.cm-heading': { fontWeight: 'bold', color: 'hsl(var(--foreground))' },
  '.cm-quote': { color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' },
  '.cm-monospace': {
    fontFamily: 'var(--font-geist-mono)',
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--muted-foreground))',
    padding: '0.1em 0.3em',
    borderRadius: '0.25rem',
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
        getEditorTheme(theme),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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