# deleteArtifact

Deletes one artifact.

## Example

```json
{
  "operation": "deleteArtifact",
  "artifactId": "artifact-obsolete-spec",
  "detachFromNodes": true
}
```

## Meaning

The applying tool removes the artifact from `artifacts`. If `detachFromNodes` is true, it also removes the artifact ID from node `outputs`.

## Validation

- `artifactId` must reference an existing artifact unless idempotent delete is enabled.
- If `detachFromNodes` is false, the artifact must not be referenced by any node output.

## Idempotency

May be treated as idempotent when the artifact is already absent, but tools should report a warning.

## Failure Conditions

Fail if the artifact is referenced and detaching is disabled, or if the artifact does not exist and idempotent delete is not enabled.

## Misuse Notes

Deleting an artifact does not delete external files identified by `uri`.
