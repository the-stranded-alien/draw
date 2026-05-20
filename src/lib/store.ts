import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import {
  ExcalidrawElement,
  ToolType,
  StyleProps,
  AppState,
  DEFAULT_STROKE_COLOR,
  DEFAULT_BACKGROUND_COLOR,
  CANVAS_BACKGROUND_LIGHT,
} from "./types";

interface HistoryEntry {
  elements: ExcalidrawElement[];
}

interface DrawStore {
  elements: ExcalidrawElement[];
  appState: AppState;
  history: HistoryEntry[];
  historyIndex: number;
  currentStyle: StyleProps;

  // Element actions
  addElement: (element: ExcalidrawElement) => void;
  updateElement: (id: string, updates: Partial<ExcalidrawElement>) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;

  // App state
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number, center?: { x: number; y: number }) => void;
  setScroll: (scrollX: number, scrollY: number) => void;
  toggleTheme: () => void;
  toggleGrid: () => void;
  setSelectedElements: (ids: string[]) => void;
  clearSelection: () => void;
  setEditingElement: (element: ExcalidrawElement | null) => void;
  setDraggingElement: (element: ExcalidrawElement | null) => void;

  // Style
  setCurrentStyle: (style: Partial<StyleProps>) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Canvas
  resetCanvas: () => void;
}

const defaultAppState: AppState = {
  zoom: { value: 1 },
  scrollX: 0,
  scrollY: 0,
  theme: "light",
  viewBackgroundColor: CANVAS_BACKGROUND_LIGHT,
  gridSize: null,
  showGrid: false,
  activeTool: "select",
  selectedElementIds: {},
  editingElement: null,
  draggingElement: null,
  resizingElement: null,
  multiElement: null,
  isResizing: false,
  isDragging: false,
  cursorButton: "up",
  gestureScale: 1,
  previousSelectedElementIds: {},
  shouldCacheIgnoreZoom: false,
};

const defaultStyle: StyleProps = {
  strokeColor: DEFAULT_STROKE_COLOR,
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  fillStyle: "hachure",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
};

export const useDrawStore = create<DrawStore>()(
  immer((set, get) => ({
    elements: [],
    appState: defaultAppState,
    history: [{ elements: [] }],
    historyIndex: 0,
    currentStyle: defaultStyle,

    addElement: (element) => {
      set((state) => {
        state.elements.push(element);
      });
      // Do NOT push history here — the element has zero size at this point.
      // History is committed by the caller (onPointerUp) once the draw is complete.
    },

    updateElement: (id, updates) => {
      set((state) => {
        const idx = state.elements.findIndex((el) => el.id === id);
        if (idx !== -1) {
          Object.assign(state.elements[idx], updates, {
            version: state.elements[idx].version + 1,
          });
        }
      });
    },

    deleteElements: (ids) => {
      const idSet = new Set(ids);
      set((state) => {
        state.elements = state.elements.filter((el) => !idSet.has(el.id));
        state.appState.selectedElementIds = {};
      });
      get().pushHistory();
    },

    duplicateElements: (ids) => {
      const idSet = new Set(ids);
      const newIds: string[] = [];
      set((state) => {
        const toDuplicate = state.elements.filter((el) => idSet.has(el.id));
        const clones = toDuplicate.map((el) => {
          const newId = nanoid();
          newIds.push(newId);
          return { ...el, id: newId, x: el.x + 10, y: el.y + 10, version: 1 };
        });
        state.elements.push(...clones);
        const newSelected: Record<string, boolean> = {};
        newIds.forEach((id) => (newSelected[id] = true));
        state.appState.selectedElementIds = newSelected;
      });
      get().pushHistory();
    },

    setTool: (tool) => {
      set((state) => {
        state.appState.activeTool = tool;
        state.appState.selectedElementIds = {};
        state.appState.editingElement = null;
      });
    },

    setZoom: (zoom, center) => {
      set((state) => {
        const prevZoom = state.appState.zoom.value;
        const newZoom = Math.min(Math.max(zoom, 0.1), 30);
        if (center) {
          state.appState.scrollX =
            center.x - (center.x - state.appState.scrollX) * (newZoom / prevZoom);
          state.appState.scrollY =
            center.y - (center.y - state.appState.scrollY) * (newZoom / prevZoom);
        }
        state.appState.zoom = { value: newZoom };
      });
    },

    setScroll: (scrollX, scrollY) => {
      set((state) => {
        state.appState.scrollX = scrollX;
        state.appState.scrollY = scrollY;
      });
    },

    toggleTheme: () => {
      set((state) => {
        state.appState.theme =
          state.appState.theme === "light" ? "dark" : "light";
        state.appState.viewBackgroundColor =
          state.appState.theme === "dark" ? "#121212" : CANVAS_BACKGROUND_LIGHT;
      });
    },

    toggleGrid: () => {
      set((state) => {
        state.appState.showGrid = !state.appState.showGrid;
        state.appState.gridSize = state.appState.showGrid ? 20 : null;
      });
    },

    setSelectedElements: (ids) => {
      set((state) => {
        const selected: Record<string, boolean> = {};
        ids.forEach((id) => (selected[id] = true));
        state.appState.selectedElementIds = selected;
      });
    },

    clearSelection: () => {
      set((state) => {
        state.appState.selectedElementIds = {};
      });
    },

    setEditingElement: (element) => {
      set((state) => {
        state.appState.editingElement = element;
      });
    },

    setDraggingElement: (element) => {
      set((state) => {
        state.appState.draggingElement = element;
      });
    },

    setCurrentStyle: (style) => {
      set((state) => {
        Object.assign(state.currentStyle, style);
      });
    },

    pushHistory: () => {
      set((state) => {
        const entry: HistoryEntry = {
          elements: JSON.parse(JSON.stringify(state.elements)),
        };
        // Truncate forward history when new action is taken
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(entry);
        state.historyIndex = state.history.length - 1;
      });
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          state.elements = JSON.parse(
            JSON.stringify(state.history[state.historyIndex].elements)
          );
          state.appState.selectedElementIds = {};
        }
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          state.elements = JSON.parse(
            JSON.stringify(state.history[state.historyIndex].elements)
          );
          state.appState.selectedElementIds = {};
        }
      });
    },

    resetCanvas: () => {
      set((state) => {
        state.elements = [];
        state.appState = { ...defaultAppState };
        state.history = [{ elements: [] }];
        state.historyIndex = 0;
      });
    },
  }))
);
