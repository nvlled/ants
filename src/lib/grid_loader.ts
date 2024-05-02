import type Grid from "./grid";

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
