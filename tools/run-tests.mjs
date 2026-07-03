import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildSync } from "esbuild";

const tempRoot = path.join(process.cwd(), ".tmp");
mkdirSync(tempRoot, { recursive: true });
const tempDir = mkdtempSync(path.join(tempRoot, "wbs-json-tests-"));

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
  const testsDir = path.join("tests", "apply");
  const entryPoints = readdirSync(testsDir)
    .filter((file) => file.endsWith(".test.ts"))
    .map((file) => path.join(testsDir, file));

  buildSync({
    entryPoints: [...entryPoints, ...toolEntryPoints()],
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

  const fixtureSource = path.join(testsDir, "fixtures");
  const fixtureTarget = path.join(tempDir, testsDir, "fixtures");
  mkdirSync(path.dirname(fixtureTarget), { recursive: true });
  cpSync(fixtureSource, fixtureTarget, { recursive: true });

  const testFiles = entryPoints.map((entry) => path.join(tempDir, entry.replace(/\.ts$/, ".mjs")));
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
