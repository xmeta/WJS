import { type WbsDocument, type Operation, type ApplyContext } from "./types.ts";
import { asArray, applyEntityPatch } from "./helpers.ts";

export function applyAddResource(document: WbsDocument, op: Extract<Operation, { operation: "addResource" }>): string | null {
  const resources = asArray(document.resources);
  if (resources.some((r) => r.id === op.resource.id)) {
    return `Resource '${op.resource.id}' already exists.`;
  }
  document.resources = [...resources, { ...op.resource }];
  return null;
}

export function applyUpdateResource(document: WbsDocument, op: Extract<Operation, { operation: "updateResource" }>): string | null {
  const resource = asArray(document.resources).find((r) => r.id === op.resourceId);
  if (!resource) {
    return `Resource '${op.resourceId}' does not exist.`;
  }
  applyEntityPatch(resource as Record<string, unknown>, op.changes);
  return null;
}

export function applyDeleteResource(
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
