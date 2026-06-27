import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateWbsDocumentSemantics } from "./wbs-semantics.ts";

export { validateWbsDocumentSemantics };

type WbsNode = {
  id: string;
  parentId: string | null;
  code: string;
  outputs?: string[];
  owner?: string;
  assignees?: string[];
};

type Relation = {
  id: string;
  type: string;
  source: string;
  target: string;
};

type WbsDocument = {
  schemaVersion: string;
  id: string;
  name: string;
  rootId: string;
  nodes: WbsNode[];
  relations?: Relation[];
  resources?: { id: string }[];
  artifacts?: { id: string }[];
};

type SchemaKind = "wbs" | "operations";
type JsonObject = Record<string, unknown>;

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function createAjv(): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false
  });
  addFormats(ajv);
  return ajv;
}

function schemaPath(kind: SchemaKind): string {
  return kind === "wbs" ? "schema/wbs-json.schema.json" : "schema/wbs-operations.schema.json";
}

function detectSchemaKind(document: unknown): SchemaKind {
  if (typeof document !== "object" || document === null) {
    return "wbs";
  }

  const candidate = document as Record<string, unknown>;
  if (Array.isArray(candidate.operations) || typeof candidate.targetWbsId === "string") {
    return "operations";
  }
  return "wbs";
}

function compileValidator(kind: SchemaKind): ValidateFunction {
  const ajv = createAjv();
  const schema = readJson(schemaPath(kind));
  return ajv.compile(schema);
}

function operationDefNameByOperationName(schema: unknown): Map<string, string> {
  const byName = new Map<string, string>();
  if (typeof schema !== "object" || schema === null) {
    return byName;
  }

  const defs = (schema as JsonObject).$defs;
  if (typeof defs !== "object" || defs === null) {
    return byName;
  }

  for (const [defName, def] of Object.entries(defs as JsonObject)) {
    if (typeof def !== "object" || def === null) {
      continue;
    }

    const schemas = Array.isArray((def as JsonObject).allOf) ? (def as JsonObject).allOf as unknown[] : [def];
    for (const schemaPart of schemas) {
      if (typeof schemaPart !== "object" || schemaPart === null) {
        continue;
      }
      const properties = (schemaPart as JsonObject).properties;
      if (typeof properties !== "object" || properties === null) {
        continue;
      }
      const operation = (properties as JsonObject).operation;
      if (typeof operation === "object" && operation !== null && typeof (operation as JsonObject).const === "string") {
        byName.set((operation as JsonObject).const as string, defName);
      }
    }
  }

  return byName;
}

function validateOperationsByDiscriminator(document: unknown): string[] {
  if (typeof document !== "object" || document === null) {
    return [];
  }

  const operations = (document as JsonObject).operations;
  if (!Array.isArray(operations)) {
    return [];
  }

  const schema = readJson(schemaPath("operations"));
  const operationDefs = operationDefNameByOperationName(schema);
  const ajv = createAjv();
  ajv.addSchema(schema);
  const schemaId = typeof schema === "object" && schema !== null && typeof (schema as JsonObject).$id === "string"
    ? (schema as JsonObject).$id as string
    : "";
  const errors: string[] = [];

  operations.forEach((operation, index) => {
    if (typeof operation !== "object" || operation === null) {
      return;
    }
    const operationName = (operation as JsonObject).operation;
    if (typeof operationName !== "string") {
      return;
    }
    const operationDef = operationDefs.get(operationName);
    if (!operationDef) {
      errors.push(`/operations/${index}/operation must be one of known operation names`);
      return;
    }

    const validate = ajv.compile({ $ref: `${schemaId}#/$defs/${operationDef}` });
    if (!validate(operation)) {
      errors.push(...(validate.errors ?? []).map((error) => {
        const formatted = formatAjvError(error);
        return formatted.startsWith("/") ? `/operations/${index}${formatted}` : `/operations/${index}: ${formatted}`;
      }));
    }
  });

  return errors;
}

function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || "/";
  const detail = error.params ? ` ${JSON.stringify(error.params)}` : "";
  return `${path} ${error.message ?? "is invalid"}${detail}`;
}

export function validateJsonWithSchema(document: unknown, kind: SchemaKind): string[] {
  const validate = compileValidator(kind);
  if (validate(document)) {
    return [];
  }
  if (kind === "operations") {
    const discriminatorErrors = validateOperationsByDiscriminator(document);
    if (discriminatorErrors.length > 0) {
      return discriminatorErrors;
    }
  }
  return (validate.errors ?? []).map(formatAjvError);
}

function parseArgs(args: string[]): { file: string; kind?: SchemaKind } {
  let kind: SchemaKind | undefined;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === "--wbs") {
      kind = "wbs";
    } else if (arg === "--operations") {
      kind = "operations";
    } else {
      files.push(arg);
    }
  }

  if (files.length !== 1) {
    console.error("Usage: npm run validate -- [--wbs|--operations] <json-file>");
    process.exit(2);
  }

  return { file: files[0], kind };
}

function main(): void {
  const { file, kind: requestedKind } = parseArgs(process.argv.slice(2));
  const document = readJson(file);
  const kind = requestedKind ?? detectSchemaKind(document);

  const errors = validateJsonWithSchema(document, kind);
  if (errors.length === 0 && kind === "wbs") {
    errors.push(...validateWbsDocumentSemantics(document as WbsDocument));
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(`${file}: OK (${kind})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
