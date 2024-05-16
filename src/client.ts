import Grid, { type Pos, GridStateLoader, CellColor } from "./lib/grid";
import { createRoot } from "react-dom/client";
import { Settings, mountSettings } from "./lib/settings";
import { throttle } from "./lib/throttle";
import { createConfigStore, type Config } from "./lib/config";
import {
  InsertHandler,
  MoveSelectHandler,
  NopHandler,
} from "./lib/input-handler";

function main() {
  const sidebar = document.querySelector(
    "#sidebar-container"
  ) as HTMLDivElement;
  if (!sidebar) {
    throw "sidebar not found";
  }

  const configStore = createConfigStore();

  try {
    const config = JSON.parse(localStorage.getItem("config") ?? "");
    configStore.replace(config);
  } catch (e) {
    console.log("failed to read saved config", e);
  }

  configStore.on(function (config) {
    localStorage.setItem("config", JSON.stringify(config));
  });

  mountSettings(configStore, sidebar);

  const bufferCanvas = document.createElement("canvas");
  const canvas = document.querySelector("canvas")!;
  const debug = document.querySelector("#debug");
  const numSelected = document.querySelector("#selected-count");

  if (!canvas || !debug || !numSelected) {
    throw "missing nodes";
  }

  let [cwidth, cheight, aspw, asph] = getCanvasSize(canvas, 720);
  canvas.width = cwidth;
  canvas.height = cheight;
  bufferCanvas.width = canvas.width;
  bufferCanvas.height = canvas.height;

  const ctx = bufferCanvas.getContext("2d", { alpha: false })!;
  const mainCtx = canvas.getContext("2d", { alpha: false })!;

  if (!ctx || !mainCtx) {
    throw "failed to get canvas contexts";
  }

  const grid = new Grid(150, 100);
  grid.display.rectSize = 30;
  grid.display.margin = 1;

  for (let i = 2; i < 10; i += 2) {
    for (let j = 2; j < 10; j++) {
      grid.setValue(i, j, 1);
    }
  }

  const moveselHandler = new MoveSelectHandler(grid);
  const insertHandler = new InsertHandler(grid, configStore.current);
  let inputHandler = new NopHandler();

  const stateLoader = new GridStateLoader();
  stateLoader.restore(grid);

  const saveState = throttle(1000, function () {
    console.log("state saved");
    stateLoader.save(grid);
  });

  updateInputHandler(configStore.current);
  updateCanvasCursor(configStore.current);

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
    if (inputHandler.onMouseMove(x, y, e.movementX, e.movementY)) {
      saveState();
    }
  };

  canvas.oncontextmenu = function (e) {
    e.preventDefault();
  };

  document.addEventListener("mouseup", function (ev) {
    const [x, y] = getMousePos(ev);
    if (inputHandler.onMouseUp(x, y, ev.button)) {
      numSelected.textContent = grid.selected.size + "";
      saveState();
    }
  });

  window.addEventListener("resize", function (ev) {
    [cwidth, cheight, aspw, asph] = getCanvasSize(canvas, 640);
    canvas.width = cwidth;
    canvas.height = cheight;

    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
  });

  window.addEventListener("keydown", function (e) {
    console.log("e", e.ctrlKey, e.code, e.key);
    inputHandler.onKeyPress(e);
  });

  (window as any).grid = grid;

  configStore.on(function (config) {
    insertHandler.config = config;
    updateCanvasCursor(config);
    updateInputHandler(config);
  });

  requestAnimationFrame(loop);

  function updateCanvasCursor(config: Config) {
    canvas.classList.forEach((c) => {
      if (c.startsWith("cursor-")) {
        canvas.classList.remove(c);
      }
    });
    if (config.mode == "paint") {
      canvas.classList.add("cursor-" + config.paint.mode);
    } else if (config.mode == "movesel") {
    }
  }

  function updateInputHandler(config: Config) {
    if (config.mode == "movesel") {
      console.log("movesel");
      inputHandler = moveselHandler;
    } else if (config.mode == "paint") {
      console.log("paint");
      inputHandler = insertHandler;
    } else {
      console.log("nop");
      inputHandler = new NopHandler();
    }
  }

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
      if (val != null) {
        ctx.fillStyle = CellColor[val];
        ctx.fillRect(a, b, c, d);
      }

      if (selected) {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 4.0;
        ctx.strokeRect(a, b, c, d);
        ctx.setLineDash([3]);
        ctx.strokeStyle = "white";
        ctx.strokeRect(a, b, c, d);
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1.0;
        ctx.strokeRect(a, b, c, d);
      }
    }

    inputHandler.draw(ctx);

    ctx.restore();

    mainCtx.drawImage(bufferCanvas, 0, 0);

    requestAnimationFrame(loop);
  }

  function getMousePos(e: MouseEvent) {
    const canvasRect = canvas.getBoundingClientRect();
    const r = canvasRect;
    let [x, y] = [
      ((e.clientX - r.left) / grid.scale) * aspw,
      ((e.clientY - r.top) / grid.scale) * asph,
    ];
    x = Math.floor(x + grid.origin.x);
    y = Math.floor(y + grid.origin.y);
    return [x, y];
  }

  function getCanvasSize(canvas: HTMLCanvasElement, resolution: number) {
    const cs = getComputedStyle(canvas);
    const [dwidth, dheight] = [parseInt(cs.width, 10), parseInt(cs.height, 10)];
    const aspectRatio = dheight / dwidth;
    const cwidth = resolution;
    const cheight = Math.floor(cwidth * aspectRatio);
    const [aspw, asph] = [cwidth / dwidth, cheight / dheight];

    return [cwidth, cheight, aspw, asph];
  }
}

main();
