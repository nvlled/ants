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
import { CellColor, GridObserver, type PartialGridState } from "./grid";

const store = createConfigStore();
const ConfigContext = createContext<Config>(store.current);
const StoreContext = createContext<ConfigStore>(store);
const GridContext = createContext<PartialGridState>({
  numSelected: 0,
  origin: { x: 0, y: 0 },
  scale: 1,
});

export type SettingsProviderProps = {
  config: Config;
  store: Store<Config, ConfigActions>;
  grid: PartialGridState;
  children: ReactNode;
};
function SettingsProvider({
  config,
  store,
  grid,
  children,
}: SettingsProviderProps) {
  return (
    <ConfigContext.Provider value={config}>
      <StoreContext.Provider value={store}>
        <GridContext.Provider value={grid}>{children}</GridContext.Provider>
      </StoreContext.Provider>
    </ConfigContext.Provider>
  );
}

export function Settings({
  store,
  gridObserver,
}: {
  store: ConfigStore;
  gridObserver: GridObserver;
}) {
  const [hidden, setHidden] = useState(false);
  const [config, setConfig] = useState(store.current);
  const [grid, setGrid] = useState<PartialGridState>(gridObserver.current);

  useEffect(() => {
    const fn = (data: Config) => {
      setConfig(data);
    };
    store.on(fn);
    return () => store.off(fn);
  }, [store, config]);

  useEffect(() => {
    const fn = (grid: PartialGridState) => {
      setGrid(grid);
    };
    gridObserver.on(fn);
    return () => gridObserver.off(fn);
  }, []);

  function handleModeChange(e: ChangeEvent<HTMLSelectElement>) {
    const mode = e.target.value as Mode;
    store.dispatch({
      type: "setMode",
      mode,
    });
  }

  useCSS(Settings, { scope: "#sidebar" });

  return (
    <SettingsProvider config={config} store={store} grid={grid}>
      <StatusBar />
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
        <div id="settings-body">
          {!hidden &&
            (config.mode === "movesel" ? (
              <MoveSelectSettings />
            ) : config.mode === "paint" ? (
              <PaintSettings />
            ) : null)}
        </div>
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
  width: 380px;
  height: 100vh;
  color: white;
  padding: 10px;

  z-index: 10;

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

function StatusBar() {
  const config = useContext(ConfigContext);
  const grid = useContext(GridContext);

  const css = useCSS(StatusBar, { scope: "#status-bar" });
  css`
    position: fixed;
    background: #333;
    top: 0;
    width: 100vw;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;

    #mode {
      margin-right: 5px;
    }

    .color-block {
      text-align: center;
      vertical-align: middle;
      display: inline-block;
      width: 15px;
      height: 15px;
      border: 1px solid gray;
      margin-right: 5px;
    }
  `;

  return (
    <div id="status-bar">
      <div id="mode">
        {config.mode === "movesel" ? "select & move" : config.mode}:
      </div>
      {config.mode === "movesel" ? (
        <>{grid.numSelected}</>
      ) : config.mode === "paint" ? (
        <>
          <span
            className="color-block"
            style={{
              background:
                config.paint.color === -1
                  ? "#111"
                  : CellColor[config.paint.color],
            }}
          />
          {config.paint.mode}
        </>
      ) : null}
    </div>
  );
}

function PaintSettings() {
  const config = useContext(ConfigContext);
  const store = useContext(StoreContext);
  const paint = config.paint;

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

    table {
      width: 100%;
    }
    table td {
      border: 1px solid #555;
      padding: 3px;
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
            x
          </div>
        </label>
      )}
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
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <tr key={n}>
              <td>{n}</td>
              <td>select color {n}</td>
            </tr>
          ))}
          <tr>
            <td>0</td>
            <td>select clear color </td>
          </tr>

          <tr>
            <td>f</td>
            <td>fill paint</td>
          </tr>
          <tr>
            <td>b</td>
            <td>brush paint</td>
          </tr>

          <tr>
            <td>
              <br />
            </td>
            <td>
              <br />
            </td>
          </tr>

          <CommonControlTable />
        </tbody>
      </table>
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
          checked={config.movesel.disallowOccupiedMove}
          onChange={(e) => {
            store.dispatch({
              type: "updateMovesel",
              data: {
                ...config.movesel,
                disallowOccupiedMove: !config.movesel.disallowOccupiedMove,
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
            <td>ctrl+x</td>
            <td>cut selected cells</td>
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

          <tr>
            <td>
              <br />
            </td>
            <td>
              <br />
            </td>
          </tr>

          <CommonControlTable />
        </tbody>
      </table>
    </div>
  );
}

function CommonControlTable() {
  return (
    <>
      <tr>
        <td>right click + drag</td>
        <td>move or pan view</td>
      </tr>
      <tr>
        <td>q</td>
        <td>zoom out</td>
      </tr>
      <tr>
        <td>w</td>
        <td>zoom in</td>
      </tr>
      <tr>
        <td>`</td>
        <td>toggle mode</td>
      </tr>
    </>
  );
}

export function mountSettings(
  store: ConfigStore,
  gridObserver: GridObserver,
  root: Element
) {
  createRoot(root).render(
    <Settings store={store} gridObserver={gridObserver} />
  );
}
