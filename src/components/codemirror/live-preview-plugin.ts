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
      const builder = new RangeSetBuilder<Decoration>();
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
                  builder.add(node.from, node.to, Decoration.replace({}));
                }
              }
            }

            // Headings, Blockquotes, Lists
            if (["HeaderMark", "QuoteMark", "ListMark"].includes(node.name)) {
              const line = view.state.doc.lineAt(node.from);
              const isCursorOnLine = selectionFrom >= line.from && selectionTo <= line.to;
              if (!isCursorOnLine) {
                builder.add(node.from, node.to, Decoration.replace({}));
              }
            }

            // Links
            if (node.name === "Link" && !isCursorInside) {
              builder.add(node.from, node.from + 1, Decoration.replace({})); // Hide [
              const linkTextEnd = node.node.getChild("LinkText")?.to ?? node.from + 1;
              builder.add(linkTextEnd, linkTextEnd + 1, Decoration.replace({})); // Hide ]
              const urlPartStart = node.node.getChild("LinkMark")?.from ?? linkTextEnd + 1;
              builder.add(urlPartStart, node.to, Decoration.replace({})); // Hide (url)
            }

            // Inline Code
            if (node.name === "InlineCode" && !isCursorInside) {
              builder.add(node.from, node.from + 1, Decoration.replace({})); // Hide `
              builder.add(node.to - 1, node.to, Decoration.replace({})); // Hide `
            }

            // Fenced Code Blocks
            if (node.name === "FencedCode" && !isCursorInside) {
              const startMark = node.node.getChild("CodeMark");
              const endMark = node.node.lastChild;
              if (startMark) {
                builder.add(startMark.from, startMark.to, Decoration.replace({}));
              }
              if (endMark && endMark.name === "CodeMark") {
                builder.add(endMark.from, endMark.to, Decoration.replace({}));
              }
              const info = node.node.getChild("CodeInfo");
              if (info) {
                builder.add(info.from, info.to, Decoration.replace({}));
              }
            }
          },
        });
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