import path from "node:path";
import fs from "node:fs/promises";
import { watch } from "node:fs";
import { EventEmitter } from "node:events";
import config from "./config";
import type { BuildConfig } from "bun";

const command = process.argv.pop();
const entrypoints = Array.from(
  new Bun.Glob("*.{ts,tsx}").scanSync({ cwd: config.src })
).map((f) => path.join(config.src, f));

switch (command) {
  case "build":
    build();
    break;

  case "dev":
  default:
    dev();
    break;
}

function build() {
  Bun.build({
    entrypoints,
    minify: true,
    outdir: config.dest,
    target: "browser",
  });
  for (const f of new Bun.Glob(path.join(config.site, "**/*")).scanSync()) {
    console.log("-> ", f);
  }
}

async function dev() {
  const options: BuildConfig = {
    entrypoints,
    outdir: config.dest,
    target: "browser",
  };
  Bun.build(options);

  if (!globalThis.reloadCount) {
    watch(config.site, { recursive: true }, function () {
      globalThis.reloaded.emit("reload");
    });
    watch(config.src, { recursive: true }, function () {
      Bun.build(options);
    });
  }

  if (!globalThis.reloaded) {
    globalThis.reloaded ??= new EventEmitter();
  } else {
    globalThis.reloaded.emit("reload");
  }

  globalThis.reloadCount ??= 0;
  globalThis.reloadCount++;

  console.log(
    "dev server opened at http://localhost:3000 | reload_count=",
    globalThis.reloadCount
  );

  await Bun.serve({
    async fetch(req) {
      const url = new URL(req.url);
      let filename = config.site + path.normalize(url.pathname);
      const watchPath = "/__watch__";

      console.log("serving " + filename);

      if (url.pathname == watchPath) {
        return handlePageReload(req);
      }

      try {
        const stat = await fs.stat(filename);
        if (stat) {
          let ext = path.extname(filename);

          if (!ext && stat.isDirectory()) {
            filename = path.join(filename, "index.html");
            ext = ".html";
          }

          if (ext == ".html") {
            const contents = await Bun.file(filename).text();
            let body = "";
            let script = `<script>(function () { new EventSource("${watchPath}").addEventListener("reload", () => location.reload()); })();</script>`;

            // inject autoreload script after </body>  or </html>
            (function () {
              let i = contents.indexOf("</body>");
              if (i < 0) i = contents.indexOf("</html>");
              if (i >= 0) {
                body =
                  contents.substring(0, i) + script + contents.substring(i);
              } else {
                body = contents + script;
              }
            })();

            return new Response(body, {
              headers: { "Content-Type": "text/html" },
            });
          }
          return new Response(Bun.file(filename));
        }
      } catch (e) {
        if (e instanceof Error) {
          if (e.name == "ENOENT") {
            return new Response("file not found: " + filename, {
              status: 404,
              headers: { "Content-Type": "text/plain" },
            });
          }
        }
      }

      return new Response("huh", { status: 500 });
    },
  });
}

function handlePageReload(req: Request) {
  let timerID: Timer | undefined = undefined;

  const body = new ReadableStream({
    start(controller) {
      function onreload() {
        clearInterval(timerID);
        globalThis.reloaded.off("reload", onreload);
        controller.enqueue("event: reload\ndata: x\n\n");
      }
      function loop() {
        controller.enqueue("event: ping\n\n");
        if (req.signal.aborted) {
          onreload();
        }
      }
      timerID = setInterval(loop, 1000);
      globalThis.reloaded.on("reload", onreload);
    },
  });

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/event-stream",
    },
  });
}

declare global {
  var fswatch: EventEmitter;
  var reloaded: EventEmitter;
  var reloadCount: number;
}
