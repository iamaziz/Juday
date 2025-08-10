import { EditorView, ViewPlugin, Decoration, ViewUpdate, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("hr");
    hr.className = "cm-hr-widget";
    return hr;
  }
  ignoreEvent() { return false; }
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

            // Headings
            if (node.name.startsWith("Header")) {
              if (!isCursorInside) {
                const headerMark = node.node.getChild("HeaderMark");
                if (headerMark) {
                  decorations.push({ from: headerMark.from, to: headerMark.to, spec: Decoration.replace({}) });
                }
              }
            }
            
            // Blockquotes
            if (node.name === "Blockquote") {
              if (!isCursorInside) {
                node.node.getChildren("QuoteMark").forEach(mark => {
                  decorations.push({ from: mark.from, to: mark.to, spec: Decoration.replace({}) });
                });
              }
            }

            // Lists
            if (node.name === "ListItem") {
              if (!isCursorInside) {
                const listMark = node.node.getChild("ListMark");
                if (listMark) {
                  decorations.push({ from: listMark.from, to: listMark.to, spec: Decoration.replace({}) });
                }
              }
            }

            // Horizontal Rules
            if (node.name === "HorizontalRule") {
              if (!isCursorInside) {
                decorations.push({
                  from: node.from,
                  to: node.to,
                  spec: Decoration.widget({ widget: new HorizontalRuleWidget(), block: true, side: -1 })
                });
              }
            }

            // Links
            if (node.name === "Link") {
              if (!isCursorInside) {
                // Hide [ and ]
                decorations.push({ from: node.from, to: node.from + 1, spec: Decoration.replace({}) });
                const linkTextEnd = node.node.getChild("LinkText")?.to ?? node.from + 1;
                decorations.push({ from: linkTextEnd, to: linkTextEnd + 1, spec: Decoration.replace({}) });
                
                // Hide (url)
                const urlPartStart = node.node.getChild("LinkMark")?.from ?? linkTextEnd + 1;
                decorations.push({ from: urlPartStart, to: node.to, spec: Decoration.replace({}) });
              }
            }

            // Inline Code
            if (node.name === "InlineCode") {
              if (!isCursorInside) {
                // Hide backticks
                decorations.push({ from: node.from, to: node.from + 1, spec: Decoration.replace({}) });
                decorations.push({ from: node.to - 1, to: node.to, spec: Decoration.replace({}) });
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