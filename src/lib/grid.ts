import sample from "./grid-sample";

// ABCDE
// A - unused
// B - unused
// C - type
// D - color (0-9)
export type CellData = number;

export type CellColorID = number;

export const CellColor: Record<CellData, string> = [
  "#0f0",
  "#00f",
  "red",
  "yellow",
  "cyan",
  "#af00af",
] as const;

CellColor[-1] = "x";

export const CellType = {
  static: 0,
  langton: 1,
  gol: 0,
};

export type Pos = [number, number];

export type PartialGridState = {
  origin: { x: number; y: number };
  scale: number;
  numSelected: number;
};

export type GridObserverListener = (state: PartialGridState) => void;

export class GridObserver {
  #listeners = new Set<GridObserverListener>();
  id = 0;

  constructor(public grid: Grid) {
    this.id = ++GridObserver.idgen;
  }

  update() {
    const state = this.current;
    for (const fn of this.#listeners) {
      fn(state);
    }
  }

  get current(): PartialGridState {
    return {
      origin: { ...this.grid.origin },
      scale: this.grid.scale,
      numSelected: this.grid.selected.size,
    };
  }

  on(fn: GridObserverListener) {
    this.#listeners.add(fn);
  }
  off(fn: GridObserverListener) {
    this.#listeners.delete(fn);
  }

  static idgen = 0;
}

export class Grid {
  pos = { x: 0, y: 0 };

  display = {
    margin: 2,
    rectSize: 10,
  };
  rows = 0;
  cols = 0;
  selected: Set<number> = new Set();
  data: CellData[] = [];

  observer: GridObserver;

  #scale = 1;
  #origin = { x: 0, y: 0 };

  get scale() {
    return this.#scale;
  }
  set scale(value) {
    this.#scale = value;
    this.observer.update();
  }
  get origin() {
    return this.#origin;
  }
  set origin(value) {
    this.#origin = value;
    this.observer.update();
  }

  constructor(rows: number, cols: number, init?: [Pos, number][]) {
    this.rows = rows;
    this.cols = cols;
    this.observer = new GridObserver(this);

    if (init) {
      init.forEach(([pos, val]) => {
        this.setValue(pos[0], pos[1], val);
      });
    }
  }

  posToInt(i: number, j: number) {
    const size = Math.ceil(Math.log10(this.rows * this.cols));
    return i * 10 ** size + j;
  }

  intToPos(index: number): [number, number] {
    const size = Math.ceil(Math.log10(this.rows * this.cols));
    return [Math.floor(index / 10 ** size), index % 10 ** size];
  }

  toggle(i: number, j: number) {
    if (this.isSelected(i, j)) {
      this.deselect(i, j);
    } else {
      this.select(i, j);
    }
  }

  select(i: number, j: number) {
    const index = this.posToInt(i, j);
    if (this.getValue(i, j) != null) {
      this.selected.add(index);
    }
    this.observer.update();
  }

  deselect(i: number, j: number) {
    const index = this.posToInt(i, j);
    this.selected.delete(index);
    this.observer.update();
  }

  isSelected(i: number, j: number) {
    return this.selected.has(this.posToInt(i, j));
  }

  hasSelected() {
    return this.selected.size > 0;
  }

  clearSelected() {
    for (const index of this.selected) {
      this.selected.delete(index);
    }
    this.observer.update();
  }

  *getAllSelected() {
    for (const index of this.selected) {
      yield this.intToPos(index);
    }
  }

  getValue(i: number, j: number) {
    const index = i * this.cols + j;
    return this.data[index];
  }

  setValue(i: number, j: number, val: number | null) {
    if (val && val < 0) val = null;
    if (i > this.rows || j > this.cols || i < 0 || j < 0) {
      return;
    }

    const index = i * this.cols + j;
    if (val == null) delete this.data[index];
    else this.data[index] = val;
  }

  *getCellsAt(x1: number, y1: number, x2: number, y2: number) {
    let [i1, j1] = this.getCellAt(x1, y1);
    let [i2, j2] = this.getCellAt(x2, y2);

    if (i1 > i2) {
      [i1, i2] = [i2, i1];
    }
    if (j1 > j2) {
      [j1, j2] = [j2, j1];
    }

    for (let i = i1; i <= i2; i++) {
      for (let j = j1; j <= j2; j++) {
        yield [i, j];
      }
    }
  }

  getCellAt(x: number, y: number) {
    const disp = this.display;
    const margin = disp.margin / this.scale;
    const n = margin + disp.rectSize;
    const j = Math.floor((x - this.pos.x) / n);
    const i = Math.floor((y - this.pos.y) / n);
    return [i, j];
  }

  getBoundingRect(i: number, j: number) {
    const disp = this.display;
    const margin = disp.margin / this.scale;
    const x = this.pos.x + (margin + disp.rectSize) * j;
    const y = this.pos.y + (margin + disp.rectSize) * i;
    return [x, y, disp.rectSize, disp.rectSize];
  }

  *iterateCells() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        yield [i, j];
      }
    }
  }
}

export default Grid;

const lsKey = "saved-grid";

interface GridData {
  origin: Grid["origin"];
  pos: Grid["pos"];
  data: Grid["data"];
  scale: Grid["scale"];
}

export class GridStateLoader {
  constructor() {}

  restore(grid: Grid) {
    let state: GridData | null = null;
    try {
      state = JSON.parse(localStorage.getItem(lsKey) ?? "") as GridData;
    } catch (e) {
      state = sample as GridData;
      console.log(e);
    }
    if (state) {
      grid.origin = state.origin;
      grid.pos = state.pos;
      grid.data = state.data;
      grid.scale = state.scale;
    }
  }

  save(grid: Grid) {
    const state: GridData = {
      origin: grid.origin,
      pos: grid.pos,
      data: grid.data,
      scale: grid.scale,
    };
    localStorage.setItem(lsKey, JSON.stringify(state));
  }
}
