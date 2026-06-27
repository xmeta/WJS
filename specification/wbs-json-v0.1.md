# WBS-JSON v0.1 Specification

WBS-JSON v0.1 defines a JSON representation for Work Breakdown Structures that is readable by humans, stable for tools, and safe for AI-assisted editing.

## Document Shape

The canonical WBS document is a flat list of nodes plus explicit references:

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

`nodes` is the authoritative structure. A rendered tree may be derived from `nodes[].parentId`, but `children` is not part of the canonical v0.1 document.

## Nodes

A WBS node represents a summary, deliverable, work package, activity, or milestone.

```json
{
  "id": "node-api-design",
  "parentId": "node-system-design",
  "code": "1.2.1",
  "name": "API Design",
  "type": "workPackage",
  "status": "planned",
  "owner": "resource-backend-team",
  "assignees": ["resource-backend-team"],
  "progressPercent": 25,
  "outputs": ["artifact-openapi-yaml"],
  "acceptanceCriteria": ["OpenAPI paths and schemas are reviewed"],
  "tags": ["backend"]
}
```

Required fields are `id`, `parentId`, `code`, `name`, and `type`.

`parentId` is `null` only for the root node. The root node ID must match top-level `rootId`.

## Relations

Relations describe non-tree relationships.

```json
{
  "id": "rel-api-after-data-model",
  "type": "dependsOn",
  "source": "node-api-design",
  "target": "node-data-model"
}
```

`parentId` expresses decomposition. `relations` expresses dependencies, artifact flow, requirement links, BPMN links, issue links, and other cross references. Execution order must be represented with `dependsOn`, not with child order.

## Artifacts

Artifacts describe outputs or external deliverables.

```json
{
  "id": "artifact-openapi-yaml",
  "name": "OpenAPI specification",
  "type": "document",
  "uri": "./docs/openapi.yaml"
}
```

Nodes reference artifacts with `outputs`.

## Resources

Resources describe people, teams, roles, or organizations.

```json
{
  "id": "resource-backend-team",
  "name": "Backend Team",
  "type": "team"
}
```

Nodes reference resources with `owner` and `assignees`. `owner` is the single responsible resource. `assignees` is an optional array of resources assigned to work on the node.

Progress may be represented with `progressPercent`, a number from 0 to 100. `status` and `progressPercent` are independent: for example, a node may be `inProgress` with `progressPercent: 40`.

## Extensions

Vendor-specific or organization-specific data must be placed under `extensions`.

```json
{
  "extensions": {
    "exampleTool": {
      "viewId": "view-001"
    }
  }
}
```

Do not add tool-specific fields such as `jiraIssueId` directly to core objects. Use a relation such as `linkedToIssue` or place extra tool data under `extensions`.

## Operations

WBS-JSON edits should be represented with semantic operations defined by [WBS Operations](./operations/README.md). This allows humans and tools to review intent without comparing whole regenerated documents.
