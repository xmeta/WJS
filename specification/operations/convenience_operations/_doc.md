# Convenience Operations

Convenience operations exist because AI agents and review tools benefit from narrow, intention-revealing edits.

Each operation in this directory can be expressed with `updateNode`, but the dedicated operation avoids replacing an entire array when only one item should be added or removed.

## Operations

- `setNodeOutputs`: replaces the whole `outputs` array.
- `addNodeOutput`: adds one artifact ID to `outputs`.
- `deleteNodeOutput`: deletes one artifact ID from `outputs`.
- `addAcceptanceCriterion`: adds one acceptance criterion.
- `deleteAcceptanceCriterion`: deletes one acceptance criterion.
- `addTag`: adds one tag idempotently.
- `deleteTag`: deletes one tag idempotently.

## Review Guidance

Review `setNodeOutputs` more carefully than append/delete style operations because it can remove existing outputs.

Prefer `addNodeOutput` or `deleteNodeOutput` when only one output artifact should change.

AI-generated `deleteAcceptanceCriterion` operations should prefer `criterion` over `index` because text is more stable and reviewable.
