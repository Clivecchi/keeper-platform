import { createServer, build } from "vite";
import fs from "fs";
import path from "path";

const root = "k:/Keeper Codebase/keeper-platform/apps/web";
const server = await createServer({ root, configFile: path.join(root, "vite.config.ts"), mode: "production" });
const result = await server.transformRequest("/src/main.tsx", { ssr: false });
console.log("--- transformed main.tsx snippet ---");
const code = result?.code ?? "";
const idx = code.indexOf("initTheatreStudio");
console.log("has initTheatreStudio:", idx >= 0);
if (idx >= 0) console.log(code.slice(Math.max(0, idx - 120), idx + 200));
else {
  const devIdx = code.indexOf("import.meta.env.DEV");
  console.log("has import.meta.env.DEV:", devIdx >= 0);
  const falseIdx = code.indexOf("false");
  console.log("sample around createRoot:", code.slice(code.indexOf("createRoot") - 200, code.indexOf("createRoot") + 100));
}
await server.close();
