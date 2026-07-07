import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyOperations,
  cloneDocument,
  type ChangeSet,
  type WbsDocument
} from "../../tools/apply-operations.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "base-wbs.json");

function loadBase(): WbsDocument {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as WbsDocument;
}

describe("edge cases", () => {
  it("dryRun returns preview with applied false", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      dryRun: true,
      operations: [{
        operation: "renameNode",
        nodeId: "node-child-a",
        name: "Preview Name"
      }]
    });

    assert.equal(result.success, true);
    assert.equal(result.applied, false);
    assert.equal(result.document.nodes.find((n) => n.id === "node-child-a")?.name, "Preview Name");
    assert.equal(base.nodes.find((n) => n.id === "node-child-a")?.name, "Child A");
  });

  it("fails on targetWbsId mismatch", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wrong-id",
      operations: [{
        operation: "renameNode",
        nodeId: "node-child-a",
        name: "X"
      }]
    });

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /targetWbsId/);
  });

  it("rolls back on operation failure", () => {
    const base = loadBase();
    const original = cloneDocument(base);
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [
        {
          operation: "renameNode",
          nodeId: "node-child-a",
          name: "Should Not Persist"
        },
        {
          operation: "renameNode",
          nodeId: "node-missing",
          name: "Fail"
        }
      ]
    }, { forceDryRun: true });

    assert.equal(result.success, false);
    assert.deepEqual(result.document, original);
  });

  it("deleteNode failIfReferenced rejects when relations exist", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [{
        operation: "deleteNode",
        nodeId: "node-child-a",
        deleteMode: "subtree",
        relationHandling: "failIfReferenced"
      }]
    }, { forceDryRun: true });

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /Relations still reference/);
  });

  it("moveNode rejects cycles", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [{
        operation: "moveNode",
        nodeId: "node-root",
        newParentId: "node-grandchild"
      }]
    }, { forceDryRun: true });

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /cycle/);
  });

  it("strictBaseRevision fails on mismatch", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      baseRevision: "rev-001",
      operations: [{
        operation: "renameNode",
        nodeId: "node-child-a",
        name: "X"
      }]
    }, {
      forceDryRun: true,
      strictBaseRevision: true,
      expectedRevision: "rev-002"
    });

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /baseRevision/);
  });

  it("cannot delete root node", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [{
        operation: "deleteNode",
        nodeId: "node-root",
        deleteMode: "subtree"
      }]
    }, { forceDryRun: true });

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /root/);
  });

  it("fails on invalid change set schema", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [{
        operation: "renameNode",
        nodeId: "node-child-a"
      } as ChangeSet["operations"][number]]
    }, { forceDryRun: true });

    assert.equal(result.success, false);
    assert.equal(result.errors[0].operation, "changeSet");
  });

  it("fails post-apply semantic validation for invalid output reference", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [{
        operation: "setNodeOutputs",
        nodeId: "node-child-a",
        outputs: ["artifact-nonexistent"]
      }]
    }, { forceDryRun: true });

    assert.equal(result.success, false);
    assert.equal(result.errors[0].operation, "semanticValidation");
    assert.match(result.errors[0].message, /output/);
  });

  it("forceDryRun sets applied true on success", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      dryRun: true,
      operations: [{
        operation: "renameNode",
        nodeId: "node-child-a",
        name: "Forced"
      }]
    }, { forceDryRun: true });

    assert.equal(result.success, true);
    assert.equal(result.applied, true);
  });

  it("applies multiple operations in sequence", () => {
    const base = loadBase();
    const result = applyOperations(base, {
      schemaVersion: "0.1.0",
      targetWbsId: "wbs-test",
      operations: [
        {
          operation: "addArtifact",
          artifact: { id: "artifact-new", name: "New", type: "document" }
        },
        {
          operation: "addNodeOutput",
          nodeId: "node-child-b",
          artifactId: "artifact-new"
        },
        {
          operation: "changeNodeStatus",
          nodeId: "node-child-b",
          status: "ready"
        }
      ]
    }, { forceDryRun: true });

    assert.equal(result.success, true);
    const node = result.document.nodes.find((n) => n.id === "node-child-b");
    assert.deepEqual(node?.outputs, ["artifact-new"]);
    assert.equal(node?.status, "ready");
  });
});
