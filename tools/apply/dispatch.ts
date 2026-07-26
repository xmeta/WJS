import { type WbsDocument, type Operation, type ApplyContext } from "./types.ts";
import { applyAddNode, applyUpdateNode, applyRenameNode, applyMoveNode, applyDeleteNode, applyChangeNodeStatus, applyReorderChildren } from "./node-operations.ts";
import { applyAddRelation, applyUpdateRelation, applyDeleteRelation } from "./relation-operations.ts";
import { applyAddArtifact, applyUpdateArtifact, applyDeleteArtifact } from "./artifact-operations.ts";
import { applyAddResource, applyUpdateResource, applyDeleteResource } from "./resource-operations.ts";
import { applySetDocumentExtension } from "./document-operations.ts";
import {
  applySetNodeOutputs,
  applyAddNodeOutput,
  applyDeleteNodeOutput,
  applyAddAcceptanceCriterion,
  applyDeleteAcceptanceCriterion,
  applyAddTag,
  applyDeleteTag
} from "./convenience-operations.ts";

export function applySingleOperation(document: WbsDocument, operation: Operation, ctx: ApplyContext): string | null {
  switch (operation.operation) {
    case "setDocumentExtension":
      return applySetDocumentExtension(document, operation);
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
