import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyOperations,
  type ChangeSet,
  type WbsDocument
} from "../../tools/apply-operations.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "base-wbs.json");

function loadBase(): WbsDocument {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as WbsDocument;
}

function apply(doc: WbsDocument, operations: ChangeSet["operations"]) {
  return applyOperations(doc, {
    schemaVersion: "0.1.0",
    targetWbsId: doc.id,
    operations
  }, { forceDryRun: true });
}

describe("convenience operations", () => {
  it("setNodeOutputs replaces outputs", () => {
    const base = loadBase();
    const addArtifact = apply(base, [{
      operation: "addArtifact",
      artifact: { id: "artifact-b", name: "B", type: "document" }
    }]);
    const result = apply(addArtifact.document, [{
      operation: "setNodeOutputs",
      nodeId: "node-child-a",
      outputs: ["artifact-b"]
    }]);

    assert.equal(result.success, true);
    assert.deepEqual(result.document.nodes.find((n) => n.id === "node-child-a")?.outputs, ["artifact-b"]);
  });

  it("addNodeOutput is idempotent with warning", () => {
    const base = loadBase();
    const first = apply(base, [{
      operation: "addNodeOutput",
      nodeId: "node-child-a",
      artifactId: "artifact-a"
    }]);
    assert.equal(first.success, true);
    assert.ok(first.warnings.some((w) => w.includes("already has output")));

    const second = apply(base, [{
      operation: "addNodeOutput",
      nodeId: "node-child-a",
      artifactId: "artifact-a"
    }]);
    assert.equal(second.document.nodes.find((n) => n.id === "node-child-a")?.outputs?.length, 1);
  });

  it("deleteNodeOutput is idempotent with warning", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteNodeOutput",
      nodeId: "node-child-a",
      artifactId: "artifact-missing"
    }]);
    assert.equal(result.success, true);
    assert.ok(result.warnings.some((w) => w.includes("does not have output")));
  });

  it("addAcceptanceCriterion and deleteAcceptanceCriterion by criterion", () => {
    const base = loadBase();
    const add = apply(base, [{
      operation: "addAcceptanceCriterion",
      nodeId: "node-child-a",
      criterion: "New criterion"
    }]);
    assert.equal(add.success, true);

    const del = apply(add.document, [{
      operation: "deleteAcceptanceCriterion",
      nodeId: "node-child-a",
      criterion: "Criterion A"
    }]);
    assert.equal(del.success, true);
    const criteria = del.document.nodes.find((n) => n.id === "node-child-a")?.acceptanceCriteria;
    assert.deepEqual(criteria, ["New criterion"]);
  });

  it("deleteAcceptanceCriterion by index", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteAcceptanceCriterion",
      nodeId: "node-child-a",
      index: 0
    }]);
    assert.equal(result.success, true);
    assert.deepEqual(result.document.nodes.find((n) => n.id === "node-child-a")?.acceptanceCriteria, []);
  });

  it("addTag and deleteTag", () => {
    const base = loadBase();
    const add = apply(base, [{
      operation: "addTag",
      nodeId: "node-child-a",
      tag: "beta"
    }]);
    assert.equal(add.success, true);
    assert.ok(add.document.nodes.find((n) => n.id === "node-child-a")?.tags?.includes("beta"));

    const dup = apply(base, [{
      operation: "addTag",
      nodeId: "node-child-a",
      tag: "alpha"
    }]);
    assert.ok(dup.warnings.some((w) => w.includes("already has tag")));

    const del = apply(add.document, [{
      operation: "deleteTag",
      nodeId: "node-child-a",
      tag: "beta"
    }]);
    assert.equal(del.success, true);
    assert.equal(del.document.nodes.find((n) => n.id === "node-child-a")?.tags?.includes("beta"), false);
  });

  it("deleteAcceptanceCriterion rejects both criterion and index at schema validation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteAcceptanceCriterion",
      nodeId: "node-child-a",
      criterion: "Criterion A",
      index: 0
    }]);

    assert.equal(result.success, false);
    assert.equal(result.errors[0].operation, "changeSet");
  });

  it("deleteAcceptanceCriterion deletes by normalized matchMode", () => {
    const base = loadBase();
    const withSpaces = apply(base, [{
      operation: "addAcceptanceCriterion",
      nodeId: "node-child-a",
      criterion: "  Spaced   criterion  "
    }]);
    assert.equal(withSpaces.success, true);

    const result = apply(withSpaces.document, [{
      operation: "deleteAcceptanceCriterion",
      nodeId: "node-child-a",
      criterion: "Spaced criterion",
      matchMode: "normalized"
    }]);

    assert.equal(result.success, true);
    const criteria = result.document.nodes.find((n) => n.id === "node-child-a")?.acceptanceCriteria ?? [];
    assert.equal(criteria.some((c) => c.includes("Spaced")), false);
  });

  it("deleteTag is idempotent with warning", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteTag",
      nodeId: "node-child-a",
      tag: "missing-tag"
    }]);

    assert.equal(result.success, true);
    assert.ok(result.warnings.some((w) => w.includes("does not have tag")));
  });
});
