import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

createServer(async (req, res) => {
  try {
    const pathname = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = normalize(join(root, pathname));
    if (!file.startsWith(root)) throw new Error("invalid path");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("Local URL: http://127.0.0.1:4173"));
