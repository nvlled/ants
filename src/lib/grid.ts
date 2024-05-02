export type Pos = [number, number];

export class Grid {
  pos = { x: 0, y: 0 };

  scale = 1;
  origin = { x: 0, y: 0 };

  display = {
    margin: 0,
    rectSize: 10,
  };
  rows = 0;
  cols = 0;
  selected: Set<number> = new Set();
  data: number[] = [];

  constructor(rows: number, cols: number, init: [Pos, number][]) {
    this.rows = rows;
    this.cols = cols;

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

  intToPos(index: number) {
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
    if (this.getValue(i, j)) {
      this.selected.add(index);
    }
  }

  deselect(i: number, j: number) {
    const index = this.posToInt(i, j);
    this.selected.delete(index);
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
