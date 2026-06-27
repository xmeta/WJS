# WBS-JSON

WBS-JSON is a vendor-neutral JSON format for representing, exchanging, validating, and safely editing Work Breakdown Structures.

The v0.1 format uses a flat canonical structure:

```json
{
  "schemaVersion": "0.1.0",
  "id": "wbs-example",
  "name": "Example WBS",
  "rootId": "node-root",
  "nodes": [],
  "relations": [],
  "resources": [],
  "artifacts": [],
  "metadata": {},
  "extensions": {}
}
```

`nodes[].parentId` represents the WBS decomposition tree. `relations` represents non-tree relationships such as `dependsOn`, `produces`, `implementsRequirement`, and `linkedToIssue`. Child order and `parentId` do not define execution order.

## Key Concepts

- WBS document: the whole JSON document.
- WBS node: one item in the breakdown structure.
- Artifact: a deliverable or output referenced by nodes.
- Resource: a person, team, role, or organization.
- Relation: a semantic relationship other than the parent-child tree.
- Operation: a reviewable semantic edit described by `wbs-operations.schema.json`.

WBS node types are:

- `summary`
- `deliverable`
- `workPackage`
- `activity`
- `milestone`

Common WBS node fields include:

- `owner`: the single responsible Resource ID.
- `assignees`: Resource IDs assigned to work on the node.
- `progressPercent`: optional completion percentage from 0 to 100.
- `outputs`: Artifact IDs produced by the node.

## Files

- [Specification v0.1](./specification/wbs-json-v0.1.md)
- [Terminology](./specification/terminology.md)
- [Conformance](./specification/conformance.md)
- [Validation rules](./specification/validation-rules.md)
- [Operations](./specification/operations/README.md)
- [WBS document schema](./schema/wbs-json.schema.json)
- [WBS operations schema](./schema/wbs-operations.schema.json)

## Examples

- [Minimal WBS](./examples/minimal.json)
- [Software project WBS](./examples/software-project.json)
- [Business process improvement WBS](./examples/business-process-improvement.json)
- [Care workflow system WBS](./examples/care-workflow-system.json)

## Validation

Install dependencies and validate all examples and tests:

```sh
npm install
npm run validate:all
```

Validate one file:

```sh
npm run validate -- examples/minimal.json
```

## Apply Operations

Apply a change set to a WBS document:

```sh
npm run apply -- examples/minimal.json my-changeset.json -o result.json
```

Preview a dry-run change set (default: does not write when `dryRun: true`):

```sh
npm run apply -- examples/minimal.json my-changeset.json
```

Force writing even when the change set has `dryRun: true`:

```sh
npm run apply -- examples/minimal.json my-changeset.json -o result.json --force
```

Run apply tool tests:

```sh
npm test
```

## WBS-JSON Editor

Single-file browser editor/viewer at `tools/edit_and_viewer/wbs-json-editor.html` (open via `file://`).

Edit sources under `tools/edit_and_viewer/src/`, then rebuild the distributable HTML:

```sh
npm run build:editor
```

Do not edit `wbs-json-editor.html` directly; it is generated with a header comment.

## AI Editing

AI agents should prefer semantic operations over regenerating a full WBS document.

```json
{
  "operation": "renameNode",
  "nodeId": "node-api-design",
  "name": "API Design"
}
```

This is easier to review than a low-level JSON Patch path such as `/nodes/3/name`, and it avoids accidental rewrites of unrelated data.

For array-like node fields, prefer narrow operations such as `addNodeOutput`, `deleteNodeOutput`, `addAcceptanceCriterion`, `deleteAcceptanceCriterion`, `addTag`, and `deleteTag` when changing one item.
