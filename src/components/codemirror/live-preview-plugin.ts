import { EditorView, ViewPlugin, Decoration, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

type DecorationSet = ReturnType<RangeSetBuilder<Decoration>["finish"]>;

// Helper to check if the cursor is on the same line as the node
function isCursorOnLine(view: EditorView, from: number, to: number): boolean {
  const { from: selectionFrom, to: selectionTo } = view.state.selection.main;
  // A node is active if the selection is not collapsed and overlaps with the node.
  if (selectionFrom !== selectionTo && Math.max(from, selectionFrom) < Math.min(to, selectionTo)) {
    return true;
  }
  // Or if the cursor is on the same line.
  const line = view.state.doc.lineAt(from);
  return selectionFrom >= line.from && selectionTo <= line.to;
}

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
      const decorations: { from: number, to: number, spec: any }[] = [];

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            const cursorOnLine = isCursorOnLine(view, node.from, node.to);

            if (cursorOnLine) return;

            // Headings
            if (node.name.startsWith("ATXHeading")) {
              const level = parseInt(node.name.replace("ATXHeading", ""), 10);
              decorations.push({ from: node.from, to: node.from + level + 1, spec: Decoration.replace({}) });
              decorations.push({ from: node.from, to: node.to, spec: Decoration.line({ attributes: { class: `cm-live-header cm-live-header-${level}` } }) });
            }
            // Emphasis (Italic)
            else if (node.name === "Emphasis") {
              decorations.push({ from: node.from, to: node.from + 1, spec: Decoration.replace({}) });
              decorations.push({ from: node.to - 1, to: node.to, spec: Decoration.replace({}) });
              decorations.push({ from: node.from + 1, to: node.to - 1, spec: Decoration.mark({ class: "cm-live-em" }) });
            }
            // StrongEmphasis (Bold)
            else if (node.name === "StrongEmphasis") {
              decorations.push({ from: node.from, to: node.from + 2, spec: Decoration.replace({}) });
              decorations.push({ from: node.to - 2, to: node.to, spec: Decoration.replace({}) });
              decorations.push({ from: node.from + 2, to: node.to - 2, spec: Decoration.mark({ class: "cm-live-strong" }) });
            }
            // Strikethrough
            else if (node.name === "Strikethrough") {
              decorations.push({ from: node.from, to: node.from + 2, spec: Decoration.replace({}) });
              decorations.push({ from: node.to - 2, to: node.to, spec: Decoration.replace({}) });
              decorations.push({ from: node.from + 2, to: node.to - 2, spec: Decoration.mark({ class: "cm-live-strikethrough" }) });
            }
            // Lists
            else if (node.name === "ListItem") {
              const listMark = node.node.firstChild;
              if (listMark) {
                decorations.push({ from: listMark.from, to: listMark.to, spec: Decoration.replace({}) });
              }
              const listTypeClass = node.node.parent?.name === "BulletList" ? "cm-ul-list-item" : "cm-ol-list-item";
              decorations.push({ from: node.from, to: node.to, spec: Decoration.line({ attributes: { class: `cm-list-item-line ${listTypeClass}` } }) });
            }
            // Blockquote
            else if (node.name === "Blockquote") {
                const quoteMark = node.node.firstChild;
                if (quoteMark) {
                    decorations.push({ from: quoteMark.from, to: quoteMark.to, spec: Decoration.replace({}) });
                }
                decorations.push({ from: node.from, to: node.to, spec: Decoration.line({ attributes: { class: "cm-live-blockquote" } }) });
            }
          },
        });
      }

      decorations.sort((a, b) => a.from - b.from);

      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to, spec } of decorations) {
        try {
          builder.add(from, to, spec);
        } catch (e) {
          // Ignore errors from overlapping ranges, which can happen
          // with complex nested structures. The sorted nature helps, but
          // this is a safeguard.
          console.warn(e);
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const livePreviewPlugin = [livePreviewPluginInstance];