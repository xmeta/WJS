# WBS Operations

WBS Operations are semantic edits for WBS-JSON documents. They are intended for human review, AI output, audit logs, and safe automated application.

Use operations when changing an existing WBS document. Avoid asking an AI agent to regenerate the whole WBS document for small edits.

## Why Not Plain JSON Patch?

See [why.md](./why.md).

## Change Set Shape

```json
{
  "schemaVersion": "0.1.0",
  "targetWbsId": "wbs-example",
  "baseRevision": "rev-001",
  "changeSetId": "changeset-001",
  "author": "ai-agent",
  "createdAt": "2026-06-24T00:00:00+09:00",
  "reason": "Add API design work",
  "dryRun": true,
  "operations": []
}
```

`dryRun: true` is recommended for AI-generated proposals. Applying tools may require explicit approval before changing the WBS document.

## v0.1 Operations

### Document Operations

- [setDocumentExtension](./document_operations/setDocumentExtension.md)

### Node Operations

- [addNode](./node_operations/addNode.md)
- [updateNode](./node_operations/updateNode.md)
- [renameNode](./node_operations/renameNode.md)
- [moveNode](./node_operations/moveNode.md)
- [deleteNode](./node_operations/deleteNode.md)
- [changeNodeStatus](./node_operations/changeNodeStatus.md)
- [reorderChildren](./node_operations/reorderChildren.md)

### Relation Operations

- [addRelation](./relation_operations/addRelation.md)
- [updateRelation](./relation_operations/updateRelation.md)
- [deleteRelation](./relation_operations/deleteRelation.md)

### Artifact Operations

- [addArtifact](./artifact_operations/addArtifact.md)
- [updateArtifact](./artifact_operations/updateArtifact.md)
- [deleteArtifact](./artifact_operations/deleteArtifact.md)

### Resource Operations

- [addResource](./resource_operations/addResource.md)
- [updateResource](./resource_operations/updateResource.md)
- [deleteResource](./resource_operations/deleteResource.md)

### Convenience Operations

- [setNodeOutputs](./convenience_operations/setNodeOutputs.md)
- [addNodeOutput](./convenience_operations/addNodeOutput.md)
- [deleteNodeOutput](./convenience_operations/deleteNodeOutput.md)
- [addAcceptanceCriterion](./convenience_operations/addAcceptanceCriterion.md)
- [deleteAcceptanceCriterion](./convenience_operations/deleteAcceptanceCriterion.md)
- [addTag](./convenience_operations/addTag.md)
- [deleteTag](./convenience_operations/deleteTag.md)

Convenience operations can usually be expressed with `updateNode`, but dedicated operations reduce accidental whole-array replacement.

## Future Considerations

The following operations are not part of v0.1:

- [splitNode](./future_considerations/splitNode.md)
- [mergeNodes](./future_considerations/mergeNodes.md)
- [renumberSubtree](./future_considerations/renumberSubtree.md)

## Schema

- [wbs-operations.schema.json](../../schema/wbs-operations.schema.json)
