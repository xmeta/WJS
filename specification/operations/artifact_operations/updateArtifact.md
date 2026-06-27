# updateArtifact

Updates selected fields of one artifact.

## Example

```json
{
  "operation": "updateArtifact",
  "artifactId": "artifact-api-spec",
  "changes": {
    "uri": "./docs/openapi.yaml",
    "description": "Reviewed OpenAPI definition."
  }
}
```

## Meaning

The applying tool merges `changes` into the target artifact.

## Validation

- `artifactId` must reference an existing artifact.
- `changes` must contain at least one allowed artifact field.
- Changed `type` must be an allowed artifact type.

## Idempotency

Idempotent when applying the same values repeatedly.

## Failure Conditions

Fail if the artifact does not exist, `changes` is empty, or changed fields are invalid.

## Misuse Notes

Use a new artifact ID when the old and new artifacts must coexist for traceability.
