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
      e.preventDefault();
      this.onToggle();
    });
    wrap.appendChild(checkbox);
    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
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

class HrWidget extends WidgetType {
  toDOM() {
    const hrContainer = document.createElement("div");
    hrContainer.className = "cm-live-hr-container";
    const hr = document.createElement("hr");
    hrContainer.appendChild(hr);
    return hrContainer;
  }
  ignoreEvent() { return true; }
}


// --- PLUGIN ---

function isNodeActive(view: EditorView, from: number, to: number): boolean {
    const { from: selFrom, to: selTo } = view.state.selection.main;
    return selTo >= from && selFrom <= to;
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
      const builder = new RangeSetBuilder<Decoration>();

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            const nodeIsActive = isNodeActive(view, node.from, node.to);

            if (nodeIsActive) return;

            if (node.name.startsWith("ATXHeading")) {
              const level = parseInt(node.name.replace("ATXHeading", ""), 10);
              builder.add(node.from, node.from + level + 1, Decoration.replace({}));
              builder.add(node.from + level + 1, node.to, Decoration.mark({ class: `cm-live-header cm-live-header-${level}` }));
            }
            else if (node.name === "Emphasis") {
              builder.add(node.from, node.from + 1, Decoration.replace({}));
              builder.add(node.to - 1, node.to, Decoration.replace({}));
              builder.add(node.from + 1, node.to - 1, Decoration.mark({ class: "cm-live-em" }));
            }
            else if (node.name === "StrongEmphasis") {
              builder.add(node.from, node.from + 2, Decoration.replace({}));
              builder.add(node.to - 2, node.to, Decoration.replace({}));
              builder.add(node.from + 2, node.to - 2, Decoration.mark({ class: "cm-live-strong" }));
            }
            else if (node.name === "Strikethrough") {
              builder.add(node.from, node.from + 2, Decoration.replace({}));
              builder.add(node.to - 2, node.to, Decoration.replace({}));
              builder.add(node.from + 2, node.to - 2, Decoration.mark({ class: "cm-live-strikethrough" }));
            }
            else if (node.name === "Blockquote") {
              builder.add(node.from, node.to, Decoration.line({ attributes: { class: "cm-live-blockquote" } }));
            }
            else if (node.name === "HorizontalRule") {
              builder.add(node.from, node.to, Decoration.replace({ widget: new HrWidget() }));
            }
            else if (node.name === "FencedCode") {
              builder.add(node.from, node.to, Decoration.mark({ class: "cm-live-codeblock" }));
            }
            else if (node.name === "InlineCode") {
              builder.add(node.from, node.from + 1, Decoration.replace({}));
              builder.add(node.to - 1, node.to, Decoration.replace({}));
              builder.add(node.from + 1, node.to - 1, Decoration.mark({ class: "cm-live-inline-code" }));
            }
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
                builder.add(taskMarkerNode.from, taskMarkerNode.to, Decoration.replace({ widget: new CheckboxWidget(isChecked, onToggle) }));
              }
              if (isChecked) {
                builder.add(node.from, node.to, Decoration.line({ attributes: { class: "cm-live-task-checked" } }));
              }
              const listMark = node.node.parent?.firstChild;
              if (listMark && listMark.name === "ListMark") {
                builder.add(listMark.from, listMark.to, Decoration.replace({}));
              }
            }
            else if (node.name === "ListItem" && node.node.firstChild?.name !== "Task") {
              const listMark = node.node.firstChild;
              if (listMark) {
                builder.add(listMark.from, listMark.to, Decoration.replace({}));
              }
              if (node.node.parent?.name === "BulletList") {
                builder.add(node.from, node.from, Decoration.widget({ widget: new BulletWidget(), side: -1 }));
              } else if (node.node.parent?.name === "OrderedList") {
                let count = 1;
                let current = node.node.prevSibling;
                while(current) {
                    if (current.name === "ListItem") count++;
                    current = current.prevSibling;
                }
                builder.add(node.from, node.from, Decoration.widget({ widget: new NumberWidget(count), side: -1 }));
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

export const livePreviewPlugin = [livePreviewPluginInstance];