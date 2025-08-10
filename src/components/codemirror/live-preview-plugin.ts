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
      const decorationsToAdd: { from: number; to: number; spec: Decoration }[] = [];
      const { from, to } = view.state.selection.main;

      syntaxTree(view.state).iterate({
        enter: (node) => {
          const isCursorInside = from >= node.from && to <= node.to;

          // Bold: **text**
          if (node.name.includes("StrongEmphasis")) {
            if (!isCursorInside) {
              decorationsToAdd.push({ from: node.from, to: node.from + 2, spec: Decoration.replace({}) });
              decorationsToAdd.push({ from: node.to - 2, to: node.to, spec: Decoration.replace({}) });
            }
            decorationsToAdd.push({
              from: node.from + 2,
              to: node.to - 2,
              spec: Decoration.mark({ class: "cm-strong-emphasis" }),
            });
          }

          // Italic: *text* or _text_
          if (node.name.includes("Emphasis")) {
            if (!isCursorInside) {
              decorationsToAdd.push({ from: node.from, to: node.from + 1, spec: Decoration.replace({}) });
              decorationsToAdd.push({ from: node.to - 1, to: node.to, spec: Decoration.replace({}) });
            }
            decorationsToAdd.push({
              from: node.from + 1,
              to: node.to - 1,
              spec: Decoration.mark({ class: "cm-emphasis" }),
            });
          }

          // Strikethrough: ~~text~~
          if (node.name.includes("Strikethrough")) {
            if (!isCursorInside) {
              decorationsToAdd.push({ from: node.from, to: node.from + 2, spec: Decoration.replace({}) });
              decorationsToAdd.push({ from: node.to - 2, to: node.to, spec: Decoration.replace({}) });
            }
            decorationsToAdd.push({
              from: node.from + 2,
              to: node.to - 2,
              spec: Decoration.mark({ class: "cm-strikethrough" }),
            });
          }
        },
      });

      // Sort decorations by their 'from' position before adding to the builder
      decorationsToAdd.sort((a, b) => a.from - b.from);

      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to, spec } of decorationsToAdd) {
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

export const livePreviewPlugin = [hideAndStylePlugin];