export const ZOOM_STEP = 0.1;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
export const DEFAULT_ZOOM = 1;

export const ELEMENT_HANDLE_SIZE = 8;
export const ELEMENT_PADDING = 4;
export const ROTATION_HANDLE_OFFSET = 20;

export const GRID_SIZE = 20;

export const COLORS = {
  stroke: [
    "#1e1e1e",
    "#e03131",
    "#2f9e44",
    "#1971c2",
    "#f08c00",
    "#7048e8",
    "#e64980",
    "#0c8599",
    "#5f3dc4",
    "#364fc7",
  ],
  fill: [
    "transparent",
    "#ffc9c9",
    "#b2f2bb",
    "#a5d8ff",
    "#ffec99",
    "#d0bfff",
    "#fcc2d7",
    "#99e9f2",
    "#e5dbff",
    "#bac8ff",
    "#fff3bf",
    "#c5f6fa",
    "#d3f9d8",
    "#e7f5ff",
    "#f8f0fc",
    "#fff9db",
  ],
} as const;

export const SHORTCUTS: Record<string, string> = {
  select: "V",
  hand: "H",
  rectangle: "R",
  ellipse: "O",
  diamond: "D",
  cylinder: "Y",
  triangle: "G",
  parallelogram: "I",
  arrow: "A",
  line: "L",
  freedraw: "P",
  text: "T",
  eraser: "E",
};

export const CURSOR_MAP: Record<string, string> = {
  select: "default",
  hand: "grab",
  grabbing: "grabbing",
  rectangle: "crosshair",
  ellipse: "crosshair",
  diamond: "crosshair",
  cylinder: "crosshair",
  triangle: "crosshair",
  parallelogram: "crosshair",
  arrow: "crosshair",
  line: "crosshair",
  freedraw: "crosshair",
  text: "text",
  eraser: "cell",
  image: "crosshair",
  resize: "nwse-resize",
};
