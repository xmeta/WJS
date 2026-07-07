import { type WbsDocument, type Operation, type ApplyContext } from "./types.ts";
import { asArray, applyEntityPatch } from "./helpers.ts";

export function applyAddArtifact(document: WbsDocument, op: Extract<Operation, { operation: "addArtifact" }>): string | null {
  const artifacts = asArray(document.artifacts);
  if (artifacts.some((a) => a.id === op.artifact.id)) {
    return `Artifact '${op.artifact.id}' already exists.`;
  }
  document.artifacts = [...artifacts, { ...op.artifact }];
  return null;
}

export function applyUpdateArtifact(document: WbsDocument, op: Extract<Operation, { operation: "updateArtifact" }>): string | null {
  const artifact = asArray(document.artifacts).find((a) => a.id === op.artifactId);
  if (!artifact) {
    return `Artifact '${op.artifactId}' does not exist.`;
  }
  applyEntityPatch(artifact as Record<string, unknown>, op.changes);
  return null;
}

export function applyDeleteArtifact(
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
