import {
  useState,
  type ChangeEvent,
  createContext,
  useContext,
  useInsertionEffect,
  type ReactNode,
  useEffect,
} from "react";
import { createRoot } from "react-dom/client";
import { css, useCSS } from "./css";
import { Store as Store } from "./store";
import {
  createConfigStore,
  type Config,
  type ConfigActions,
  type ConfigStore,
  type Mode,
} from "./config";
import { CellColor } from "./grid";

const store = createConfigStore();
const ConfigContext = createContext<Config>(store.current);
const StoreContext = createContext<ConfigStore>(store);

export type SettingsProviderProps = {
  config: Config;
  store: Store<Config, ConfigActions>;
  children: ReactNode;
};
function SettingsProvider({ config, store, children }: SettingsProviderProps) {
  return (
    <ConfigContext.Provider value={config}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </ConfigContext.Provider>
  );
}

export function Settings({ store }: { store: ConfigStore }) {
  const [hidden, setHidden] = useState(false);
  const [config, setConfig] = useState(store.current);

  useEffect(() => {
    const fn = (data: Config) => {
      setConfig(data);
    };
    store.on(fn);
    return () => store.off(fn);
  }, [store, config]);

  function handleModeChange(e: ChangeEvent<HTMLSelectElement>) {
    const mode = e.target.value as Mode;
    store.dispatch({
      type: "setMode",
      mode,
    });
  }

  useCSS(Settings, { scope: "#sidebar" });

  return (
    <SettingsProvider config={config} store={store}>
      <div id="sidebar" className={hidden ? "hidden" : ""}>
        <div id="top">
          <select value={config.mode} onChange={handleModeChange}>
            <option value="movesel">select & move</option>
            <option value="paint">paint & insert</option>
          </select>
          <button id="sidebar-collapse" onClick={() => setHidden(!hidden)}>
            {hidden ? ">>" : "<<"}
          </button>
        </div>
        <br />
        {!hidden &&
          (config.mode === "movesel" ? (
            <MoveSelectSettings />
          ) : config.mode === "paint" ? (
            <PaintSettings />
          ) : null)}
        {/*
      <MoveSelectSettings />
      <hr />
      <PaintSettings />
    */}
      </div>
    </SettingsProvider>
  );
}

Settings.css = css`
  background: #222222ee;
  border: 2px solid #222;
  position: fixed;
  top: 0;
  left: 0;
  width: 480px;
  height: 100vh;
  color: white;
  padding: 10px;

  &.hidden {
    overflow: hidden;
    width: 30px;
    height: 30px;
    padding: 5px;
    margin: 0;
    background: #0000;
    border: 0;
  }

  &.hidden #top select {
    display: none;
  }
  &.hidden #sidebar-contents {
    display: none;
  }

  #top {
    display: flex;
    justify-content: space-between;
  }
`;

function PaintSettings() {
  const config = useContext(ConfigContext);
  const store = useContext(StoreContext);
  const paint = config.paint;

  const s = `${config.mode}`;

  const css = useCSS(PaintSettings, { scope: "#paint" });
  css`
    .color-block.c0 {
      background: ${CellColor[0]};
    }
    .color-block.c1 {
      background: ${CellColor[1]};
    }
    .color-block.c2 {
      background: ${CellColor[2]};
    }
    .color-block.c3 {
      background: ${CellColor[3]};
    }
    .color-block.c4 {
      background: ${CellColor[4]};
    }
    .color-block.c5 {
      background: ${CellColor[5]};
    }
    .color-block.c6 {
      background: ${CellColor[6]};
    }

    .color-block {
      text-align: center;
      vertical-align: middle;
      display: inline-block;
      width: 30px;
      height: 30px;
      margin: 5px;
      border: 1px solid white;
      cursor: pointer;

      &.selected {
        outline: 3px dashed white;
      }
    }
  `;

  function changeMode(mode: Config["paint"]["mode"]) {
    store.dispatch({
      type: "updatePaint",
      data: {
        ...config.paint,
        mode: mode,
      },
    });
  }

  return (
    <div id="paint">
      <div>
        <label>
          <input
            type="radio"
            name="paint"
            checked={paint.mode == "brush"}
            onChange={() => changeMode("brush")}
          />
          brush
        </label>
        <span> </span>
        <label>
          <input
            type="radio"
            name="paint"
            checked={paint.mode == "fill"}
            onChange={() => changeMode("fill")}
          />
          fill
        </label>
        {/*
        <span> </span>
        <label>
          <input
            type="radio"
            name="paint"
            checked={paint.mode == "erase"}
            onChange={() => changeMode("erase")}
          />
          erase
        </label>
        */}
      </div>
      <br />
      {paint.mode != "erase" && (
        <label>
          cell color:
          {Object.entries(CellColor).map(
            ([i, c]) =>
              parseInt(i, 10) >= 0 && (
                <div
                  key={i + c}
                  className={
                    "color-block c" +
                    i +
                    (paint.color == parseInt(i, 10) ? " selected" : "")
                  }
                  onClick={() =>
                    store.dispatch({
                      type: "updatePaint",
                      data: {
                        ...paint,
                        color: parseInt(i, 10),
                      },
                    })
                  }
                ></div>
              )
          )}
          <div
            className={"color-block " + (paint.color == -1 ? " selected" : "")}
            onClick={() =>
              store.dispatch({
                type: "updatePaint",
                data: {
                  ...paint,
                  color: -1,
                },
              })
            }
          >
            -
          </div>
        </label>
      )}
    </div>
  );
}

function MoveSelectSettings() {
  const config = useContext(ConfigContext);
  const store = useContext(StoreContext);

  const css = useCSS(MoveSelectSettings, { scope: "#movesel" });
  css`
    border-collapse: collapse;
    width: 100%;

    h1,
    h2 {
      margin: 0;
    }
    label {
      user-select: none;
    }

    table td {
      border: 1px solid #555;
      padding: 3px;
    }
  `;

  return (
    <div id="movesel">
      <label>
        <input
          type="checkbox"
          checked={config.movesel.allowForceMove}
          onChange={(e) => {
            store.dispatch({
              type: "updateMovesel",
              data: {
                ...config.movesel,
                allowForceMove: !config.movesel.allowForceMove,
              },
            });
          }}
        />
        disallow moving cell to a non-empty block
      </label>
      <br />
      <br />

      <h2>controls</h2>
      <br />
      <table>
        <thead>
          <tr>
            <th>key/target</th>
            <th>action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>click cell</td>
            <td>select cell</td>
          </tr>
          <tr>
            <td>click empty cell</td>
            <td>clear selection</td>
          </tr>
          <tr>
            <td>ctrl+click cell</td>
            <td>toggle selection</td>
          </tr>
          <tr>
            <td>click & drag cell</td>
            <td>move cell</td>
          </tr>

          <tr>
            <td>click & drag selected cells</td>
            <td>move selected cells</td>
          </tr>

          <tr>
            <td>click & drag empty</td>
            <td>select area</td>
          </tr>

          <tr>
            <td>shift+click & drag empty</td>
            <td>add area to current selection</td>
          </tr>

          <tr>
            <td>
              <i>(while a cell is selected)</i>
              <br />
              shift+click another cell
            </td>
            <td>select rectangle area</td>
          </tr>

          <tr>
            <td>ctrl+c</td>
            <td>copy selected cells</td>
          </tr>

          <tr>
            <td>ctrl+v</td>
            <td>paste</td>
          </tr>

          <tr>
            <td>while dragging or pasting</td>
            <td>press R to rotate</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function mountSettings(store: ConfigStore, root: Element) {
  createRoot(root).render(<Settings store={store} />);
}
