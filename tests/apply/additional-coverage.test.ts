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

function apply(
  doc: WbsDocument,
  operations: ChangeSet["operations"],
  options: Parameters<typeof applyOperations>[2] = { forceDryRun: true }
) {
  return applyOperations(doc, {
    schemaVersion: "0.1.0",
    targetWbsId: doc.id,
    operations
  }, options);
}

describe("addNode position and validation", () => {
  it("inserts at first sibling position", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addNode",
      node: {
        id: "node-new-first",
        parentId: "node-root",
        code: "1.0",
        name: "First Child",
        type: "workPackage"
      },
      position: { mode: "first" }
    }]);

    assert.equal(result.success, true);
    const siblings = result.document.nodes.filter((n) => n.parentId === "node-root");
    assert.equal(siblings[0].id, "node-new-first");
  });

  it("inserts before a reference sibling", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addNode",
      node: {
        id: "node-new-before",
        parentId: "node-root",
        code: "1.15",
        name: "Before B",
        type: "workPackage"
      },
      position: { mode: "before", referenceNodeId: "node-child-b" }
    }]);

    assert.equal(result.success, true);
    const siblings = result.document.nodes.filter((n) => n.parentId === "node-root");
    const indexB = siblings.findIndex((n) => n.id === "node-child-b");
    assert.equal(siblings[indexB - 1].id, "node-new-before");
  });

  it("rejects duplicate node id", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addNode",
      node: {
        id: "node-child-a",
        parentId: "node-root",
        code: "1.9",
        name: "Duplicate",
        type: "workPackage"
      }
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /already exists/);
  });

  it("rejects missing parent", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addNode",
      node: {
        id: "node-orphan",
        parentId: "node-missing",
        code: "9",
        name: "Orphan",
        type: "workPackage"
      }
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /does not exist/);
  });

  it("rejects second root node", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addNode",
      node: {
        id: "node-second-root",
        parentId: null,
        code: "2",
        name: "Second Root",
        type: "deliverable"
      }
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /second root/);
  });
});

describe("updateNode and moveNode options", () => {
  it("rejects parentId changes via updateNode at schema validation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "updateNode",
      nodeId: "node-child-a",
      changes: { parentId: "node-child-b" }
    }]);

    assert.equal(result.success, false);
    assert.equal(result.errors[0].operation, "changeSet");
    assert.match(result.errors[0].message, /parentId/);
  });

  it("moveNode respects explicit newCode without sibling renumber", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "moveNode",
      nodeId: "node-child-a",
      newParentId: "node-child-b",
      newCode: "9.9.9",
      renumberDescendants: false
    }]);

    assert.equal(result.success, true);
    const moved = result.document.nodes.find((n) => n.id === "node-child-a");
    assert.equal(moved?.code, "9.9.9");
    assert.equal(result.document.nodes.find((n) => n.id === "node-grandchild")?.code, "1.1.1");
  });
});

describe("reorderChildren validation and renumber", () => {
  it("renumbers children when renumberChildren is true", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "reorderChildren",
      parentId: "node-root",
      orderedChildIds: ["node-child-b", "node-child-a"],
      renumberChildren: true
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.nodes.find((n) => n.id === "node-child-b")?.code, "1.1");
    assert.equal(result.document.nodes.find((n) => n.id === "node-child-a")?.code, "1.2");
  });

  it("rejects incomplete orderedChildIds", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "reorderChildren",
      parentId: "node-root",
      orderedChildIds: ["node-child-a"]
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /exactly the current children/);
  });

  it("rejects extra unknown child id", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "reorderChildren",
      parentId: "node-root",
      orderedChildIds: ["node-child-a", "node-child-b", "node-unknown"]
    }]);

    assert.equal(result.success, false);
  });
});

describe("detachFromNodes false", () => {
  it("deleteArtifact fails when referenced and detachFromNodes is false", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteArtifact",
      artifactId: "artifact-a",
      detachFromNodes: false
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /detachFromNodes is false/);
  });

  it("deleteResource fails when referenced and detachFromNodes is false", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteResource",
      resourceId: "resource-dev",
      detachFromNodes: false
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /detachFromNodes is false/);
  });
});

describe("deleteAcceptanceCriterion edge cases", () => {
  it("rejects both criterion and index at schema validation", () => {
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

  it("deletes by normalized matchMode", () => {
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
});

describe("change set validation and semantics", () => {
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
    const result = apply(base, [{
      operation: "setNodeOutputs",
      nodeId: "node-child-a",
      outputs: ["artifact-nonexistent"]
    }]);

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
    const result = apply(base, [
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
    ]);

    assert.equal(result.success, true);
    const node = result.document.nodes.find((n) => n.id === "node-child-b");
    assert.deepEqual(node?.outputs, ["artifact-new"]);
    assert.equal(node?.status, "ready");
  });
});

describe("relation and entity not-found errors", () => {
  it("deleteRelation fails for missing relation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteRelation",
      relationId: "rel-missing"
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /does not exist/);
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

  it("addRelation rejects duplicate id", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addRelation",
      relation: {
        id: "rel-a-b",
        type: "relatedTo",
        source: "node-child-a",
        target: "node-child-b"
      }
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /already exists/);
  });

  it("addArtifact rejects duplicate id", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addArtifact",
      artifact: { id: "artifact-a", name: "Dup", type: "document" }
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /already exists/);
  });
});
