import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

type WbsNode = {
  id: string;
  parentId: string | null;
  code: string;
};

type WbsDocument = {
  nodes: WbsNode[];
  relations?: { id: string }[];
  resources?: { id: string }[];
  artifacts?: { id: string }[];
  [key: string]: unknown;
};

function compareByCode(left: WbsNode, right: WbsNode): number {
  return left.code.localeCompare(right.code, "en", { numeric: true });
}

export function normalizeWbsDocument(document: WbsDocument): WbsDocument {
  return {
    ...document,
    nodes: [...document.nodes].sort(compareByCode),
    relations: [...(document.relations ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    resources: [...(document.resources ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    artifacts: [...(document.artifacts ?? [])].sort((a, b) => a.id.localeCompare(b.id))
  };
}

function main(): void {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: ts-node tools/normalize.ts <wbs-json-file> [output-file]");
    process.exit(2);
  }

  const outputFile = process.argv[3] ?? file;
  const document = JSON.parse(readFileSync(file, "utf8")) as WbsDocument;
  const normalized = normalizeWbsDocument(document);
  writeFileSync(outputFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  console.log(`${outputFile}: normalized`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
