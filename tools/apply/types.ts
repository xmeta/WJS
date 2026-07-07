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

export type ApplyContext = {
  warnings: string[];
};
