import { EditorView, ViewPlugin, Decoration, ViewUpdate, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

type DecorationSet = ReturnType<RangeSetBuilder<Decoration>["finish"]>;

// --- WIDGETS ---

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly onToggle: () => void) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "cm-live-task-marker";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.checked;
    checkbox.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent editor from losing focus
      this.onToggle();
    });
    wrap.appendChild(checkbox);
    return wrap;
  }

  ignoreEvent(): boolean {
    return false; // We want to handle the click event
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const bullet = document.createElement("span");
    bullet.className = "cm-live-bullet";
    bullet.textContent = "•";
    return bullet;
  }
  ignoreEvent() { return true; }
}

class NumberWidget extends WidgetType {
    constructor(readonly number: number) { super(); }
    toDOM() {
        const num = document.createElement("span");
        num.className = "cm-live-number";
        num.textContent = `${this.number}.`;
        return num;
    }
    ignoreEvent() { return true; }
}


// --- PLUGIN ---

// Helper to check if the cursor is on the same line as the node
function isCursorOnLine(view: EditorView, from: number, to: number): boolean {
  const { from: selectionFrom, to: selectionTo } = view.state.selection.main;
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
              decorations.push({ from: node.from + level + 1, to: node.to, spec: Decoration.mark({ class: `cm-live-header cm-live-header-${level}` }) });
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
            // Task Lists
            else if (node.name === "Task") {
              const isChecked = view.state.doc.sliceString(node.from, node.to).includes("[x]");
              const taskMarkerNode = node.node.getChild("TaskMarker");
              if (taskMarkerNode) {
                const onToggle = () => {
                  const newMarker = isChecked ? "[ ]" : "[x]";
                  view.dispatch({
                    changes: { from: taskMarkerNode.from, to: taskMarkerNode.to, insert: newMarker }
                  });
                };
                decorations.push({ from: taskMarkerNode.from, to: taskMarkerNode.to, spec: Decoration.replace({ widget: new CheckboxWidget(isChecked, onToggle) }) });
              }
              if (isChecked) {
                decorations.push({ from: node.from, to: node.to, spec: Decoration.line({ attributes: { class: "cm-live-task-checked" } }) });
              }
              // Hide the list marker (e.g., '-')
              const listMark = node.node.parent?.firstChild;
              if (listMark && listMark.name === "ListMark") {
                decorations.push({ from: listMark.from, to: listMark.to, spec: Decoration.replace({}) });
              }
            }
            // Regular Lists
            else if (node.name === "ListItem" && node.node.firstChild?.name !== "Task") {
              const listMark = node.node.firstChild;
              if (listMark) {
                decorations.push({ from: listMark.from, to: listMark.to, spec: Decoration.replace({}) });
              }
              if (node.node.parent?.name === "BulletList") {
                decorations.push({ from: node.from, to: node.from, spec: Decoration.widget({ widget: new BulletWidget(), side: -1 }) });
              } else if (node.node.parent?.name === "OrderedList") {
                let count = 1;
                let current = node.node.prevSibling;
                while(current) {
                    if (current.name === "ListItem") count++;
                    current = current.prevSibling;
                }
                decorations.push({ from: node.from, to: node.from, spec: Decoration.widget({ widget: new NumberWidget(count), side: -1 }) });
              }
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