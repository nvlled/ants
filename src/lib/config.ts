import { Store } from "./store";

export type Config = {
  mode: Mode;
  movesel: {
    allowForceMove: boolean;
  };
  paint: {
    mode: "brush" | "fill";
    color: string;
  };
};

export type ConfigActions =
  | { type: "setMode"; mode: Mode }
  | { type: "updateMovesel"; data: Config["movesel"] }
  | { type: "updatePaint"; data: Config["paint"] };

export type Mode = "movesel" | "paint";

export type ConfigStore = Store<Config, ConfigActions>;

export const createConfigStore = () =>
  new Store({
    initial: {
      mode: "paint",
      movesel: {
        allowForceMove: false,
      },
      paint: {
        mode: "brush",
        color: "green",
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
