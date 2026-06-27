import { validateJsonWithSchema, validateWbsDocumentSemantics } from "./validate.ts";

// --- Types ---

export type Effort = {
  value: number;
  unit: string;
};

export type WbsNode = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  type: string;
  description?: string;
  status?: string;
  owner?: string;
  assignees?: string[];
  estimate?: Effort;
  actual?: Effort;
  startDate?: string;
  endDate?: string;
  progressPercent?: number;
  acceptanceCriteria?: string[];
  outputs?: string[];
  tags?: string[];
  extensions?: Record<string, unknown>;
};

export type Relation = {
  id: string;
  type: string;
  source: string;
  target: string;
  description?: string;
  extensions?: Record<string, unknown>;
};

export type Artifact = {
  id: string;
  name: string;
  type: string;
  uri?: string;
  description?: string;
  extensions?: Record<string, unknown>;
};

export type Resource = {
  id: string;
  name: string;
  type: string;
  email?: string;
  extensions?: Record<string, unknown>;
};

export type WbsDocument = {
  schemaVersion: string;
  id: string;
  name: string;
  description?: string;
  rootId: string;
  nodes: WbsNode[];
  relations?: Relation[];
  resources?: Resource[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

export type SiblingPosition = {
  mode?: "first" | "last" | "before" | "after";
  referenceNodeId?: string;
};

type OperationCommon = {
  operationId?: string;
  comment?: string;
};

export type Operation =
  | (OperationCommon & { operation: "addNode"; node: WbsNode; position?: SiblingPosition })
  | (OperationCommon & { operation: "updateNode"; nodeId: string; changes: Record<string, unknown> })
  | (OperationCommon & { operation: "renameNode"; nodeId: string; name: string })
  | (OperationCommon & {
      operation: "moveNode";
      nodeId: string;
      newParentId: string | null;
      newCode?: string;
      position?: SiblingPosition;
      renumberDescendants?: boolean;
    })
  | (OperationCommon & {
      operation: "deleteNode";
      nodeId: string;
      deleteMode: "nodeOnly" | "subtree";
      relationHandling?: "failIfReferenced" | "deleteReferencingRelations";
    })
  | (OperationCommon & { operation: "changeNodeStatus"; nodeId: string; status: string })
  | (OperationCommon & {
      operation: "reorderChildren";
      parentId: string | null;
      orderedChildIds: string[];
      renumberChildren?: boolean;
    })
  | (OperationCommon & { operation: "addRelation"; relation: Relation })
  | (OperationCommon & { operation: "updateRelation"; relationId: string; changes: Record<string, unknown> })
  | (OperationCommon & { operation: "deleteRelation"; relationId: string })
  | (OperationCommon & { operation: "addArtifact"; artifact: Artifact })
  | (OperationCommon & { operation: "updateArtifact"; artifactId: string; changes: Record<string, unknown> })
  | (OperationCommon & { operation: "deleteArtifact"; artifactId: string; detachFromNodes?: boolean })
  | (OperationCommon & { operation: "addResource"; resource: Resource })
  | (OperationCommon & { operation: "updateResource"; resourceId: string; changes: Record<string, unknown> })
  | (OperationCommon & { operation: "deleteResource"; resourceId: string; detachFromNodes?: boolean })
  | (OperationCommon & { operation: "setNodeOutputs"; nodeId: string; outputs: string[] })
  | (OperationCommon & { operation: "addNodeOutput"; nodeId: string; artifactId: string })
  | (OperationCommon & { operation: "deleteNodeOutput"; nodeId: string; artifactId: string })
  | (OperationCommon & { operation: "addAcceptanceCriterion"; nodeId: string; criterion: string })
  | (OperationCommon & {
      operation: "deleteAcceptanceCriterion";
      nodeId: string;
      criterion?: string;
      index?: number;
      matchMode?: "exact" | "normalized";
    })
  | (OperationCommon & { operation: "addTag"; nodeId: string; tag: string })
  | (OperationCommon & { operation: "deleteTag"; nodeId: string; tag: string });

export type ChangeSet = {
  schemaVersion: string;
  targetWbsId: string;
  baseRevision?: string;
  changeSetId?: string;
  author?: string;
  createdAt?: string;
  reason?: string;
  dryRun?: boolean;
  operations: Operation[];
};

export type ApplyError = {
  operationIndex: number;
  operationId?: string;
  operation: string;
  message: string;
};

export type ApplyOptions = {
  forceDryRun?: boolean;
  preview?: boolean;
  strictBaseRevision?: boolean;
  expectedRevision?: string;
};

export type ApplyResult = {
  success: boolean;
  document: WbsDocument;
  applied: boolean;
  errors: ApplyError[];
  warnings: string[];
};

type ApplyContext = {
  warnings: string[];
};

// --- Helpers ---

export function cloneDocument(document: WbsDocument): WbsDocument {
  return structuredClone(document);
}

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function findNode(document: WbsDocument, nodeId: string): WbsNode | undefined {
  return document.nodes.find((node) => node.id === nodeId);
}

function findNodeIndex(document: WbsDocument, nodeId: string): number {
  return document.nodes.findIndex((node) => node.id === nodeId);
}

function getSiblingNodes(document: WbsDocument, parentId: string | null): WbsNode[] {
  return document.nodes.filter((node) => node.parentId === parentId);
}

function getSiblingIndices(document: WbsDocument, parentId: string | null): number[] {
  const indices: number[] = [];
  document.nodes.forEach((node, index) => {
    if (node.parentId === parentId) {
      indices.push(index);
    }
  });
  return indices;
}

function collectDescendantIds(document: WbsDocument, nodeId: string): Set<string> {
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

function wouldCreateCycle(document: WbsDocument, nodeId: string, newParentId: string | null): boolean {
  if (newParentId === null) {
    return false;
  }
  if (newParentId === nodeId) {
    return true;
  }
  const descendants = collectDescendantIds(document, nodeId);
  return descendants.has(newParentId);
}

function validateSiblingPosition(
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

function computeInsertIndex(
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

function insertNodeAtIndex(document: WbsDocument, node: WbsNode, index: number): void {
  const clamped = Math.max(0, Math.min(index, document.nodes.length));
  document.nodes.splice(clamped, 0, node);
}

function reorderSiblingsInArray(document: WbsDocument, parentId: string | null, orderedChildIds: string[]): void {
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

function childCode(parentCode: string | null, index: number): string {
  const segment = String(index + 1);
  return parentCode === null ? segment : `${parentCode}.${segment}`;
}

function renumberSiblingCodes(document: WbsDocument, parentId: string | null, recursive: boolean): void {
  const parentCode = parentId === null ? null : findNode(document, parentId)?.code ?? null;
  const siblings = getSiblingNodes(document, parentId);

  siblings.forEach((sibling, index) => {
    sibling.code = childCode(parentCode, index);
    if (recursive) {
      renumberSiblingCodes(document, sibling.id, true);
    }
  });
}

function renumberSubtree(document: WbsDocument, nodeId: string): void {
  renumberSiblingCodes(document, nodeId, true);
}

function normalizeCriterion(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function applyNodePatch(node: WbsNode, changes: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) {
      delete (node as Record<string, unknown>)[key];
    } else {
      (node as Record<string, unknown>)[key] = value;
    }
  }
}

function applyEntityPatch<T extends Record<string, unknown>>(entity: T, changes: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) {
      delete entity[key];
    } else {
      entity[key] = value;
    }
  }
}

function relationsReferencingNodes(document: WbsDocument, nodeIds: Set<string>): Relation[] {
  return asArray(document.relations).filter(
    (relation) => nodeIds.has(relation.source) || nodeIds.has(relation.target)
  );
}

function makeError(index: number, operation: Operation, message: string): ApplyError {
  return {
    operationIndex: index,
    operationId: operation.operationId,
    operation: operation.operation,
    message
  };
}

// --- Operation Handlers ---

function applyAddNode(document: WbsDocument, op: Extract<Operation, { operation: "addNode" }>, ctx: ApplyContext): string | null {
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

function applyUpdateNode(document: WbsDocument, op: Extract<Operation, { operation: "updateNode" }>): string | null {
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

function applyRenameNode(document: WbsDocument, op: Extract<Operation, { operation: "renameNode" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  node.name = op.name;
  return null;
}

function applyMoveNode(document: WbsDocument, op: Extract<Operation, { operation: "moveNode" }>): string | null {
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

function applyDeleteNode(document: WbsDocument, op: Extract<Operation, { operation: "deleteNode" }>): string | null {
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

function applyChangeNodeStatus(document: WbsDocument, op: Extract<Operation, { operation: "changeNodeStatus" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  node.status = op.status;
  return null;
}

function applyReorderChildren(document: WbsDocument, op: Extract<Operation, { operation: "reorderChildren" }>): string | null {
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

function applyAddRelation(document: WbsDocument, op: Extract<Operation, { operation: "addRelation" }>): string | null {
  const relations = asArray(document.relations);
  if (relations.some((r) => r.id === op.relation.id)) {
    return `Relation '${op.relation.id}' already exists.`;
  }
  document.relations = [...relations, { ...op.relation }];
  return null;
}

function applyUpdateRelation(document: WbsDocument, op: Extract<Operation, { operation: "updateRelation" }>): string | null {
  const relation = asArray(document.relations).find((r) => r.id === op.relationId);
  if (!relation) {
    return `Relation '${op.relationId}' does not exist.`;
  }
  applyEntityPatch(relation as Record<string, unknown>, op.changes);
  return null;
}

function applyDeleteRelation(document: WbsDocument, op: Extract<Operation, { operation: "deleteRelation" }>): string | null {
  const relations = asArray(document.relations);
  if (!relations.some((r) => r.id === op.relationId)) {
    return `Relation '${op.relationId}' does not exist.`;
  }
  document.relations = relations.filter((r) => r.id !== op.relationId);
  return null;
}

function applyAddArtifact(document: WbsDocument, op: Extract<Operation, { operation: "addArtifact" }>): string | null {
  const artifacts = asArray(document.artifacts);
  if (artifacts.some((a) => a.id === op.artifact.id)) {
    return `Artifact '${op.artifact.id}' already exists.`;
  }
  document.artifacts = [...artifacts, { ...op.artifact }];
  return null;
}

function applyUpdateArtifact(document: WbsDocument, op: Extract<Operation, { operation: "updateArtifact" }>): string | null {
  const artifact = asArray(document.artifacts).find((a) => a.id === op.artifactId);
  if (!artifact) {
    return `Artifact '${op.artifactId}' does not exist.`;
  }
  applyEntityPatch(artifact as Record<string, unknown>, op.changes);
  return null;
}

function applyDeleteArtifact(
  document: WbsDocument,
  op: Extract<Operation, { operation: "deleteArtifact" }>,
  ctx: ApplyContext
): string | null {
  const artifacts = asArray(document.artifacts);
  if (!artifacts.some((a) => a.id === op.artifactId)) {
    ctx.warnings.push(`Artifact '${op.artifactId}' is already absent.`);
    return null;
  }

  const referenced = document.nodes.some((node) => asArray(node.outputs).includes(op.artifactId));
  const detach = op.detachFromNodes !== false;

  if (referenced && !detach) {
    return `Artifact '${op.artifactId}' is referenced by node outputs and detachFromNodes is false.`;
  }

  document.artifacts = artifacts.filter((a) => a.id !== op.artifactId);
  if (detach) {
    for (const node of document.nodes) {
      if (node.outputs) {
        node.outputs = node.outputs.filter((id) => id !== op.artifactId);
      }
    }
  }
  return null;
}

function applyAddResource(document: WbsDocument, op: Extract<Operation, { operation: "addResource" }>): string | null {
  const resources = asArray(document.resources);
  if (resources.some((r) => r.id === op.resource.id)) {
    return `Resource '${op.resource.id}' already exists.`;
  }
  document.resources = [...resources, { ...op.resource }];
  return null;
}

function applyUpdateResource(document: WbsDocument, op: Extract<Operation, { operation: "updateResource" }>): string | null {
  const resource = asArray(document.resources).find((r) => r.id === op.resourceId);
  if (!resource) {
    return `Resource '${op.resourceId}' does not exist.`;
  }
  applyEntityPatch(resource as Record<string, unknown>, op.changes);
  return null;
}

function applyDeleteResource(
  document: WbsDocument,
  op: Extract<Operation, { operation: "deleteResource" }>,
  ctx: ApplyContext
): string | null {
  const resources = asArray(document.resources);
  if (!resources.some((r) => r.id === op.resourceId)) {
    ctx.warnings.push(`Resource '${op.resourceId}' is already absent.`);
    return null;
  }

  const referenced = document.nodes.some(
    (node) => node.owner === op.resourceId || asArray(node.assignees).includes(op.resourceId)
  );
  const detach = op.detachFromNodes !== false;

  if (referenced && !detach) {
    return `Resource '${op.resourceId}' is referenced by nodes and detachFromNodes is false.`;
  }

  document.resources = resources.filter((r) => r.id !== op.resourceId);
  if (detach) {
    for (const node of document.nodes) {
      if (node.owner === op.resourceId) {
        delete node.owner;
      }
      if (node.assignees) {
        node.assignees = node.assignees.filter((id) => id !== op.resourceId);
      }
    }
  }
  return null;
}

function applySetNodeOutputs(document: WbsDocument, op: Extract<Operation, { operation: "setNodeOutputs" }>): string | null {
  const node = findNode(document, op.nodeId);
  if (!node) {
    return `Node '${op.nodeId}' does not exist.`;
  }
  node.outputs = [...op.outputs];
  return null;
}

function applyAddNodeOutput(
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

function applyDeleteNodeOutput(
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

function applyAddAcceptanceCriterion(
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

function applyDeleteAcceptanceCriterion(
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

function applyAddTag(
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

function applyDeleteTag(
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

function applySingleOperation(document: WbsDocument, operation: Operation, ctx: ApplyContext): string | null {
  switch (operation.operation) {
    case "addNode":
      return applyAddNode(document, operation, ctx);
    case "updateNode":
      return applyUpdateNode(document, operation);
    case "renameNode":
      return applyRenameNode(document, operation);
    case "moveNode":
      return applyMoveNode(document, operation);
    case "deleteNode":
      return applyDeleteNode(document, operation);
    case "changeNodeStatus":
      return applyChangeNodeStatus(document, operation);
    case "reorderChildren":
      return applyReorderChildren(document, operation);
    case "addRelation":
      return applyAddRelation(document, operation);
    case "updateRelation":
      return applyUpdateRelation(document, operation);
    case "deleteRelation":
      return applyDeleteRelation(document, operation);
    case "addArtifact":
      return applyAddArtifact(document, operation);
    case "updateArtifact":
      return applyUpdateArtifact(document, operation);
    case "deleteArtifact":
      return applyDeleteArtifact(document, operation, ctx);
    case "addResource":
      return applyAddResource(document, operation);
    case "updateResource":
      return applyUpdateResource(document, operation);
    case "deleteResource":
      return applyDeleteResource(document, operation, ctx);
    case "setNodeOutputs":
      return applySetNodeOutputs(document, operation);
    case "addNodeOutput":
      return applyAddNodeOutput(document, operation, ctx);
    case "deleteNodeOutput":
      return applyDeleteNodeOutput(document, operation, ctx);
    case "addAcceptanceCriterion":
      return applyAddAcceptanceCriterion(document, operation);
    case "deleteAcceptanceCriterion":
      return applyDeleteAcceptanceCriterion(document, operation, ctx);
    case "addTag":
      return applyAddTag(document, operation, ctx);
    case "deleteTag":
      return applyDeleteTag(document, operation, ctx);
    default:
      return `Unknown operation '${(operation as Operation).operation}'.`;
  }
}

// --- Main API ---

export function applyOperations(
  document: WbsDocument,
  changeSet: ChangeSet,
  options: ApplyOptions = {}
): ApplyResult {
  const original = cloneDocument(document);
  const warnings: string[] = [];
  const errors: ApplyError[] = [];

  const schemaErrors = validateJsonWithSchema(changeSet, "operations");
  if (schemaErrors.length > 0) {
    return {
      success: false,
      document: original,
      applied: false,
      errors: schemaErrors.map((message, index) => ({
        operationIndex: -1,
        operation: "changeSet",
        message: index === 0 ? message : `(schema) ${message}`
      })),
      warnings
    };
  }

  if (changeSet.targetWbsId !== document.id) {
    return {
      success: false,
      document: original,
      applied: false,
      errors: [{
        operationIndex: -1,
        operation: "changeSet",
        message: `targetWbsId '${changeSet.targetWbsId}' does not match document id '${document.id}'.`
      }],
      warnings
    };
  }

  if (options.strictBaseRevision && changeSet.baseRevision !== undefined) {
    const expected = options.expectedRevision;
    if (expected !== undefined && changeSet.baseRevision !== expected) {
      return {
        success: false,
        document: original,
        applied: false,
        errors: [{
          operationIndex: -1,
          operation: "changeSet",
          message: `baseRevision '${changeSet.baseRevision}' does not match expected '${expected}'.`
        }],
        warnings
      };
    }
  }

  const isDryRun = changeSet.dryRun === true && !options.forceDryRun;
  const working = cloneDocument(document);
  const ctx: ApplyContext = { warnings };

  for (let index = 0; index < changeSet.operations.length; index += 1) {
    const operation = changeSet.operations[index];
    const errorMessage = applySingleOperation(working, operation, ctx);
    if (errorMessage) {
      errors.push(makeError(index, operation, errorMessage));
      return {
        success: false,
        document: original,
        applied: false,
        errors,
        warnings: [...warnings, ...ctx.warnings]
      };
    }
  }

  const semanticErrors = validateWbsDocumentSemantics(working as Parameters<typeof validateWbsDocumentSemantics>[0]);
  if (semanticErrors.length > 0) {
    return {
      success: false,
      document: original,
      applied: false,
      errors: semanticErrors.map((message) => ({
        operationIndex: -1,
        operation: "semanticValidation",
        message
      })),
      warnings: [...warnings, ...ctx.warnings]
    };
  }

  return {
    success: true,
    document: working,
    applied: !isDryRun,
    errors: [],
    warnings: [...warnings, ...ctx.warnings]
  };
}
