# Conformance

This document defines conformance expectations for WBS-JSON v0.1 producers, consumers, and validators.

## WBS Document Producers

A conforming producer must:

- Emit JSON that validates against `schema/wbs-json.schema.json`.
- Use the flat `nodes` plus `parentId` structure as the canonical form.
- Put vendor-specific data under `extensions`.
- Preserve stable IDs when modifying existing WBS documents.
- Avoid using child order as execution order.

## WBS Document Consumers

A conforming consumer must:

- Treat `nodes` and `parentId` as the source of the WBS tree.
- Treat `relations` as non-tree semantic links.
- Ignore unknown extension content it does not understand.
- Not require a specific project management, issue tracking, BPMN, or Gantt tool.

## Validators

A conforming validator should perform two layers of validation:

- JSON Schema validation for structural checks.
- Semantic validation for rules listed in [validation-rules.md](./validation-rules.md).

Some semantic rules, such as cycle detection and ID reference checks, are intentionally kept out of JSON Schema to keep schemas portable and implementable.
