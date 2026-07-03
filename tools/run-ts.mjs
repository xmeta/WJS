import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildSync } from "esbuild";

const [, , entryPoint, ...entryArgs] = process.argv;

if (!entryPoint) {
  console.error("Usage: node tools/run-ts.mjs <entry.ts> [...args]");
  process.exit(2);
}

function runWithBun() {
  if (process.env.WBS_JSON_USE_BUN === "0") return undefined;
  const result = spawnSync("bun", [entryPoint, ...entryArgs], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
  if (result.error?.code === "ENOENT") return undefined;
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const bunStatus = runWithBun();
if (bunStatus !== undefined) {
  process.exit(bunStatus);
}

const tempRoot = path.join(process.cwd(), ".tmp");
mkdirSync(tempRoot, { recursive: true });
const tempDir = mkdtempSync(path.join(tempRoot, "wbs-json-run-ts-"));
const outputFile = path.join(tempDir, entryPoint.replace(/\.ts$/, ".mjs"));

function toolEntryPoints() {
  return readdirSync("tools")
    .filter((file) => file.endsWith(".ts"))
    .map((file) => path.join("tools", file));
}

function rewriteTsImportSpecifiers(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      rewriteTsImportSpecifiers(fullPath);
      continue;
    }
    if (!fullPath.endsWith(".mjs")) continue;
    const source = readFileSync(fullPath, "utf8");
    const rewritten = source.replace(/((?:from|import)\s*["'][^"']+)\.ts(["'])/g, "$1.mjs$2");
    if (rewritten !== source) {
      writeFileSync(fullPath, rewritten, "utf8");
    }
  }
}

try {
  buildSync({
    entryPoints: [...new Set([entryPoint, ...toolEntryPoints()])],
    outdir: tempDir,
    outbase: ".",
    bundle: false,
    platform: "node",
    format: "esm",
    target: "node20",
    outExtension: { ".js": ".mjs" },
    logLevel: "silent"
  });
  rewriteTsImportSpecifiers(tempDir);

  const result = spawnSync(process.execPath, [outputFile, ...entryArgs], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
