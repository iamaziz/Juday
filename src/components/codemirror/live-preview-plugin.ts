import { EditorView, ViewPlugin, Decoration, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

const hideMarkersPlugin = ViewPlugin.fromClass(
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

      syntaxTree(view.state).iterate({
        enter: (node) => {
          const parent = node.node.parent;
          if (!parent) return;

          // Don't hide markers if the cursor is inside the parent block (e.g., inside the whole **bold text**)
          const isCursorInside = selectionFrom >= parent.from && selectionTo <= parent.to;
          if (isCursorInside) {
            return;
          }

          // Find the marker nodes and hide them
          if (node.name.endsWith("Mark")) {
            if (parent.name === "StrongEmphasis" || parent.name === "Emphasis" || parent.name === "Strikethrough") {
              builder.add(node.from, node.to, Decoration.replace({}));
            }
          }
        },
      });

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

type DecorationSet = ReturnType<RangeSetBuilder<Decoration>["finish"]>;

export const livePreviewPlugin = [hideMarkersPlugin];