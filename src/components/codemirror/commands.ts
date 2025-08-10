import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

const toggleSurrounding = (view: EditorView, chars: string): boolean => {
  const { state, dispatch } = view;

  const changes = state.changeByRange(range => {
    const { from, to } = range;
    const text = state.sliceDoc(from, to);
    
    const isWrapped = state.sliceDoc(from - chars.length, from) === chars && state.sliceDoc(to, to + chars.length) === chars;

    if (isWrapped) {
      return {
        changes: { from: from - chars.length, to: to + chars.length, insert: text },
        range: EditorSelection.range(from - chars.length, to - chars.length)
      };
    } else {
      return {
        changes: { from, to, insert: `${chars}${text}${chars}` },
        range: EditorSelection.range(from + chars.length, to + chars.length)
      };
    }
  });

  dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
  
  return true;
};

export const toggleBold = (view: EditorView): boolean => toggleSurrounding(view, "**");
export const toggleItalic = (view: EditorView): boolean => toggleSurrounding(view, "*");