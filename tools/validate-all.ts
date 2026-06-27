import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { validateJsonWithSchema, validateWbsDocumentSemantics } from "./validate.ts";

type SchemaKind = "wbs" | "operations";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function jsonFiles(directory: string): string[] {
  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => join(directory, entry))
    .sort();
}

function detectSchemaKind(document: unknown): SchemaKind {
  if (typeof document !== "object" || document === null) {
    return "wbs";
  }
  const candidate = document as Record<string, unknown>;
  return Array.isArray(candidate.operations) || typeof candidate.targetWbsId === "string" ? "operations" : "wbs";
}

function validateFile(path: string): string[] {
  const document = readJson(path);
  const kind = detectSchemaKind(document);
  const errors = validateJsonWithSchema(document, kind);
  if (errors.length === 0 && kind === "wbs") {
    errors.push(...validateWbsDocumentSemantics(document as Parameters<typeof validateWbsDocumentSemantics>[0]));
  }
  return errors;
}

function main(): void {
  const validFiles = [...jsonFiles("examples"), ...jsonFiles(join("tests", "valid"))];
  const invalidFiles = jsonFiles(join("tests", "invalid"));
  const failures: string[] = [];

  for (const file of validFiles) {
    const errors = validateFile(file);
    if (errors.length > 0) {
      failures.push(`${file}: expected valid, got ${errors.length} error(s)`);
      failures.push(...errors.map((error) => `  ${error}`));
    }
  }

  for (const file of invalidFiles) {
    const errors = validateFile(file);
    if (errors.length === 0) {
      failures.push(`${file}: expected invalid, got OK`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exit(1);
  }

  console.log(`validation suite: OK (${validFiles.length} valid, ${invalidFiles.length} invalid)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
