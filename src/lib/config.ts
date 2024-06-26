import { CellColor, type CellColorID } from "./grid";
import { Store } from "./store";

export type Config = {
  mode: Mode;
  movesel: {
    disallowOccupiedMove: boolean;
  };
  paint: {
    mode: "brush" | "fill" | "erase";
    color: CellColorID;
  };
};

export type ConfigActions =
  | { type: "setMode"; mode: Mode }
  | { type: "updateMovesel"; data: Partial<Config["movesel"]> }
  | { type: "updatePaint"; data: Partial<Config["paint"]> };

export type Mode = "movesel" | "paint";

export type ConfigStore = Store<Config, ConfigActions>;

export const createConfigStore = () =>
  new Store({
    initial: {
      mode: "paint",
      movesel: {
        disallowOccupiedMove: false,
      },
      paint: {
        mode: "brush",
        color: 0,
      },
    },
    reducer: (state: Config, action: ConfigActions) => {
      switch (action.type) {
        case "setMode":
          return {
            ...state,
            mode: action.mode,
          };

        case "updateMovesel":
          return {
            ...state,
            movesel: {
              ...state.movesel,
              ...action.data,
            },
          };

        case "updatePaint":
          return {
            ...state,
            paint: {
              ...state.paint,
              ...action.data,
            },
          };
      }
    },
  });
