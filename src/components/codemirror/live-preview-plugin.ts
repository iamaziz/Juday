import { EditorView, ViewPlugin, Decoration, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

const livePreviewPluginInstance = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const decorations: { from: number, to: number, spec: Decoration }[] = [];
      const { from: selectionFrom, to: selectionTo } = view.state.selection.main;

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            const isCursorInside = selectionFrom >= node.from && selectionTo <= node.to;

            // Hide markers for bold, italic, strikethrough
            if (node.name.endsWith("Mark") && node.node.parent) {
              const parentName = node.node.parent.name;
              if (["StrongEmphasis", "Emphasis", "Strikethrough"].includes(parentName)) {
                const isParentCursorInside = selectionFrom >= node.node.parent.from && selectionTo <= node.node.parent.to;
                if (!isParentCursorInside) {
                  decorations.push({ from: node.from, to: node.to, spec: Decoration.replace({}) });
                }
              }
            }

            // Headings, Blockquotes, Lists
            if (["HeaderMark", "QuoteMark", "ListMark"].includes(node.name)) {
              const line = view.state.doc.lineAt(node.from);
              const isCursorOnLine = selectionFrom >= line.from && selectionTo <= line.to;
              if (!isCursorOnLine) {
                decorations.push({ from: node.from, to: node.to, spec: Decoration.replace({}) });
              }
            }

            // Links
            if (node.name === "Link" && !isCursorInside) {
              decorations.push({ from: node.from, to: node.from + 1, spec: Decoration.replace({}) }); // Hide [
              const linkTextEnd = node.node.getChild("LinkText")?.to ?? node.from + 1;
              decorations.push({ from: linkTextEnd, to: linkTextEnd + 1, spec: Decoration.replace({}) }); // Hide ]
              const urlPartStart = node.node.getChild("LinkMark")?.from ?? linkTextEnd + 1;
              decorations.push({ from: urlPartStart, to: node.to, spec: Decoration.replace({}) }); // Hide (url)
            }

            // Inline Code
            if (node.name === "InlineCode" && !isCursorInside) {
              decorations.push({ from: node.from, to: node.from + 1, spec: Decoration.replace({}) }); // Hide `
              decorations.push({ from: node.to - 1, to: node.to, spec: Decoration.replace({}) }); // Hide `
            }

            // Fenced Code Blocks
            if (node.name === "FencedCode" && !isCursorInside) {
              const startMark = node.node.getChild("CodeMark");
              const endMark = node.node.lastChild;
              if (startMark) {
                decorations.push({ from: startMark.from, to: startMark.to, spec: Decoration.replace({}) });
              }
              if (endMark && endMark.name === "CodeMark") {
                decorations.push({ from: endMark.from, to: endMark.to, spec: Decoration.replace({}) });
              }
              const info = node.node.getChild("CodeInfo");
              if (info) {
                decorations.push({ from: info.from, to: info.to, spec: Decoration.replace({}) });
              }
            }
          },
        });
      }

      // Sort decorations by their 'from' position to prevent crashes
      decorations.sort((a, b) => a.from - b.from);

      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to, spec } of decorations) {
        builder.add(from, to, spec);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

type DecorationSet = ReturnType<RangeSetBuilder<Decoration>["finish"]>;

export const livePreviewPlugin = [livePreviewPluginInstance];