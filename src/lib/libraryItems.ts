// Pre-built library items loaded into the Excalidraw library panel on startup.
// Shapes use only standard Excalidraw element types (rectangle, ellipse, diamond,
// line, arrow, text) so they render without any custom element API.

let _c = 0;
const uid   = () => `lib-${(++_c).toString(36).padStart(5, "0")}`;
const vseed = () => (_c * 1_234_567 + 98_765) % 2_147_483_647;
const UPDATED = 1_700_000_000_000;

type Opts = Record<string, unknown>;

function base(type: string, x: number, y: number, w: number, h: number, opts: Opts = {}) {
  return {
    id: uid(), type, x, y, width: w, height: h,
    angle: 0,
    strokeColor:     "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle:       "hachure",
    strokeWidth:     1,
    strokeStyle:     "solid",
    roughness:       1,
    opacity:         100,
    seed: vseed(), version: 1, versionNonce: vseed(),
    isDeleted: false, groupIds: [], frameId: null,
    boundElements: null, updated: UPDATED, link: null, locked: false,
    ...opts,
  };
}

const R = (x: number, y: number, w: number, h: number, o: Opts = {}) => base("rectangle", x, y, w, h, o);
const E = (x: number, y: number, w: number, h: number, o: Opts = {}) => base("ellipse",   x, y, w, h, o);
const D = (x: number, y: number, w: number, h: number, o: Opts = {}) => base("diamond",   x, y, w, h, o);

function L(pts: [number, number][], o: Opts = {}) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return {
    ...base("line", x, y, Math.max(...xs)-x||1, Math.max(...ys)-y||1, o),
    points: pts.map(([px,py]): [number,number] => [px-x, py-y]),
    startArrowhead: null, endArrowhead: null,
    startBinding: null,   endBinding: null,
    lastCommittedPoint: null, elbowed: false,
  };
}

function A(pts: [number, number][], o: Opts = {}) {
  return { ...L(pts, o), type: "arrow", endArrowhead: "arrow" };
}

function T(txt: string, x: number, y: number, w: number, h: number, o: Opts = {}) {
  const { fontSize = 14, textAlign = "center", ...rest } = o;
  return {
    ...base("text", x, y, w, h, { fillStyle: "none", backgroundColor: "transparent", ...rest }),
    text: txt, originalText: txt,
    fontSize, fontFamily: 1, textAlign, verticalAlign: "middle",
    lineHeight: 1.25, containerId: null, autoResize: true,
  };
}

function item(id: string, els: ReturnType<typeof base>[]) {
  return { id, status: "published" as const, elements: els };
}

// ── Palette ──────────────────────────────────────────────────────────────────
const BLUE   = "#a5d8ff";
const GREEN  = "#b2f2bb";
const RED    = "#ffc9c9";
const YELLOW = "#ffec99";
const PURPLE = "#d0bfff";
const GRAY   = "#ced4da";
const ORANGE = "#ffd8a8";
const TEAL   = "#96f2d7";
const S = "solid" as const;

// ── SHAPES ───────────────────────────────────────────────────────────────────

const cloud = item("shape-cloud", [
  E( 30, 30, 100, 65, { backgroundColor: BLUE, fillStyle: S }),
  E(  0, 40,  75, 55, { backgroundColor: BLUE, fillStyle: S }),
  E(100, 40,  75, 55, { backgroundColor: BLUE, fillStyle: S }),
  E( 20, 10,  80, 65, { backgroundColor: BLUE, fillStyle: S }),
  E( 82, 10,  80, 65, { backgroundColor: BLUE, fillStyle: S }),
]);

const cylinder = item("shape-cylinder", [
  R(0, 25, 120, 90, { backgroundColor: BLUE, fillStyle: S }),
  E(0,  0, 120, 50, { backgroundColor: BLUE, fillStyle: S }),
  E(0, 90, 120, 50, { backgroundColor: "transparent", fillStyle: "none" }),
]);

const actor = item("shape-actor", [
  E( 18, 0, 28, 28, { backgroundColor: GRAY, fillStyle: S }),
  L([[32, 28], [32, 75]]),
  L([[ 6, 52], [58, 52]]),
  L([[32, 75], [ 8, 110]]),
  L([[32, 75], [56, 110]]),
]);

// Server rack — three shelves
const serverRack = item("shape-server", [
  R(0, 0, 140, 120, { backgroundColor: PURPLE, fillStyle: S }),
  L([[0, 40], [140, 40]]),
  L([[0, 80], [140, 80]]),
  R(8, 8, 10, 24, { backgroundColor: GREEN,  fillStyle: S }),
  R(8, 48, 10, 24, { backgroundColor: YELLOW, fillStyle: S }),
  R(8, 88, 10, 24, { backgroundColor: GREEN,  fillStyle: S }),
  T("Web Server", 0, 0, 140, 40, { fontSize: 12 }),
]);

// ── SYSTEM DESIGN ─────────────────────────────────────────────────────────────

const client = item("sysdesign-client", [
  R(10, 0, 100, 70, { backgroundColor: BLUE, fillStyle: S }),
  R( 0, 70, 120, 10, { backgroundColor: GRAY, fillStyle: S }),
  L([[20, 80], [100, 80]]),
  T("Client", 10, 20, 100, 30, { fontSize: 15 }),
]);

const loadBalancer = item("sysdesign-lb", [
  D(0, 0, 150, 80, { backgroundColor: GREEN, fillStyle: S }),
  T("Load Balancer", 15, 20, 120, 40, { fontSize: 13 }),
]);

const appServer = item("sysdesign-app-server", [
  R(0, 0, 150, 80, { backgroundColor: PURPLE, fillStyle: S }),
  R(0, 0, 150, 26, { backgroundColor: "#b197fc", fillStyle: S }),
  T("App Server", 0, 0, 150, 26, { fontSize: 13 }),
]);

const dbPrimary = item("sysdesign-db-primary", [
  R(0, 28, 130, 88, { backgroundColor: BLUE, fillStyle: S }),
  E(0,  4, 130, 50, { backgroundColor: BLUE, fillStyle: S }),
  E(0, 90, 130, 50, { backgroundColor: "transparent", fillStyle: "none" }),
  T("DB (Primary)", 0, 48, 130, 30, { fontSize: 12 }),
]);

const dbReplica = item("sysdesign-db-replica", [
  R(0, 28, 130, 88, { backgroundColor: "#d0ebff", fillStyle: S }),
  E(0,  4, 130, 50, { backgroundColor: "#d0ebff", fillStyle: S }),
  E(0, 90, 130, 50, { backgroundColor: "transparent", fillStyle: "none" }),
  T("DB (Replica)", 0, 48, 130, 30, { fontSize: 12 }),
]);

const cache = item("sysdesign-cache", [
  R(0, 0, 150, 75, { backgroundColor: RED, fillStyle: S }),
  R(0, 0, 150, 26, { backgroundColor: "#ffa8a8", fillStyle: S }),
  T("Redis Cache", 0, 0, 150, 26, { fontSize: 13 }),
  T("in-memory store", 0, 36, 150, 30, { fontSize: 11, strokeColor: "#c92a2a" }),
]);

const messageQueue = item("sysdesign-queue", [
  R(0, 0, 220, 65, { backgroundColor: YELLOW, fillStyle: S }),
  L([[44, 0],  [44, 65]]),
  L([[88, 0],  [88, 65]]),
  L([[132, 0], [132, 65]]),
  L([[176, 0], [176, 65]]),
  T("Message Queue", 0, 20, 220, 25, { fontSize: 13 }),
]);

const cdn = item("sysdesign-cdn", [
  E( 30, 30, 100, 65, { backgroundColor: GREEN, fillStyle: S }),
  E(  0, 40,  75, 55, { backgroundColor: GREEN, fillStyle: S }),
  E(100, 40,  75, 55, { backgroundColor: GREEN, fillStyle: S }),
  E( 20, 10,  80, 65, { backgroundColor: GREEN, fillStyle: S }),
  E( 82, 10,  80, 65, { backgroundColor: GREEN, fillStyle: S }),
  T("CDN", 30, 35, 110, 40, { fontSize: 18 }),
]);

const apiGateway = item("sysdesign-api-gateway", [
  R(0, 0, 165, 75, { backgroundColor: ORANGE, fillStyle: S }),
  R(0, 0, 165, 26, { backgroundColor: "#ffc078", fillStyle: S }),
  T("API Gateway", 0, 0, 165, 26, { fontSize: 13 }),
  T("/api/v1/*", 0, 36, 165, 30, { fontSize: 11, strokeColor: "#e67700" }),
]);

const microservice = item("sysdesign-microservice", [
  R(0, 0, 140, 75, { backgroundColor: TEAL, fillStyle: S }),
  R(0, 0, 140, 26, { backgroundColor: "#63e6be", fillStyle: S }),
  T("Microservice", 0, 0, 140, 26, { fontSize: 13 }),
  T("REST / gRPC", 0, 36, 140, 30, { fontSize: 11, strokeColor: "#087f5b" }),
]);

// ── DATA STRUCTURES ─────────────────────────────────────────────────────────

const array = item("ds-array", [
  R(  0, 0, 52, 52, { backgroundColor: BLUE,  fillStyle: S }),
  R( 52, 0, 52, 52, { backgroundColor: BLUE,  fillStyle: S }),
  R(104, 0, 52, 52, { backgroundColor: RED,   fillStyle: S }),
  R(156, 0, 52, 52, { backgroundColor: BLUE,  fillStyle: S }),
  R(208, 0, 52, 52, { backgroundColor: BLUE,  fillStyle: S }),
  T("12", 0,   0, 52, 52, { fontSize: 16 }),
  T("4",  52,  0, 52, 52, { fontSize: 16 }),
  T("7",  104, 0, 52, 52, { fontSize: 16, strokeColor: "#c92a2a" }),
  T("19", 156, 0, 52, 52, { fontSize: 16 }),
  T("3",  208, 0, 52, 52, { fontSize: 16 }),
  T("[0]", 0,   54, 52, 18, { fontSize: 9,  strokeColor: "#868e96" }),
  T("[1]", 52,  54, 52, 18, { fontSize: 9,  strokeColor: "#868e96" }),
  T("[2]", 104, 54, 52, 18, { fontSize: 9,  strokeColor: "#c92a2a" }),
  T("[3]", 156, 54, 52, 18, { fontSize: 9,  strokeColor: "#868e96" }),
  T("[4]", 208, 54, 52, 18, { fontSize: 9,  strokeColor: "#868e96" }),
]);

const linkedList = item("ds-linked-list", [
  // Node 1
  R(  0, 8, 90, 50, { backgroundColor: BLUE, fillStyle: S }),
  L([[62, 8], [62, 58]]),
  T("42",    0, 8, 62, 50, { fontSize: 15 }),
  T("next",  62, 8, 28, 50, { fontSize: 9, strokeColor: "#555" }),
  // Node 2
  A([[90, 33], [130, 33]]),
  R(130, 8, 90, 50, { backgroundColor: BLUE, fillStyle: S }),
  L([[192, 8], [192, 58]]),
  T("17",   130, 8, 62, 50, { fontSize: 15 }),
  T("next", 192, 8, 28, 50, { fontSize: 9, strokeColor: "#555" }),
  // Node 3
  A([[220, 33], [260, 33]]),
  R(260, 8, 90, 50, { backgroundColor: BLUE, fillStyle: S }),
  L([[322, 8], [322, 58]]),
  T("9",    260, 8, 62, 50, { fontSize: 15 }),
  T("null", 322, 8, 28, 50, { fontSize: 8, strokeColor: "#868e96" }),
  // Head label
  T("head", 15, 0, 60, 10, { fontSize: 9, strokeColor: "#2b8a3e" }),
]);

const binaryTree = item("ds-binary-tree", [
  // Root
  E(115, 0, 50, 42, { backgroundColor: RED,   fillStyle: S }),
  T("8", 115, 0, 50, 42, { fontSize: 18 }),
  // Level 2
  E( 40, 85, 50, 42, { backgroundColor: BLUE,  fillStyle: S }),
  T("3",  40, 85, 50, 42, { fontSize: 18 }),
  E(190, 85, 50, 42, { backgroundColor: BLUE,  fillStyle: S }),
  T("10", 190, 85, 50, 42, { fontSize: 18 }),
  // Level 3
  E(  5, 170, 50, 42, { backgroundColor: GREEN, fillStyle: S }),
  T("1",   5, 170, 50, 42, { fontSize: 18 }),
  E( 75, 170, 50, 42, { backgroundColor: GREEN, fillStyle: S }),
  T("6",  75, 170, 50, 42, { fontSize: 18 }),
  E(215, 170, 50, 42, { backgroundColor: GREEN, fillStyle: S }),
  T("14",215, 170, 50, 42, { fontSize: 18 }),
  // Edges
  L([[140, 42], [ 65, 85]]),
  L([[140, 42], [215, 85]]),
  L([[ 65, 127], [ 30, 170]]),
  L([[ 65, 127], [100, 170]]),
  L([[215, 127], [240, 170]]),
]);

const stack = item("ds-stack", [
  R(0,   0, 130, 44, { backgroundColor: RED,   fillStyle: S }),
  R(0,  44, 130, 44, { backgroundColor: BLUE,  fillStyle: S }),
  R(0,  88, 130, 44, { backgroundColor: BLUE,  fillStyle: S }),
  R(0, 132, 130, 44, { backgroundColor: GRAY,  fillStyle: S }),
  T("data ← top", 0,   0, 130, 44, { fontSize: 13 }),
  T("data",        0,  44, 130, 44, { fontSize: 13 }),
  T("data",        0,  88, 130, 44, { fontSize: 13 }),
  T("...",         0, 132, 130, 44, { fontSize: 15, strokeColor: "#868e96" }),
  A([[150, 20], [175, 20]]),
  T("push", 150,  0, 40, 20, { fontSize: 10, strokeColor: "#2b8a3e" }),
  A([[175, 44], [150, 44]]),
  T("pop",  150, 44, 40, 20, { fontSize: 10, strokeColor: "#c92a2a" }),
]);

const queue = item("ds-queue", [
  R(  0, 8, 55, 50, { backgroundColor: GREEN,  fillStyle: S }),
  R( 55, 8, 55, 50, { backgroundColor: BLUE,   fillStyle: S }),
  R(110, 8, 55, 50, { backgroundColor: BLUE,   fillStyle: S }),
  R(165, 8, 55, 50, { backgroundColor: BLUE,   fillStyle: S }),
  R(220, 8, 55, 50, { backgroundColor: RED,    fillStyle: S }),
  T("in",  0,   8, 55, 50, { fontSize: 12, strokeColor: "#2b8a3e" }),
  T("",    55,  8, 55, 50, { fontSize: 12 }),
  T("",   110,  8, 55, 50, { fontSize: 12 }),
  T("",   165,  8, 55, 50, { fontSize: 12 }),
  T("out",220,  8, 55, 50, { fontSize: 12, strokeColor: "#c92a2a" }),
  A([[-50, 33], [0, 33]]),
  T("enqueue", -65, 8, 70, 20, { fontSize: 9, strokeColor: "#2b8a3e" }),
  A([[275, 33], [320, 33]]),
  T("dequeue", 275, 8, 70, 20, { fontSize: 9, strokeColor: "#c92a2a" }),
]);

const hashMap = item("ds-hashmap", [
  // Bucket array
  R(0,  0,  90, 44), T("0 →", 0,  0,  90, 44, { fontSize: 12 }),
  R(0,  44, 90, 44), T("1 →", 0,  44, 90, 44, { fontSize: 12 }),
  R(0,  88, 90, 44, { backgroundColor: BLUE, fillStyle: S }), T("2 →", 0, 88, 90, 44, { fontSize: 12 }),
  R(0, 132, 90, 44), T("3 →", 0, 132, 90, 44, { fontSize: 12 }),
  R(0, 176, 90, 44, { backgroundColor: BLUE, fillStyle: S }), T("4 →", 0, 176, 90, 44, { fontSize: 12 }),
  // Chained nodes
  R(110, 88, 80, 44, { backgroundColor: BLUE, fillStyle: S }),  T("k:v", 110, 88, 80, 44, { fontSize: 13 }),
  R(110, 176, 80, 44, { backgroundColor: BLUE, fillStyle: S }), T("k:v", 110, 176, 80, 44, { fontSize: 13 }),
  R(210, 176, 80, 44, { backgroundColor: BLUE, fillStyle: S }), T("k:v", 210, 176, 80, 44, { fontSize: 13 }),
  A([[90, 110], [110, 110]]),
  A([[90, 198], [110, 198]]),
  A([[190, 198], [210, 198]]),
]);

// ── INTERVIEW TEMPLATES ───────────────────────────────────────────────────────

const systemDesignTemplate = item("tpl-system-design", [
  // Outer border
  R(0, 0, 940, 600, { strokeStyle: "dashed", strokeColor: "#868e96", roughness: 0 }),
  // Title bar
  R(0, 0, 940, 48, { backgroundColor: "#f1f3f5", fillStyle: S, roughness: 0, strokeColor: "#dee2e6" }),
  T("System Design: ________________________", 0, 0, 940, 48, { fontSize: 18 }),
  // Zones (row 1)
  R(16,  60, 170, 110, { backgroundColor: "#e3fafc", fillStyle: S, roughness: 0, strokeColor: "#74c0fc" }),
  T("Clients",      16,  60, 170, 28, { fontSize: 12, strokeColor: "#1971c2" }),
  R(216, 60, 140, 110, { backgroundColor: "#ebfbee", fillStyle: S, roughness: 0, strokeColor: "#8ce99a" }),
  T("Load Balancer", 216, 60, 140, 28, { fontSize: 12, strokeColor: "#2b8a3e" }),
  R(386, 60, 210, 110, { backgroundColor: "#f3f0ff", fillStyle: S, roughness: 0, strokeColor: "#b197fc" }),
  T("App / Web Servers", 386, 60, 210, 28, { fontSize: 12, strokeColor: "#5f3dc4" }),
  R(626, 60, 298, 110, { backgroundColor: "#e3fafc", fillStyle: S, roughness: 0, strokeColor: "#74c0fc" }),
  T("Databases",     626, 60, 298, 28, { fontSize: 12, strokeColor: "#1971c2" }),
  // Arrows row 1
  A([[186, 115], [216, 115]]),
  A([[356, 115], [386, 115]]),
  A([[596, 115], [626, 115]]),
  // Zone row 2
  R(16,  196, 170, 80, { backgroundColor: "#ebfbee", fillStyle: S, roughness: 0, strokeColor: "#8ce99a" }),
  T("CDN",          16, 196, 170, 80, { fontSize: 16, strokeColor: "#2b8a3e" }),
  R(216, 196, 708, 80, { backgroundColor: "#fff9db", fillStyle: S, roughness: 0, strokeColor: "#ffd43b" }),
  T("Cache Layer  (Redis / Memcached)", 216, 196, 708, 80, { fontSize: 14, strokeColor: "#e67700" }),
  // Zone row 3
  R(16,  306, 430, 80, { backgroundColor: "#fff9db", fillStyle: S, roughness: 0, strokeColor: "#ffd43b" }),
  T("Message Queue  (Kafka / RabbitMQ)", 16, 306, 430, 80, { fontSize: 13, strokeColor: "#e67700" }),
  R(476, 306, 448, 80, { backgroundColor: "#e3fafc", fillStyle: S, roughness: 0, strokeColor: "#74c0fc" }),
  T("Object Storage  (S3 / GCS)", 476, 306, 448, 80, { fontSize: 14, strokeColor: "#1971c2" }),
  // Notes
  R(0, 414, 940, 186, { backgroundColor: "#f8f9fa", fillStyle: S, roughness: 0, strokeColor: "#dee2e6" }),
  T("Notes / Bottlenecks / Trade-offs", 0, 414, 940, 36, { fontSize: 13, strokeColor: "#868e96" }),
]);

const codingTemplate = item("tpl-coding", [
  R(0, 0, 720, 460, { strokeStyle: "dashed", strokeColor: "#868e96", roughness: 0 }),
  // Header
  R(0, 0, 720, 44, { backgroundColor: "#f1f3f5", fillStyle: S, roughness: 0, strokeColor: "#dee2e6" }),
  T("Problem: ________________________", 0, 0, 720, 44, { fontSize: 16 }),
  // Examples panel
  R(0, 52, 350, 170, { backgroundColor: "#fff9db", fillStyle: S, roughness: 0, strokeColor: "#ffd43b" }),
  T("Examples / Test Cases", 0, 52, 350, 28, { fontSize: 13, strokeColor: "#e67700" }),
  T("Input:     ___\nOutput:   ___\nEdge cases: ___", 12, 88, 326, 128, { fontSize: 12, strokeColor: "#555", textAlign: "left" }),
  // Approach panel
  R(370, 52, 350, 170, { backgroundColor: "#ebfbee", fillStyle: S, roughness: 0, strokeColor: "#8ce99a" }),
  T("Approach", 370, 52, 350, 28, { fontSize: 13, strokeColor: "#2b8a3e" }),
  T("Time: O(?)   Space: O(?)\n\n1. ___\n2. ___", 382, 88, 326, 128, { fontSize: 12, strokeColor: "#2b8a3e", textAlign: "left" }),
  // Whiteboard scratch
  R(0, 240, 720, 220, { backgroundColor: "#f8f9fa", fillStyle: S, roughness: 0, strokeColor: "#dee2e6" }),
  T("Scratch Space", 0, 240, 720, 28, { fontSize: 13, strokeColor: "#868e96" }),
]);

// ── Export ────────────────────────────────────────────────────────────────────

export const LIBRARY_ITEMS = [
  // Shapes
  cloud, cylinder, actor, serverRack,
  // System design
  client, loadBalancer, appServer,
  dbPrimary, dbReplica, cache, messageQueue, cdn, apiGateway, microservice,
  // Data structures
  array, linkedList, binaryTree, stack, queue, hashMap,
  // Templates
  systemDesignTemplate, codingTemplate,
];
