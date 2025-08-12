"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, ViewUpdate, placeholder } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from 'next-themes';
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { lineStylingPlugin } from './codemirror/line-styling-plugin';
import { toggleBold, toggleItalic } from './codemirror/commands';

interface CodeMirrorEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
  placeholder?: string;
}

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
  { tag: t.contentSeparator, display: 'block', border: 'none', borderTop: '2px solid hsl(var(--accent))', margin: '1em 0', height: '0' },

  // HTML Tags
  { tag: t.tagName, color: 'hsl(var(--primary))', fontWeight: 'bold' },
  { tag: t.attributeName, color: 'hsl(var(--accent-foreground))' },
  { tag: t.attributeValue, color: 'hsl(var(--muted-foreground))' },

  // De-emphasize all markdown formatting characters (meta tags)
  { 
    tag: t.meta, 
    color: 'hsl(var(--muted-foreground))', 
    opacity: 0.4 // Reduced opacity to make markers more subtle
  },
]);

// This theme now only handles the editor "frame" and custom line styles.
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
  // This selector specifically targets the editor's root element when focused.
  '&.cm-focused': {
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
  // Placeholder style
  '.cm-placeholder': {
    color: 'hsl(var(--muted-foreground))',
    fontStyle: 'italic',
  }
});

export default function CodeMirrorEditor({
  initialContent,
  onContentChange,
  onFocusChange,
  placeholder: placeholderText,
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
        keymap.of([
          ...defaultKeymap, 
          indentWithTab,
          { key: "Mod-b", run: toggleBold },
          { key: "Mod-i", run: toggleItalic },
        ]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        getEditorFrameTheme(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        syntaxHighlighting(obsidianHighlightStyle),
        lineStylingPlugin,
        placeholder(placeholderText || ''),
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
  }, [theme, placeholderText]);

  useEffect(() => {
    if (viewRef.current && initialContent !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: initialContent },
      });
    }
  }, [initialContent]);

  return <div ref={editorRef} className="h-full w-full" />;
}