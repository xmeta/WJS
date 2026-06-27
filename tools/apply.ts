import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { applyOperations, type ApplyResult, type ChangeSet, type WbsDocument } from "./apply-operations.ts";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

type CliOptions = {
  wbsFile: string;
  changeSetFile: string;
  outputFile?: string;
  force: boolean;
  jsonOutput: boolean;
  expectedRevision?: string;
  strictBaseRevision: boolean;
};

function parseArgs(args: string[]): CliOptions {
  let outputFile: string | undefined;
  let force = false;
  let jsonOutput = false;
  let expectedRevision: string | undefined;
  let strictBaseRevision = false;
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") {
      force = true;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--strict-base-revision") {
      strictBaseRevision = true;
    } else if (arg === "-o" || arg === "--output") {
      outputFile = args[index + 1];
      if (!outputFile) {
        console.error("Missing value for --output");
        process.exit(2);
      }
      index += 1;
    } else if (arg === "--expected-revision") {
      expectedRevision = args[index + 1];
      if (!expectedRevision) {
        console.error("Missing value for --expected-revision");
        process.exit(2);
      }
      index += 1;
    } else if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      process.exit(2);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    console.error("Usage: npm run apply -- <wbs.json> <change-set.json> [-o output.json] [--force] [--json] [--strict-base-revision] [--expected-revision <rev>]");
    process.exit(2);
  }

  return {
    wbsFile: positional[0],
    changeSetFile: positional[1],
    outputFile,
    force,
    jsonOutput,
    expectedRevision,
    strictBaseRevision
  };
}

function printResult(result: ApplyResult, options: CliOptions): void {
  if (!result.success) {
    for (const error of result.errors) {
      const prefix = error.operationIndex >= 0 ? `[op ${error.operationIndex}]` : "[changeSet]";
      console.error(`ERROR: ${prefix} ${error.message}`);
    }
    process.exit(1);
  }

  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }

  if (options.jsonOutput) {
    const payload = {
      success: result.success,
      applied: result.applied,
      warnings: result.warnings,
      document: result.document
    };
    const text = `${JSON.stringify(payload, null, 2)}\n`;
    if (options.outputFile) {
      writeFileSync(options.outputFile, text, "utf8");
      console.log(`${options.outputFile}: written (json)`);
    } else {
      process.stdout.write(text);
    }
    return;
  }

  if (!result.applied) {
    console.log("dryRun: preview only (use --force to write)");
  }

  const text = `${JSON.stringify(result.document, null, 2)}\n`;
  if (options.outputFile) {
    if (!result.applied) {
      console.log(`dryRun: not writing to ${options.outputFile}`);
      process.stdout.write(text);
    } else {
      writeFileSync(options.outputFile, text, "utf8");
      console.log(`${options.outputFile}: applied`);
    }
  } else {
    process.stdout.write(text);
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const document = readJson(options.wbsFile) as WbsDocument;
  const changeSet = readJson(options.changeSetFile) as ChangeSet;

  const result = applyOperations(document, changeSet, {
    forceDryRun: options.force,
    strictBaseRevision: options.strictBaseRevision,
    expectedRevision: options.expectedRevision
  });

  printResult(result, options);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
