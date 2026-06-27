# Terminology

| Term | Meaning |
| --- | --- |
| WBS document | The complete JSON document that represents one WBS. |
| WBS node | A node in the WBS decomposition structure. |
| WBS code | A human-readable hierarchy code such as `1.2.3`. |
| Node ID | A stable machine-readable ID such as `node-api-design`. |
| Artifact | A deliverable or output referenced by WBS nodes. |
| Resource | A person, team, role, or organization. |
| Relation | A non-tree relationship between nodes or external references. |
| Operation | A semantic edit to a WBS document. |
| Change set | A batch of operations targeting one WBS document. |
| Validation rule | A semantic rule that may be checked outside JSON Schema. |

## Japanese Terms

| English | Japanese |
| --- | --- |
| WBS document | WBS文書 |
| WBS node | WBSノード |
| Artifact | 成果物 |
| Resource | リソース |
| Relation | 関係 |
| Operation | 操作 |
| Change set | 変更セット |
| Validation rule | 検証ルール |

## Node Types

- `summary`: an aggregate node used for grouping.
- `deliverable`: a result or deliverable-oriented node.
- `workPackage`: a manageable package of work.
- `activity`: executable work at a finer granularity.
- `milestone`: a zero-duration checkpoint or decision point.
