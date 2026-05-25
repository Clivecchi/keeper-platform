import { build } from "vite";
import fs from "fs";
import path from "path";

const root = "k:/Keeper Codebase/keeper-platform/apps/web";
const mainPath = path.join(root, "src/main.tsx");
const appPath = path.join(root, "src/App.tsx");
const mainOriginal = fs.readFileSync(mainPath, "utf8");
const appOriginal = fs.readFileSync(appPath, "utf8");
const block = `if (import.meta.env.DEV) {
  void import('./v0/presents/theatre/initTheatreStudio.dev').then(
    ({ initTheatreStudio }) => { initTheatreStudio() }
  )
}
`;
const mainWithout = mainOriginal.replace("\n" + block, "\n");
const appWith = `import { useEffect } from "react"\n` + appOriginal.replace(/^import/, block + "\nimport").replace(/^import \{ useEffect \} from "react"\nimport \{ useEffect \}/, "import { useEffect");
