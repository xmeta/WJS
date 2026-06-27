# Validation Rules

These rules complement JSON Schema. Implementations should report clear errors that include the relevant ID or path.

## WBS Document Rules

- `nodes[].id` must be unique within the WBS document.
- `rootId` must reference an existing `nodes[].id`.
- Exactly one node should have `parentId: null`.
- The node with `parentId: null` must have the same ID as `rootId`.
- Each non-null `nodes[].parentId` must reference an existing `nodes[].id`.
- The `parentId` graph must not contain cycles.
- A node must not be its own parent.
- Sibling `code` values should be unique under the same parent.
- `code` should reflect the hierarchy, but strict code renumbering is a semantic validation policy rather than a JSON Schema rule.

## Relation Rules

- `relations[].id` must be unique within the WBS document.
- For `dependsOn` and `blocks`, `source` and `target` should reference existing WBS node IDs.
- `dependsOn` relations should not form dependency cycles.
- `produces` should normally use a WBS node as `source` and an artifact ID as `target`.
- `consumes` should normally use a WBS node as `source` and an artifact ID as `target`.
- `implementsRequirement`, `refinesBpmnTask`, and `linkedToIssue` may target external IDs such as `req:REQ-001`, `bpmn:Task_1`, or `jira:PROJ-123`.
- `relatedTo` is intentionally broad; domain-specific meaning should be documented in `extensions`.

## Artifact And Resource Rules

- `artifacts[].id` must be unique within the WBS document.
- `resources[].id` must be unique within the WBS document.
- Each `nodes[].outputs[]` value should reference an existing artifact ID.
- Each `nodes[].owner` value should reference an existing resource ID.
- Each `nodes[].assignees[]` value should reference an existing resource ID.
- `nodes[].assignees` should not contain duplicate resource IDs.
- `nodes[].progressPercent` must be between 0 and 100 when present.
- Deleting an artifact or resource should either detach references or fail with a clear error.
- `deleteResource.detachFromNodes` should remove matching `owner` values and matching entries in `assignees`.

## Operation Rules

- A change set should include `baseRevision` when the current WBS revision is known.
- AI-generated change sets should use `dryRun: true` by default.
- Each operation should include `operationId` when the change set contains more than one operation.
- `addNode.node.id` must not already exist.
- `addNode.position` and `moveNode.position` must include `referenceNodeId` when `mode` is `before` or `after`.
- `addNode.position` and `moveNode.position` must not include `referenceNodeId` when `mode` is `first` or `last`.
- `moveNode` must not create a `parentId` cycle.
- `deleteNode` with `deleteMode: subtree` must define how relations to deleted nodes are handled by the applying tool.
- `deleteNode.relationHandling: failIfReferenced` must fail when any deleted node is still referenced by a relation.
- `deleteNode.relationHandling: deleteReferencingRelations` may delete relations whose `source` or `target` is a deleted node.
- `reorderChildren.orderedChildIds` must contain exactly the same children currently belonging to `parentId`.
- `addNodeOutput.artifactId` and `deleteNodeOutput.artifactId` should reference an existing artifact.
- `addNodeOutput` must not create duplicate values in `outputs`.
- `deleteAcceptanceCriterion` must specify exactly one of `criterion` or `index`.
- `addTag.tag` and `deleteTag.tag` must be non-empty and must not contain whitespace.
