import type { Config } from "./config";
import Grid, { type CellColorID, type Pos } from "./grid";

let minScale = 0.1;

export const MouseButton = {
  left: 0,
  middle: 1,
  right: 2,
};

export type MouseEventFlags = { shiftKey: boolean; ctrlKey: boolean };

export interface InputHandler {
  onKeyPress(ev: KeyboardEvent): boolean;

  onWheel(step: number): boolean;
  onMouseMove(x: number, y: number, dx: number, dy: number): boolean;
  onMouseDown(
    x: number,
    y: number,
    button: number,
    flags: MouseEventFlags
  ): boolean;
  onMouseUp(x: number, y: number, button: number): boolean;

  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class MoveSelectHandler implements InputHandler {
  grid: Grid;
  mouse = {
    start: null as Pos | null,
    current: null as Pos | null,
    button: -1,
    drag: false,
    shiftKey: false,
    ctrlKey: false,
    areaSelect: false,
  };
  key = {
    shiftKey: false,
    ctrlKey: false,
  };

  constructor(grid: Grid) {
    this.grid = grid;
  }

  onKeyPress(e: KeyboardEvent) {
    const { grid } = this;

    this.key.shiftKey = e.shiftKey;
    this.key.ctrlKey = e.ctrlKey;
    console.log("keypressed", e.key);

    switch (e.key) {
      case "Delete": {
        for (const [i, j] of grid.getAllSelected()) {
          grid.setValue(i, j, null);
        }
        grid.clearSelected();
      }
    }

    return false;
  }

  onWheel(step: number) {
    const { mouse, grid } = this;
    if (mouse.start || mouse.current) {
      return false;
    }

    this.grid.scale -= step * 0.05;
    if (this.grid.scale < minScale) {
      this.grid.scale = minScale;
    }

    return true;
  }

  onMouseMove(x: number, y: number, dx: number, dy: number) {
    const { mouse, grid } = this;
    if (!mouse.start || !mouse.current) {
      return false;
    }
    mouse.current = [x, y];

    if (mouse.button == MouseButton.middle) {
      grid.origin.x -= dx / grid.scale;
      grid.origin.y -= dy / grid.scale;
    }
    return true;
  }

  onMouseDown(x: number, y: number, button: number, flags: MouseEventFlags) {
    const { mouse, grid } = this;
    mouse.start = [x, y];
    mouse.current = [x, y];
    mouse.button = button;
    mouse.shiftKey = flags.shiftKey;
    mouse.ctrlKey = flags.ctrlKey;

    if (button == MouseButton.middle) {
      return false;
    }

    const [i, j] = grid.getCellAt(x, y);
    const cell = grid.getValue(i, j);

    if (cell == null) {
      if (!mouse.shiftKey) grid.clearSelected();
      mouse.areaSelect = true;
      return true;
    }

    if (flags.ctrlKey) {
      grid.toggle(i, j);
      return true;
    }

    if (flags.shiftKey) {
      let min = Infinity;
      let index = -1;
      for (const [i, j] of grid.getAllSelected()) {
        if (min > i + j) {
          min = i + j;
          index = grid.posToInt(i, j);
        }
      }

      if (!isFinite(min)) {
        grid.select(i, j);
      } else {
        grid.clearSelected();
        let [si, sj] = grid.intToPos(index);
        let [ei, ej] = [i, j];
        if (ei < si) [si, ei] = [ei, si];
        if (ej < sj) [sj, ej] = [ej, sj];

        for (let di = si; di <= ei; di++) {
          for (let dj = sj; dj <= ej; dj++) {
            grid.select(di, dj);
          }
        }
      }
      return true;
    }

    if (!grid.isSelected(i, j)) {
      grid.clearSelected();
    }
    grid.select(i, j);
    return true;
  }

  onMouseUp(x: number, y: number, button: number) {
    const { mouse, grid } = this;

    if (!mouse.start || !mouse.current) return false;
    if (mouse.button != button) return false;
    if (mouse.button == MouseButton.middle) {
      this.reset();
      return false;
    }

    const [i, j] = grid.getCellAt(x, y);
    const [sx, sy] = mouse.start;
    const cell = grid.getValue(i, j);

    if (mouse.areaSelect) {
      for (const elem of grid.getCellsAt(sx, sy, x, y)) {
        grid.select(elem[0], elem[1]);
      }
      this.reset();
      return true;
    }

    let [i1, j1] = grid.getCellAt(...mouse.start);
    let [i2, j2] = grid.getCellAt(...mouse.current);
    let [di, dj] = [i2 - i1, j2 - j1];

    if (di != 0 || dj != 0) {
      const selected = [];
      let abort = false;
      for (let [i, j] of grid.getAllSelected()) {
        [i2, j2] = [i + di, j + dj];
        if (i2 < 0 || j2 < 0 || i2 >= grid.rows || j2 >= grid.cols) {
          abort = true;
          break;
        }
        selected.push([i, j, grid.getValue(i, j)]);
        grid.deselect(i, j);
        grid.setValue(i, j, null);
      }

      if (!abort) {
        for (const [i, j, val] of selected) {
          if (val != null) {
            grid.setValue(i + di, j + dj, val);
            grid.select(i + di, j + dj);
          }
        }
      }
    }

    this.reset();
    return true;
  }

  private reset() {
    this.mouse.start = null;
    this.mouse.current = null;
    this.mouse.ctrlKey = false;
    this.mouse.shiftKey = false;
    this.mouse.button = -1;
    this.mouse.areaSelect = false;
  }

  update() {}
  draw(ctx: CanvasRenderingContext2D): void {
    const { mouse, grid } = this;

    if (!mouse.start || !mouse.current || mouse.button == MouseButton.middle)
      return;

    const [sx, sy] = mouse.start;
    const [x, y] = mouse.current;
    if (mouse.areaSelect) {
      const w = x - sx;
      const h = y - sy;
      ctx.fillStyle = "#0ff7";
      ctx.fillRect(sx, sy, w, h);
    } else if (sx != x || sy != y) {
      const [i1, j1] = grid.getCellAt(...mouse.start);
      const [i2, j2] = grid.getCellAt(...mouse.current);
      const [di, dj] = [i2 - i1, j2 - j1];

      for (const [i, j] of grid.getAllSelected()) {
        const [a, b, c, d] = grid.getBoundingRect(i + di, j + dj);

        const val = grid.getValue(i, j);
        if (val != null) {
          ctx.fillStyle = "#0ff9";
          ctx.fillRect(a, b, c, d);
        }
      }
    }
  }
}

export class InsertHandler implements InputHandler {
  mouse = {
    start: null as Pos | null,
    current: null as Pos | null,
    button: -1,
    drag: false,
    shiftKey: false,
    ctrlKey: false,
    areaSelect: false,
    clickNum: 0,
  };

  constructor(public grid: Grid, public config: Config) {}

  onKeyPress(ev: KeyboardEvent): boolean {
    return false;
  }

  onWheel(step: number): boolean {
    this.grid.scale -= step * 0.05;
    if (this.grid.scale < minScale) {
      this.grid.scale = minScale;
    }
    return true;
  }
  onMouseMove(x: number, y: number, dx: number, dy: number): boolean {
    const { mouse, grid, config } = this;
    const { paint } = config;

    if (!mouse.start || !mouse.current) {
      return false;
    }
    mouse.current = [x, y];

    if (mouse.button == MouseButton.middle) {
      grid.origin.x -= dx / grid.scale;
      grid.origin.y -= dy / grid.scale;
      return true;
    }

    if (paint.mode == "erase") {
      const [i, j] = grid.getCellAt(x, y);
      grid.setValue(i, j, null);
    } else if (paint.mode == "brush") {
      const [i, j] = grid.getCellAt(x, y);
      grid.setValue(i, j, this.config.paint.color);
    }

    return true;
  }
  onMouseDown(
    x: number,
    y: number,
    button: number,
    flags: MouseEventFlags
  ): boolean {
    const { mouse, grid, config } = this;
    const { paint } = config;
    mouse.start = [x, y];
    mouse.current = [x, y];
    mouse.button = button;
    mouse.shiftKey = flags.shiftKey;
    mouse.ctrlKey = flags.ctrlKey;

    if (button == MouseButton.middle) {
      return false;
    }

    if (paint.mode == "erase") {
      const [i, j] = grid.getCellAt(x, y);
      grid.setValue(i, j, null);
    } else if (paint.mode == "brush") {
      const [i, j] = grid.getCellAt(x, y);
      grid.setValue(i, j, this.config.paint.color);
    }

    return true;
  }
  onMouseUp(x: number, y: number, button: number): boolean {
    const { mouse, grid, config } = this;
    const { paint } = config;

    if (!mouse.start || !mouse.current) return false;
    if (mouse.button != button) return false;
    if (mouse.button == MouseButton.middle) {
      this.reset();
      return false;
    }

    if (paint.mode == "fill") {
      const [si, sj] = grid.getCellAt(...mouse.start);
      const [i, j] = grid.getCellAt(...mouse.current);
      const startColor = grid.getValue(si, sj);
      this.paintFill(startColor, config.paint.color, i, j);
    }

    this.reset();
    return true;
  }

  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {}

  paintFill(
    findColor: CellColorID,
    replaceWithColor: CellColorID,
    si: number,
    sj: number
  ) {
    const { grid, config } = this;

    const visited = new Set<number>();
    const queue: number[] = [si, sj];

    asyncLoop(4, 60, (o) => {
      o.batchSize = queue.length / 4;
      const i = queue.shift();
      const j = queue.shift();

      if (i == null || j == null) return true;
      if (i < 0 || j < 0) return true;
      if (i >= grid.rows || j >= grid.cols) return true;

      const ij = this.grid.posToInt(i, j);
      if (visited.has(ij)) return true;
      visited.add(ij);

      const val = grid.getValue(i, j);
      if (val != findColor) return true;

      this.grid.setValue(i, j, replaceWithColor);

      queue.push(i + 1, j + 0);
      queue.push(i + 0, j + 1);
      queue.push(i - 1, j + 0);
      queue.push(i + 0, j - 1);

      //queue.push(i + 1, j + 1);
      //queue.push(i + 1, j - 1);
      //queue.push(i - 1, j + 1);
      //queue.push(i - 1, j - 1);

      return true;
    });
  }

  private reset() {
    this.mouse.start = null;
    this.mouse.current = null;
    this.mouse.ctrlKey = false;
    this.mouse.shiftKey = false;
    this.mouse.button = -1;
    this.mouse.areaSelect = false;
  }

  static clickCounter = 0;
}

export class NopHandler implements InputHandler {
  onKeyPress(ev: KeyboardEvent): boolean {
    return false;
  }
  onWheel(step: number): boolean {
    return false;
  }
  onMouseMove(x: number, y: number, dx: number, dy: number): boolean {
    return false;
  }
  onMouseDown(
    x: number,
    y: number,
    button: number,
    flags: MouseEventFlags
  ): boolean {
    return false;
  }
  onMouseUp(x: number, y: number, button: number): boolean {
    return false;
  }
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {}
}

function asyncLoop(
  batchSize: number,
  ms: number,
  fn: (options: { batchSize: number }) => boolean
) {
  const options = { batchSize };
  const id = setInterval(() => {
    for (let i = 0; i < options.batchSize; i++) {
      if (!fn(options)) {
        clearInterval(id);
        break;
      }
    }
  }, ms);
}
