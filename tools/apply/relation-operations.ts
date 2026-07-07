import { type WbsDocument, type Operation } from "./types.ts";
import { asArray, applyEntityPatch } from "./helpers.ts";

export function applyAddRelation(document: WbsDocument, op: Extract<Operation, { operation: "addRelation" }>): string | null {
  const relations = asArray(document.relations);
  if (relations.some((r) => r.id === op.relation.id)) {
    return `Relation '${op.relation.id}' already exists.`;
  }
  document.relations = [...relations, { ...op.relation }];
  return null;
}

export function applyUpdateRelation(document: WbsDocument, op: Extract<Operation, { operation: "updateRelation" }>): string | null {
  const relation = asArray(document.relations).find((r) => r.id === op.relationId);
  if (!relation) {
    return `Relation '${op.relationId}' does not exist.`;
  }
  applyEntityPatch(relation as Record<string, unknown>, op.changes);
  return null;
}

export function applyDeleteRelation(document: WbsDocument, op: Extract<Operation, { operation: "deleteRelation" }>): string | null {
  const relations = asArray(document.relations);
  if (!relations.some((r) => r.id === op.relationId)) {
    return `Relation '${op.relationId}' does not exist.`;
  }
  document.relations = relations.filter((r) => r.id !== op.relationId);
  return null;
}
