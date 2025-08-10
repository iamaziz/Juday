import { EditorView, ViewPlugin, Decoration, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

type DecorationSet = ReturnType<RangeSetBuilder<Decoration>["finish"]>;

const lineStylingPluginInstance = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            const line = view.state.doc.lineAt(node.from);

            if (node.name === "Blockquote") {
              builder.add(line.from, line.from, Decoration.line({
                attributes: { class: "cm-styled-quote-line" }
              }));
            }

            if (node.name === "Task") {
              const isChecked = view.state.doc.sliceString(node.from, node.to).includes("[x]");
              if (isChecked) {
                builder.add(line.from, line.from, Decoration.line({
                  attributes: { class: "cm-styled-task-line-checked" }
                }));
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

export const lineStylingPlugin = [lineStylingPluginInstance];