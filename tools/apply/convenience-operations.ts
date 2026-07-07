import { type WbsDocument, type Operation, type ApplyContext } from "./types.ts";
import { findNode, asArray, normalizeCriterion } from "./helpers.ts";

export function applySetNodeOutputs(document: WbsDocument, op: Extract<Operation, { operation: "setNodeOutputs" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  node.outputs = [...op.outputs];
  return null;
}

export function applyAddNodeOutput(
  document: WbsDocument,
  op: Extract<Operation, { operation: "addNodeOutput" }>,
  ctx: ApplyContext
): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  const outputs = asArray(node.outputs);
  if (outputs.includes(op.artifactId)) {
    ctx.warnings.push(`Node '${op.nodeId}' already has output '${op.artifactId}'.`);
    return null;
  }
  node.outputs = [...outputs, op.artifactId];
  return null;
}

export function applyDeleteNodeOutput(
  document: WbsDocument,
  op: Extract<Operation, { operation: "deleteNodeOutput" }>,
  ctx: ApplyContext
): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  const outputs = asArray(node.outputs);
  if (!outputs.includes(op.artifactId)) {
    ctx.warnings.push(`Node '${op.nodeId}' does not have output '${op.artifactId}'.`);
    return null;
  }
  node.outputs = outputs.filter((id) => id !== op.artifactId);
  return null;
}

export function applyAddAcceptanceCriterion(
  document: WbsDocument,
  op: Extract<Operation, { operation: "addAcceptanceCriterion" }>
): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  const criteria = asArray(node.acceptanceCriteria);
  node.acceptanceCriteria = [...criteria, op.criterion];
  return null;
}

export function applyDeleteAcceptanceCriterion(
  document: WbsDocument,
  op: Extract<Operation, { operation: "deleteAcceptanceCriterion" }>,
  ctx: ApplyContext
): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }

  const criteria = asArray(node.acceptanceCriteria);
  const hasCriterion = op.criterion !== undefined;
  const hasIndex = op.index !== undefined;

  if (hasCriterion && hasIndex) {
    return "deleteAcceptanceCriterion must specify exactly one of criterion or index.";
  }
  if (!hasCriterion && !hasIndex) {
    return "deleteAcceptanceCriterion requires criterion or index.";
  }

  if (hasIndex) {
    if (op.index! < 0 || op.index! >= criteria.length) {
      return `index ${op.index} is out of bounds for acceptanceCriteria.`;
    }
    node.acceptanceCriteria = criteria.filter((_, i) => i !== op.index);
    return null;
  }

  const matchMode = op.matchMode ?? "exact";
  const target = matchMode === "normalized" ? normalizeCriterion(op.criterion!) : op.criterion!;
  const index = criteria.findIndex((c) =>
    matchMode === "normalized" ? normalizeCriterion(c) === target : c === target
  );

  if (index === -1) {
    ctx.warnings.push(`Criterion '${op.criterion}' not found on node '${op.nodeId}'.`);
    return null;
  }

  node.acceptanceCriteria = criteria.filter((_, i) => i !== index);
  return null;
}

export function applyAddTag(
  document: WbsDocument,
  op: Extract<Operation, { operation: "addTag" }>,
  ctx: ApplyContext
): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  const tags = asArray(node.tags);
  if (tags.includes(op.tag)) {
    ctx.warnings.push(`Node '${op.nodeId}' already has tag '${op.tag}'.`);
    return null;
  }
  node.tags = [...tags, op.tag];
  return null;
}

export function applyDeleteTag(
  document: WbsDocument,
  op: Extract<Operation, { operation: "deleteTag" }>,
  ctx: ApplyContext
): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  const tags = asArray(node.tags);
  if (!tags.includes(op.tag)) {
    ctx.warnings.push(`Node '${op.nodeId}' does not have tag '${op.tag}'.`);
    return null;
  }
  node.tags = tags.filter((t) => t !== op.tag);
  return null;
}
