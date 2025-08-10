import { EditorView, ViewPlugin, Decoration, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

const hideAndStylePlugin = ViewPlugin.fromClass(
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
      const { from, to } = view.state.selection.main;
      const isSelection = from !== to;

      syntaxTree(view.state).iterate({
        enter: (node) => {
          const isCursorInside = from >= node.from && to <= node.to;

          // Bold: **text**
          if (node.name.includes("StrongEmphasis")) {
            if (!isCursorInside) {
              builder.add(node.from, node.from + 2, Decoration.replace({})); // hide **
              builder.add(node.to - 2, node.to, Decoration.replace({})); // hide **
            }
            builder.add(
              node.from + 2,
              node.to - 2,
              Decoration.mark({ class: "cm-strong-emphasis" })
            );
          }

          // Italic: *text* or _text_
          if (node.name.includes("Emphasis")) {
            if (!isCursorInside) {
              builder.add(node.from, node.from + 1, Decoration.replace({})); // hide *
              builder.add(node.to - 1, node.to, Decoration.replace({})); // hide *
            }
            builder.add(
              node.from + 1,
              node.to - 1,
              Decoration.mark({ class: "cm-emphasis" })
            );
          }

          // Strikethrough: ~~text~~
          if (node.name.includes("Strikethrough")) {
            if (!isCursorInside) {
              builder.add(node.from, node.from + 2, Decoration.replace({})); // hide ~~
              builder.add(node.to - 2, node.to, Decoration.replace({})); // hide ~~
            }
            builder.add(
              node.from + 2,
              node.to - 2,
              Decoration.mark({ class: "cm-strikethrough" })
            );
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

export const livePreviewPlugin = [hideAndStylePlugin];