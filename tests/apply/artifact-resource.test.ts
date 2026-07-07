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

describe("artifact and resource operations", () => {
  it("addArtifact and updateArtifact", () => {
    const base = loadBase();
    const add = apply(base, [{
      operation: "addArtifact",
      artifact: { id: "artifact-b", name: "Artifact B", type: "design" }
    }]);
    assert.equal(add.success, true);

    const update = apply(add.document, [{
      operation: "updateArtifact",
      artifactId: "artifact-b",
      changes: { description: "New design" }
    }]);
    assert.equal(update.success, true);
    assert.equal(update.document.artifacts?.find((a) => a.id === "artifact-b")?.description, "New design");
  });

  it("deleteArtifact detaches from node outputs by default", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteArtifact",
      artifactId: "artifact-a"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.artifacts?.length, 0);
    const node = result.document.nodes.find((n) => n.id === "node-child-a");
    assert.deepEqual(node?.outputs, []);
  });

  it("addResource and updateResource", () => {
    const base = loadBase();
    const add = apply(base, [{
      operation: "addResource",
      resource: { id: "resource-qa", name: "QA", type: "role" }
    }]);
    assert.equal(add.success, true);

    const update = apply(add.document, [{
      operation: "updateResource",
      resourceId: "resource-qa",
      changes: { email: "qa@example.com" }
    }]);
    assert.equal(update.success, true);
    assert.equal(update.document.resources?.find((r) => r.id === "resource-qa")?.email, "qa@example.com");
  });

  it("deleteResource detaches from owner and assignees by default", () => {
    const base = loadBase();
    const result = apply(base, [{
      operation: "deleteResource",
      resourceId: "resource-dev"
    }]);

    assert.equal(result.success, true);
    assert.equal(result.document.resources?.length, 0);
    const node = result.document.nodes.find((n) => n.id === "node-child-b");
    assert.equal(node?.owner, undefined);
    assert.deepEqual(node?.assignees, []);
  });

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
