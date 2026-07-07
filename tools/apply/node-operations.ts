import { type WbsDocument, type WbsNode, type Operation, type ApplyContext } from "./types.ts";
import {
  findNode,
  findNodeIndex,
  getSiblingNodes,
  asArray,
  collectDescendantIds,
  wouldCreateCycle,
  validateSiblingPosition,
  computeInsertIndex,
  insertNodeAtIndex,
  reorderSiblingsInArray,
  renumberSiblingCodes,
  renumberSubtree,
  applyNodePatch,
  relationsReferencingNodes
} from "./helpers.ts";

export function applyAddNode(document: WbsDocument, op: Extract<Operation, { operation: "addNode" }>, ctx: ApplyContext): string | null {
  const { node, position } = op;
  if (findNode(document, node.id)) {
    return `Node '${node.id}' already exists.`;
  }
  if (node.parentId !== null && !findNode(document, node.parentId)) {
    return `parentId '${node.parentId}' does not exist.`;
  }
  if (node.parentId === null) {
    const roots = document.nodes.filter((n) => n.parentId === null);
    if (roots.length > 0) {
      return "Cannot add a second root node.";
    }
  }

  const positionError = validateSiblingPosition(document, node.parentId, position);
  if (positionError) {
    return positionError;
  }

  const newNode: WbsNode = {
    status: "draft",
    assignees: [],
    acceptanceCriteria: [],
    outputs: [],
    tags: [],
    ...node
  };

  const insertIndex = computeInsertIndex(document, node.parentId, position);
  insertNodeAtIndex(document, newNode, insertIndex);
  return null;
}

export function applyUpdateNode(document: WbsDocument, op: Extract<Operation, { operation: "updateNode" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  if ("parentId" in op.changes || "id" in op.changes) {
    return "updateNode cannot change id or parentId; use moveNode instead.";
  }
  applyNodePatch(node, op.changes);
  return null;
}

export function applyRenameNode(document: WbsDocument, op: Extract<Operation, { operation: "renameNode" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  node.name = op.name;
  return null;
}

export function applyMoveNode(document: WbsDocument, op: Extract<Operation, { operation: "moveNode" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  if (op.newParentId !== null && !findNode(document, op.newParentId)) {
    return `newParentId '${op.newParentId}' does not exist.`;
  }
  if (wouldCreateCycle(document, op.nodeId, op.newParentId)) {
    return `Moving node '${op.nodeId}' would create a parentId cycle.`;
  }
  if (op.newParentId === null && node.parentId !== null) {
    const roots = document.nodes.filter((n) => n.parentId === null && n.id !== op.nodeId);
    if (roots.length > 0) {
      return "Cannot move node to root; a root node already exists.";
    }
  }

  const positionError = validateSiblingPosition(document, op.newParentId, op.position);
  if (positionError) {
    return positionError;
  }

  const nodeIndex = findNodeIndex(document, op.nodeId);
  const [moved] = document.nodes.splice(nodeIndex, 1);
  moved.parentId = op.newParentId;
  if (op.newCode !== undefined) {
    moved.code = op.newCode;
  }

  const insertIndex = computeInsertIndex(document, op.newParentId, op.position, op.nodeId);
  insertNodeAtIndex(document, moved, insertIndex);

  if (op.renumberDescendants !== false) {
    if (op.newCode === undefined) {
      renumberSiblingCodes(document, op.newParentId, true);
    } else {
      renumberSubtree(document, op.nodeId);
    }
  }

  return null;
}

export function applyDeleteNode(document: WbsDocument, op: Extract<Operation, { operation: "deleteNode" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  if (node.id === document.rootId) {
    return `Cannot delete root node '${op.nodeId}'.`;
  }

  const relationHandling = op.relationHandling ?? "failIfReferenced";
  let nodesToDelete: Set<string>;

  if (op.deleteMode === "subtree") {
    nodesToDelete = collectDescendantIds(document, op.nodeId);
    nodesToDelete.add(op.nodeId);
  } else {
    nodesToDelete = new Set([op.nodeId]);
    const children = document.nodes.filter((n) => n.parentId === op.nodeId);
    for (const child of children) {
      child.parentId = node.parentId;
    }
  }

  const referencing = relationsReferencingNodes(document, nodesToDelete);
  if (referencing.length > 0) {
    if (relationHandling === "failIfReferenced") {
      return `Relations still reference deleted node(s): ${referencing.map((r) => r.id).join(", ")}.`;
    }
    document.relations = asArray(document.relations).filter((r) => !referencing.includes(r));
  }

  document.nodes = document.nodes.filter((n) => !nodesToDelete.has(n.id));
  return null;
}

export function applyChangeNodeStatus(document: WbsDocument, op: Extract<Operation, { operation: "changeNodeStatus" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  node.status = op.status;
  return null;
}

export function applyReorderChildren(document: WbsDocument, op: Extract<Operation, { operation: "reorderChildren" }>): string | null {
  if (op.parentId !== null && !findNode(document, op.parentId)) {
    return `parentId '${op.parentId}' does not exist.`;
  }

  const currentChildIds = getSiblingNodes(document, op.parentId).map((n) => n.id);
  const orderedSet = new Set(op.orderedChildIds);

  if (op.orderedChildIds.length !== orderedSet.size) {
    return "orderedChildIds contains duplicates.";
  }
  if (currentChildIds.length !== op.orderedChildIds.length) {
    return "orderedChildIds must contain exactly the current children of parentId.";
  }
  for (const childId of currentChildIds) {
    if (!orderedSet.has(childId)) {
      return `orderedChildIds is missing child '${childId}'.`;
    }
  }
  for (const childId of op.orderedChildIds) {
    if (!currentChildIds.includes(childId)) {
      return `orderedChildIds contains unknown child '${childId}'.`;
    }
  }

  reorderSiblingsInArray(document, op.parentId, op.orderedChildIds);

  if (op.renumberChildren) {
    renumberSiblingCodes(document, op.parentId, false);
  }

  return null;
}
