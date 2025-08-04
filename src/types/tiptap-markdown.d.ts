// This file extends Tiptap's core types to include the `markdown` storage
// property provided by the `tiptap-markdown` extension. This resolves the
// TypeScript error that was causing the Vercel build to fail.

declare module "@tiptap/core" {
  interface Storage {
    markdown: {
      getMarkdown: () => string;
    };
  }
}