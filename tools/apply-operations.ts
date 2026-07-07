export {
  type Effort,
  type WbsNode,
  type Relation,
  type Artifact,
  type Resource,
  type WbsDocument,
  type SiblingPosition,
  type Operation,
  type ChangeSet,
  type ApplyError,
  type ApplyOptions,
  type ApplyResult
} from "./apply/types.ts";

export { cloneDocument } from "./apply/helpers.ts";
export { applyOperations } from "./apply/engine.ts";
