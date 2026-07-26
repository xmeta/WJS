import { type WbsDocument, type Operation } from "./types.ts";

type SetDocumentExtensionOperation = Extract<Operation, { operation: "setDocumentExtension" }>;

export function applySetDocumentExtension(
  document: WbsDocument,
  operation: SetDocumentExtensionOperation
): string | null {
  document.extensions = {
    ...(document.extensions ?? {}),
    [operation.namespace]: structuredClone(operation.value)
  };
  return null;
}
