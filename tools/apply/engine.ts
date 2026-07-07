import { validateJsonWithSchema, validateWbsDocumentSemantics } from "../validate.ts";
import { type WbsDocument, type ChangeSet, type ApplyOptions, type ApplyResult, type ApplyContext, type ApplyError } from "./types.ts";
import { cloneDocument, makeError } from "./helpers.ts";
import { applySingleOperation } from "./dispatch.ts";

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
