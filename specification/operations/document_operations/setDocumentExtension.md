# setDocumentExtension

## Purpose

Atomically replace one top-level namespace in the WBS document `extensions`
object. This allows a reviewed change set to update vendor- or
organization-specific document configuration without regenerating the WBS
document or changing standard fields.

## Input

```json
{
  "operationId": "op-001",
  "operation": "setDocumentExtension",
  "namespace": "example",
  "value": {
    "profile": "Standard",
    "settings": {
      "warningLimit": 700
    }
  }
}
```

- `namespace` is the top-level extension key to replace.
- `value` is the complete object to store at `extensions[namespace]`.

## Before and After

Before:

```json
{
  "extensions": {
    "example": {
      "profile": "Lean",
      "obsolete": true
    },
    "anotherVendor": {
      "retained": true
    }
  }
}
```

After applying the example operation:

```json
{
  "extensions": {
    "example": {
      "profile": "Standard",
      "settings": {
        "warningLimit": 700
      }
    },
    "anotherVendor": {
      "retained": true
    }
  }
}
```

The selected namespace is replaced as one value; it is not recursively merged.
Other extension namespaces are preserved. Document identity, nodes, relations,
artifacts, resources, and metadata are unchanged.

## Validation Rules

- `namespace` must contain 1 to 64 non-whitespace characters.
- `value` must be a JSON object.
- The resulting WBS document must still pass normal semantic validation.

## Idempotency

Applying the same operation repeatedly is idempotent because each application
sets the selected namespace to the same complete value.

## Failure Conditions

The operation fails schema validation when `namespace` or `value` is missing,
when `namespace` contains whitespace, or when `value` is not an object. Normal
change-set failures such as a mismatched `targetWbsId` also apply.

## Relationship to Other Operations

`setDocumentExtension` is document-scoped. `updateNode` only changes a WBS node
and must not be used for document extensions. This operation does not edit
standard top-level fields or `metadata`.

## AI Misuse Risks

The `value` is a complete replacement. Before generating this operation, an AI
must read the current selected namespace and carry forward every field that
should remain. Omitting a field intentionally removes it from that namespace.
