# Why WBS Operations Instead Of JSON Patch?

JSON Patch is useful for generic JSON editing, but WBS editing needs more intent than a path and a value.

For example:

```json
{
  "op": "remove",
  "path": "/nodes/3"
}
```

This does not explain:

- Which WBS node is being deleted.
- Whether descendants are deleted or reattached.
- What happens to relations pointing at the node.
- Whether artifact or resource references must be detached.
- Whether the edit is safe to apply to the current revision.

A WBS operation carries the domain intent:

```json
{
  "operation": "deleteNode",
  "nodeId": "node-old-task",
  "deleteMode": "subtree"
}
```

This is easier for humans to review and easier for tools to validate.

## AI Safety

AI agents should propose small semantic operations rather than replacing the full WBS document.

```json
{
  "schemaVersion": "0.1.0",
  "targetWbsId": "wbs-care-workflow-system",
  "baseRevision": "rev-2026-06-24-001",
  "changeSetId": "changeset-001",
  "author": "ai-agent",
  "createdAt": "2026-06-24T06:00:00+09:00",
  "reason": "Add BPMN draft and review activities",
  "dryRun": true,
  "operations": [
    {
      "operationId": "op-001",
      "operation": "addNode",
      "comment": "Add BPMN draft activity under current workflow analysis",
      "node": {
        "id": "node-current-bpmn-draft",
        "parentId": "node-current-workflow-analysis",
        "code": "1.1.1.1",
        "name": "Create current workflow BPMN draft",
        "type": "activity",
        "status": "planned",
        "estimate": {
          "value": 2,
          "unit": "personDay"
        },
        "outputs": ["artifact-current-bpmn-draft"]
      },
      "position": {
        "mode": "last"
      }
    },
    {
      "operationId": "op-002",
      "operation": "addArtifact",
      "comment": "Register BPMN draft artifact",
      "artifact": {
        "id": "artifact-current-bpmn-draft",
        "name": "Current workflow BPMN draft",
        "type": "design",
        "uri": "./bpmn/current-workflow-draft.bpmn"
      }
    },
    {
      "operationId": "op-003",
      "operation": "addNode",
      "comment": "Add BPMN review activity",
      "node": {
        "id": "node-current-bpmn-review",
        "parentId": "node-current-workflow-analysis",
        "code": "1.1.1.2",
        "name": "Review current workflow BPMN",
        "type": "activity",
        "status": "planned"
      },
      "position": {
        "mode": "after",
        "referenceNodeId": "node-current-bpmn-draft"
      }
    },
    {
      "operationId": "op-004",
      "operation": "addRelation",
      "comment": "Review depends on the draft",
      "relation": {
        "id": "rel-review-after-draft",
        "type": "dependsOn",
        "source": "node-current-bpmn-review",
        "target": "node-current-bpmn-draft"
      }
    }
  ]
}
```

The change set makes the intended edit reviewable without requiring a full-document diff.

## v0.1 Scope

v0.1 focuses on small, atomic operations:

- Node operations.
- Relation operations.
- Artifact operations.
- Resource operations.
- Convenience operations for node outputs, acceptance criteria, and tags.

Larger refactoring operations such as `splitNode`, `mergeNodes`, and `renumberSubtree` are future considerations because they require more detailed rules for relation transfer, review, rollback, and migration.
