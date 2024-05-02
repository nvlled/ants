import Grid, { type Pos } from "./lib/grid";
import { GridStateLoader } from "./lib/grid_loader";
import { throttle } from "./lib/throttle";

console.log("client loaded");
const MouseButton = {
  left: 0,
  middle: 1,
  right: 2,
};

type MouseEventFlags = { shiftKey: boolean; ctrlKey: boolean };

interface InputHandler {
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

class MoveSelectHandler implements InputHandler {
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

  constructor(grid: Grid) {
    this.grid = grid;
  }

  onWheel(step: number) {
    this.grid.scale -= step * 0.1;
    return true;
  }

  onMouseMove(x: number, y: number, dx: number, dy: number) {
    const { mouse, grid } = this;
    if (!mouse.start || !mouse.current) {
      return false;
    }
    mouse.current = [x, y];

    if (mouse.button == MouseButton.middle) {
      grid.origin.x -= dx;
      grid.origin.y -= dy;
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

    if (!cell) {
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
          if (val) {
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
        if (val) {
          ctx.fillStyle = "#0ff9";
          ctx.fillRect(a, b, c, d);
        }
      }
    }
  }
}

class InsertHandler implements InputHandler {
  grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }
  onWheel(step: number): boolean {
    throw new Error("Method not implemented.");
  }
  onMouseMove(x: number, y: number, dx: number, dy: number): boolean {
    throw new Error("Method not implemented.");
  }
  onMouseDown(
    x: number,
    y: number,
    button: number,
    flags: MouseEventFlags
  ): boolean {
    throw new Error("Method not implemented.");
  }
  onMouseUp(x: number, y: number, button: number): boolean {
    throw new Error("Method not implemented.");
  }
  update(): void {
    throw new Error("Method not implemented.");
  }
  draw(ctx: CanvasRenderingContext2D): void {
    throw new Error("Method not implemented.");
  }
}

function main() {
  const bufferCanvas = document.createElement("canvas");
  const canvas = document.querySelector("canvas")!;
  const debug = document.querySelector("#debug");

  if (!canvas || !debug) {
    throw "missing nodes";
  }

  canvas.width = 1200;
  canvas.height = 600;

  bufferCanvas.width = canvas.width;
  bufferCanvas.height = canvas.height;

  const ctx = bufferCanvas.getContext("2d", { alpha: false })!;
  const mainCtx = canvas.getContext("2d", { alpha: false })!;

  if (!ctx || !mainCtx) {
    throw "failed to get canvas contexts";
  }

  //let scale = 1.5;
  const grid = new Grid(100, 100, [
    [[0, 0], 1],
    [[1, 1], 1],
    [[2, 2], 1],
    [[3, 3], 1],
    [[5, 10], 1],
    [[1, 10], 1],
    [[5, 1], 1],
  ]);
  const inputHandler = new MoveSelectHandler(grid);
  const stateLoader = new GridStateLoader();
  stateLoader.restore(grid);

  const saveState = throttle(1000, function () {
    console.log("state saved");
    stateLoader.save(grid);
  });

  function getMousePos(e: MouseEvent) {
    const canvasRect = canvas.getBoundingClientRect();
    const r = canvasRect;
    let [x, y] = [
      (e.clientX - r.left) / grid.scale,
      (e.clientY - r.top) / grid.scale,
    ];
    x = Math.floor(x + grid.origin.x);
    y = Math.floor(y + grid.origin.y);
    return [x, y];
  }

  canvas.onwheel = function (e) {
    e.preventDefault();
    const n = Math.abs(e.deltaY) / e.deltaY;
    inputHandler.onWheel(n);
    saveState();
  };

  canvas.onmousedown = function (e) {
    e.preventDefault();

    const [x, y] = getMousePos(e);
    inputHandler.onMouseDown(x, y, e.button, {
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
    });

    saveState();
  };

  canvas.onmousemove = function (e) {
    const [x, y] = getMousePos(e);
    inputHandler.onMouseMove(x, y, e.movementX, e.movementY);
    saveState();
  };

  document.addEventListener("mouseup", function (ev) {
    const [x, y] = getMousePos(ev);
    inputHandler.onMouseUp(x, y, ev.button);
    saveState();
  });

  function loop() {
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(grid.scale, grid.scale);
    ctx.translate(-grid.origin.x, -grid.origin.y);

    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 2, 2);

    for (const [i, j] of grid.iterateCells()) {
      const [a, b, c, d] = grid.getBoundingRect(i, j);
      const selected = grid.isSelected(i, j);

      const val = grid.getValue(i, j);
      if (val) {
        ctx.fillStyle = "#0f0";
        ctx.fillRect(a, b, c, d);
      }
      ctx.strokeStyle = selected ? "#f00" : "#333";
      ctx.strokeRect(a, b, c, d);
    }

    inputHandler.draw(ctx);

    ctx.restore();

    mainCtx.drawImage(bufferCanvas, 0, 0);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
