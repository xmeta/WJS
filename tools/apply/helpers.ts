import {
  type WbsDocument,
  type WbsNode,
  type SiblingPosition,
  type Relation,
  type Operation,
  type ApplyError
} from "./types.ts";

export function cloneDocument(document: WbsDocument): WbsDocument {
  return structuredClone(document);
}

export function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function findNode(document: WbsDocument, nodeId: string): WbsNode | undefined {
  return document.nodes.find((node) => node.id === nodeId);
}

export function findNodeIndex(document: WbsDocument, nodeId: string): number {
  return document.nodes.findIndex((node) => node.id === nodeId);
}

export function getSiblingNodes(document: WbsDocument, parentId: string | null): WbsNode[] {
  return document.nodes.filter((node) => node.parentId === parentId);
}

export function getSiblingIndices(document: WbsDocument, parentId: string | null): number[] {
  const indices: number[] = [];
  document.nodes.forEach((node, index) => {
    if (node.parentId === parentId) {
      indices.push(index);
    }
  });
  return indices;
}

export function collectDescendantIds(document: WbsDocument, nodeId: string): Set<string> {
  const descendants = new Set<string>();
  const visit = (id: string): void => {
    for (const node of document.nodes) {
      if (node.parentId === id) {
        descendants.add(node.id);
        visit(node.id);
      }
    }
  };
  visit(nodeId);
  return descendants;
}

export function wouldCreateCycle(document: WbsDocument, nodeId: string, newParentId: string | null): boolean {
  if (newParentId === null) {
    return false;
  }
  if (newParentId === nodeId) {
    return true;
  }
  const descendants = collectDescendantIds(document, nodeId);
  return descendants.has(newParentId);
}

export function validateSiblingPosition(
  document: WbsDocument,
  parentId: string | null,
  position: SiblingPosition | undefined
): string | null {
  const mode = position?.mode ?? "last";
  if (mode === "before" || mode === "after") {
    if (!position?.referenceNodeId) {
      return `position.mode '${mode}' requires referenceNodeId.`;
    }
    const reference = findNode(document, position.referenceNodeId);
    if (!reference) {
      return `referenceNodeId '${position.referenceNodeId}' does not exist.`;
    }
    if (reference.parentId !== parentId) {
      return `referenceNodeId '${position.referenceNodeId}' is not a sibling under the same parent.`;
    }
  } else if (position?.referenceNodeId) {
    return `position.mode '${mode}' must not include referenceNodeId.`;
  }
  return null;
}

export function computeInsertIndex(
  document: WbsDocument,
  parentId: string | null,
  position: SiblingPosition | undefined,
  excludeNodeId?: string
): number {
  const mode = position?.mode ?? "last";
  const siblingIndices = getSiblingIndices(document, parentId).filter(
    (index) => document.nodes[index].id !== excludeNodeId
  );

  if (siblingIndices.length === 0) {
    const parentIndex = parentId === null ? -1 : findNodeIndex(document, parentId);
    return parentIndex === -1 ? document.nodes.length : parentIndex + 1;
  }

  if (mode === "first") {
    return siblingIndices[0];
  }
  if (mode === "last") {
    return siblingIndices[siblingIndices.length - 1] + 1;
  }

  const referenceIndex = findNodeIndex(document, position!.referenceNodeId!);
  return mode === "before" ? referenceIndex : referenceIndex + 1;
}

export function insertNodeAtIndex(document: WbsDocument, node: WbsNode, index: number): void {
  const clamped = Math.max(0, Math.min(index, document.nodes.length));
  document.nodes.splice(clamped, 0, node);
}

export function reorderSiblingsInArray(document: WbsDocument, parentId: string | null, orderedChildIds: string[]): void {
  const siblingIndices = getSiblingIndices(document, parentId);
  if (siblingIndices.length === 0) {
    return;
  }

  const siblingsById = new Map(getSiblingNodes(document, parentId).map((node) => [node.id, node]));
  const reordered = orderedChildIds.map((id) => siblingsById.get(id)!);
  const insertAt = siblingIndices[0];

  for (let offset = siblingIndices.length - 1; offset >= 0; offset -= 1) {
    document.nodes.splice(siblingIndices[offset], 1);
  }
  document.nodes.splice(insertAt, 0, ...reordered);
}

export function childCode(parentCode: string | null, index: number): string {
  const segment = String(index + 1);
  return parentCode === null ? segment : `${parentCode}.${segment}`;
}

export function renumberSiblingCodes(document: WbsDocument, parentId: string | null, recursive: boolean): void {
  const parentCode = parentId === null ? null : findNode(document, parentId)?.code ?? null;
  const siblings = getSiblingNodes(document, parentId);

  siblings.forEach((sibling, index) => {
    sibling.code = childCode(parentCode, index);
    if (recursive) {
      renumberSiblingCodes(document, sibling.id, true);
    }
  });
}

export function renumberSubtree(document: WbsDocument, nodeId: string): void {
  renumberSiblingCodes(document, nodeId, true);
}

export function normalizeCriterion(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function applyNodePatch(node: WbsNode, changes: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) {
      delete (node as Record<string, unknown>)[key];
    } else {
      (node as Record<string, unknown>)[key] = value;
    }
  }
}

export function applyEntityPatch<T extends Record<string, unknown>>(entity: T, changes: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) {
      delete entity[key];
    } else {
      entity[key] = value;
    }
  }
}

export function relationsReferencingNodes(document: WbsDocument, nodeIds: Set<string>): Relation[] {
  return asArray(document.relations).filter(
    (relation) => nodeIds.has(relation.source) || nodeIds.has(relation.target)
  );
}

export function makeError(index: number, operation: Operation, message: string): ApplyError {
  return {
    operationIndex: index,
    operationId: operation.operationId,
    operation: operation.operation,
    message
  };
}
