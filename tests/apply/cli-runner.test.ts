import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("apply CLI runner", () => {
  it("runs apply.ts with nested tool imports without Node TypeScript strip support", () => {
    const tempRoot = path.join(process.cwd(), ".tmp");
    mkdirSync(tempRoot, { recursive: true });
    const tempDir = mkdtempSync(path.join(tempRoot, "wbs-json-apply-cli-"));
    const wbsPath = path.join(tempDir, "wbs.json");
    const changeSetPath = path.join(tempDir, "change-set.json");
    const outputPath = path.join(tempDir, "out.json");

    writeFileSync(wbsPath, `${JSON.stringify({
      schemaVersion: "0.1.0",
      id: "demo",
      name: "Demo",
      rootId: "node-root",
      nodes: [
        {
          id: "node-root",
          parentId: null,
          code: "1",
          name: "Root",
          type: "workPackage",
          status: "ready"
        }
      ]
    })}\n`);

    writeFileSync(changeSetPath, `${JSON.stringify({
      schemaVersion: "0.1.0",
      targetWbsId: "demo",
      operations: [
        {
          operation: "changeNodeStatus",
          nodeId: "node-root",
          status: "completed"
        }
      ]
    })}\n`);

    const result = spawnSync("node", [
      "tools/run-ts.mjs",
      "tools/apply.ts",
      wbsPath,
      changeSetPath,
      "-o",
      outputPath,
      "--force"
    ], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(output.nodes[0].status, "completed");
  });
});
