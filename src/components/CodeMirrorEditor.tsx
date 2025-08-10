"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from 'next-themes';
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { lineStylingPlugin } from './codemirror/line-styling-plugin';

interface CodeMirrorEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

// This is the new, correct way to define syntax highlighting.
// It styles the text based on the parser's semantic tags.
const obsidianHighlightStyle = HighlightStyle.define([
  // General content
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  
  // Headings
  { tag: t.heading, fontWeight: 'bold', color: 'hsl(var(--foreground))' },
  { tag: t.heading1, fontSize: '2em' },
  { tag: t.heading2, fontSize: '1.7em' },
  { tag: t.heading3, fontSize: '1.4em' },
  { tag: t.heading4, fontSize: '1.2em' },
  
  // Links
  { tag: t.link, color: 'hsl(var(--primary))', textDecoration: 'underline', textDecorationColor: 'hsl(var(--primary) / 0.5)' },
  { tag: t.url, color: 'hsl(var(--muted-foreground))', opacity: 0.8 },
  
  // Quotes
  { tag: t.quote, fontStyle: 'italic', color: 'hsl(var(--muted-foreground))' },
  
  // Code
  { tag: t.monospace, fontFamily: 'var(--font-geist-mono)', backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', padding: '0.1em 0.3em', borderRadius: '4px' },
  
  // Horizontal Rule
  { tag: t.horizontalRule, display: 'block', border: 'none', borderTop: '2px solid hsl(var(--accent))', margin: '1em 0', height: '0' },

  // De-emphasize the markdown syntax characters
  { 
    tag: [t.headingMark, t.quoteMark, t.listMark, t.linkMark, t.emphasisMark, t.strongMark, t.strikethroughMark, t.monospaceMark], 
    color: 'hsl(var(--muted-foreground))', 
    opacity: 0.6 
  },
]);

// This theme now only handles the editor "frame" and custom line styles.
// All syntax styling is handled by the HighlightStyle above.
const getEditorFrameTheme = () => EditorView.theme({
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
    backgroundColor: 'hsl(var(--primary) / 0.15)',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--background))',
    border: 'none',
  },
  // Styles for the line-styling-plugin
  '& .cm-styled-quote-line': {
    borderLeft: '3px solid hsl(var(--accent))',
    paddingLeft: 'calc(2rem - 3px) !important',
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
  const { theme } = useTheme(); // We still need this to re-render on theme change
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
        // Correctly layered extensions
        getEditorFrameTheme(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }), // Base styles for code blocks etc.
        syntaxHighlighting(obsidianHighlightStyle), // Our custom styles on top
        lineStylingPlugin, // Line-level decorations
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
  }, [theme]); // Re-initialize when theme changes

  useEffect(() => {
    if (viewRef.current && initialContent !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: initialContent },
      });
    }
  }, [initialContent]);

  return <div ref={editorRef} className="h-full w-full" />;
}