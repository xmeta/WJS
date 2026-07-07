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

function apply(doc: WbsDocument, operations: ChangeSet["operations"], extra: Partial<ChangeSet> = {}) {
  const changeSet: ChangeSet = {
    schemaVersion: "0.1.0",
    targetWbsId: doc.id,
    operations,
    ...extra
  };
  return applyOperations(doc, changeSet, { forceDryRun: true });
}

describe("node operations", () => {
  it("addNode inserts a node with defaults", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addNode",
      node: {
        id: "node-new",
        parentId: "node-root",
        code: "1.3",
        name: "New Node",
        type: "workPackage"
      }
    }]);

    assert.equal(result.success, true);
    const added = result.document.nodes.find((n) => n.id === "node-new");
    assert.ok(added);
    assert.equal(added.status, "draft");
    assert.deepEqual(added.tags, []);
  });

  it("updateNode merges changes and clears null fields", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "updateNode",
      nodeId: "node-child-b",
      changes: { description: "Updated", owner: null }
    }]);

    assert.equal(result.success, true);
    const node = result.document.nodes.find((n) => n.id === "node-child-b");
    assert.equal(node?.description, "Updated");
    assert.equal(node?.owner, undefined);
  });

  it("renameNode changes name", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "renameNode",
      nodeId: "node-child-a",
      name: "Renamed A"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.nodes.find((n) => n.id === "node-child-a")?.name, "Renamed A");
  });

  it("changeNodeStatus updates status", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "changeNodeStatus",
      nodeId: "node-child-a",
      status: "inProgress"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.nodes.find((n) => n.id === "node-child-a")?.status, "inProgress");
  });

  it("moveNode changes parent and renumbers descendants by default", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "moveNode",
      nodeId: "node-child-a",
      newParentId: "node-child-b",
      position: { mode: "last" }
    }]);

    assert.equal(result.success, true);
    const moved = result.document.nodes.find((n) => n.id === "node-child-a");
    assert.equal(moved?.parentId, "node-child-b");
    assert.match(moved!.code, /^1\.2\.1$/);
    const grandchild = result.document.nodes.find((n) => n.id === "node-grandchild");
    assert.match(grandchild!.code, /^1\.2\.1\.1$/);
  });

  it("deleteNode subtree removes descendants", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteNode",
      nodeId: "node-child-a",
      deleteMode: "subtree",
      relationHandling: "deleteReferencingRelations"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.nodes.some((n) => n.id === "node-child-a"), false);
    assert.equal(result.document.nodes.some((n) => n.id === "node-grandchild"), false);
    assert.equal(result.document.relations?.some((r) => r.id === "rel-a-b"), false);
  });

  it("deleteNode nodeOnly reattaches children", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteNode",
      nodeId: "node-child-a",
      deleteMode: "nodeOnly",
      relationHandling: "deleteReferencingRelations"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.nodes.some((n) => n.id === "node-child-a"), false);
    const grandchild = result.document.nodes.find((n) => n.id === "node-grandchild");
    assert.equal(grandchild?.parentId, "node-root");
  });

  it("reorderChildren reorders siblings in array", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "reorderChildren",
      parentId: "node-root",
      orderedChildIds: ["node-child-b", "node-child-a"]
    }]);

    assert.equal(result.success, true);
    const siblings = result.document.nodes.filter((n) => n.parentId === "node-root");
    assert.deepEqual(siblings.map((n) => n.id), ["node-child-b", "node-child-a"]);
  });

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

describe("relation operations", () => {
  it("addRelation adds a relation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "addRelation",
      relation: {
        id: "rel-new",
        type: "relatedTo",
        source: "node-child-a",
        target: "node-child-b"
      }
    }]);

    assert.equal(result.success, true);
    assert.ok(result.document.relations?.some((r) => r.id === "rel-new"));
  });

  it("updateRelation patches a relation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "updateRelation",
      relationId: "rel-a-b",
      changes: { description: "Updated relation" }
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.relations?.find((r) => r.id === "rel-a-b")?.description, "Updated relation");
  });

  it("deleteRelation removes a relation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteRelation",
      relationId: "rel-a-b"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.relations?.length, 0);
  });

  it("deleteRelation fails for missing relation", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteRelation",
      relationId: "rel-missing"
    }]);

    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /does not exist/);
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
});
