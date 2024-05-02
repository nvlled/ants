import Grid, { type Pos } from "./lib/grid";

console.log("client loaded");
const MouseButton = {
  left: 0,
  middle: 1,
  right: 2,
};

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
  const origin = { x: 0, y: 0 };
  const grid = new Grid(100, 100, [
    [[0, 0], 1],
    [[1, 1], 1],
    [[2, 2], 1],
    [[3, 3], 1],
    [[5, 10], 1],
    [[1, 10], 1],
    [[5, 1], 1],
  ]);

  function getMousePos(e: MouseEvent) {
    const canvasRect = canvas.getBoundingClientRect();
    const r = canvasRect;
    let [x, y] = [
      (e.clientX - r.left) / grid.scale,
      (e.clientY - r.top) / grid.scale,
    ];
    x = Math.floor(x + origin.x);
    y = Math.floor(y + origin.y);
    return [x, y];
  }

  const mouse = {
    start: null as Pos | null,
    current: null as Pos | null,
    button: -1,
    drag: false,
  };

  canvas.onwheel = function (e) {
    e.preventDefault();
    const n = Math.abs(e.deltaY) / e.deltaY;
    //n = Math.abs(n) / n
    grid.scale -= n * 0.1;
    console.log("wheel", e, n, grid.scale);
  };

  canvas.onmousedown = function (e) {
    e.preventDefault();

    const [x, y] = getMousePos(e);
    mouse.start = [x, y];
    mouse.current = [x, y];
    mouse.button = e.button;

    if (e.button != MouseButton.middle) {
      const [i, j] = grid.getCellAt(x, y);

      if (e.shiftKey && grid.getValue(i, j)) {
        //grid.clearSelected()
        //grid.select(i, j)
        //mouse.drag = true
      } else {
        let hasNonEmptySelected = false;
        for (const [i2, j2] of grid.getAllSelected()) {
          if (grid.getValue(i2, j2)) {
            hasNonEmptySelected = true;
            break;
          }
        }
        mouse.drag =
          grid.isSelected(i, j) && hasNonEmptySelected && !e.shiftKey;

        if (!mouse.drag) {
          grid.clearSelected();
        }
      }
    }
  };

  canvas.onmousemove = function (e) {
    if (!mouse.start || !mouse.current) {
      return;
    }

    const [x, y] = getMousePos(e);
    mouse.current = [x, y];

    if (mouse.button == MouseButton.middle) {
      origin.x -= e.movementX;
      origin.y -= e.movementY;
    }
  };

  document.addEventListener("mouseup", function (ev) {
    if (!mouse.start || !mouse.current) {
      return;
    }

    if (ev.button == MouseButton.middle) {
      mouse.start = null;
      mouse.current = null;
      return;
    }

    const [sx, sy] = mouse.start;
    const [x, y] = mouse.current;

    if (mouse.drag) {
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
            console.log(
              { i, j },
              i + di,
              j + dj,
              grid.posToInt(i, j),
              grid.posToInt(i + di, j + dj)
            );
            if (val) {
              grid.setValue(i + di, j + dj, val);
              grid.select(i + di, j + dj);
            }
          }
        }
      }
    } else {
      if (x == sx && y == sy) {
        const [i, j] = grid.getCellAt(x, y);
        grid.select(i, j);
      } else {
        for (const elem of grid.getCellsAt(sx, sy, x, y)) {
          grid.select(elem[0], elem[1]);
        }
      }
    }

    mouse.start = null;
    mouse.current = null;
  });

  function loop() {
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(grid.scale, grid.scale);
    ctx.translate(-origin.x, -origin.y);

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
      ctx.strokeStyle = selected ? "#0ff" : "#333";
      ctx.strokeRect(a, b, c, d);
    }

    if (mouse.button != MouseButton.middle && mouse.start && mouse.current) {
      if (mouse.drag) {
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
      } else {
        const [sx, sy] = mouse.start;
        const [x, y] = mouse.current;
        const w = x - sx;
        const h = y - sy;
        ctx.fillStyle = "#0ff7";
        ctx.fillRect(sx, sy, w, h);
      }
    }

    ctx.restore();

    mainCtx.drawImage(bufferCanvas, 0, 0);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
