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

describe("document operations", () => {
  it("setDocumentExtension replaces one namespace and preserves the document", () => {
    const base = loadBase();
    base.extensions = {
      example: { profile: "Lean", stale: true },
      anotherVendor: { retained: true }
    };
    const structuralSnapshot = {
      id: base.id,
      rootId: base.rootId,
      nodes: structuredClone(base.nodes),
      relations: structuredClone(base.relations),
      artifacts: structuredClone(base.artifacts),
      resources: structuredClone(base.resources),
      metadata: structuredClone(base.metadata)
    };
    const operation: ChangeSet["operations"][number] = {
      operation: "setDocumentExtension",
      namespace: "example",
      value: {
        profile: "Standard",
        settings: { warningLimit: 700 }
      }
    };

    const result = apply(base, [operation]);
    const repeated = apply(result.document, [operation]);

    assert.equal(result.success, true);
    assert.equal(repeated.success, true);
    assert.deepEqual(result.document.extensions?.anotherVendor, { retained: true });
    assert.deepEqual(result.document.extensions?.example, {
      profile: "Standard",
      settings: { warningLimit: 700 }
    });
    assert.deepEqual(repeated.document, result.document);
    assert.deepEqual({
      id: result.document.id,
      rootId: result.document.rootId,
      nodes: result.document.nodes,
      relations: result.document.relations,
      artifacts: result.document.artifacts,
      resources: result.document.resources,
      metadata: result.document.metadata
    }, structuralSnapshot);
    assert.deepEqual(base.extensions?.example, { profile: "Lean", stale: true });
  });
});
