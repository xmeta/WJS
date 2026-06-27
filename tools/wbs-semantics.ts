export type WbsNode = {
  id: string;
  parentId: string | null;
  code: string;
  outputs?: string[];
  owner?: string;
  assignees?: string[];
};

export type Relation = {
  id: string;
  type: string;
  source: string;
  target: string;
};

export type WbsDocument = {
  rootId: string;
  nodes: WbsNode[];
  relations?: Relation[];
  resources?: { id: string }[];
  artifacts?: { id: string }[];
};

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function addDuplicateErrors(values: string[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${label} '${value}' is duplicated.`);
    }
    seen.add(value);
  }
}

function hasCycle(start: string, next: (id: string) => string[]): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const child of next(id)) {
      if (visit(child)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  return visit(start);
}

export function validateWbsDocumentSemantics(document: WbsDocument): string[] {
  const errors: string[] = [];
  const nodes = asArray(document.nodes);
  const relations = asArray(document.relations);
  const resources = asArray(document.resources);
  const artifacts = asArray(document.artifacts);

  addDuplicateErrors(nodes.map((node) => node.id), "Node ID", errors);
  addDuplicateErrors(relations.map((relation) => relation.id), "Relation ID", errors);
  addDuplicateErrors(resources.map((resource) => resource.id), "Resource ID", errors);
  addDuplicateErrors(artifacts.map((artifact) => artifact.id), "Artifact ID", errors);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const artifactIds = new Set(artifacts.map((artifact) => artifact.id));

  if (document.rootId && !nodeIds.has(document.rootId)) {
    errors.push(`rootId '${document.rootId}' does not reference an existing node.`);
  }

  const roots = nodes.filter((node) => node.parentId === null);
  if (roots.length !== 1) {
    errors.push(`Expected exactly one root node, found ${roots.length}.`);
  } else if (roots[0].id !== document.rootId) {
    errors.push(`Root node '${roots[0].id}' does not match rootId '${document.rootId}'.`);
  }

  for (const node of nodes) {
    if (node.parentId === node.id) {
      errors.push(`Node '${node.id}' cannot be its own parent.`);
    }
    if (node.parentId !== null && !nodeIds.has(node.parentId)) {
      errors.push(`Node '${node.id}' parentId '${node.parentId}' does not exist.`);
    }
    if (node.owner && !resourceIds.has(node.owner)) {
      errors.push(`Node '${node.id}' owner '${node.owner}' does not exist.`);
    }
    for (const assignee of asArray(node.assignees)) {
      if (!resourceIds.has(assignee)) {
        errors.push(`Node '${node.id}' assignee '${assignee}' does not exist.`);
      }
    }
    for (const output of asArray(node.outputs)) {
      if (!artifactIds.has(output)) {
        errors.push(`Node '${node.id}' output '${output}' does not exist.`);
      }
    }
  }

  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId !== null) {
      childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node.id]);
    }
  }
  for (const node of nodes) {
    if (hasCycle(node.id, (id) => childrenByParent.get(id) ?? [])) {
      errors.push(`parentId cycle detected at node '${node.id}'.`);
      break;
    }
  }

  const dependsOnBySource = new Map<string, string[]>();
  for (const relation of relations) {
    if ((relation.type === "dependsOn" || relation.type === "blocks") && !nodeIds.has(relation.source)) {
      errors.push(`Relation '${relation.id}' source '${relation.source}' does not reference a node.`);
    }
    if ((relation.type === "dependsOn" || relation.type === "blocks") && !nodeIds.has(relation.target)) {
      errors.push(`Relation '${relation.id}' target '${relation.target}' does not reference a node.`);
    }
    if (relation.type === "dependsOn") {
      dependsOnBySource.set(relation.source, [...(dependsOnBySource.get(relation.source) ?? []), relation.target]);
    }
  }
  for (const node of nodes) {
    if (hasCycle(node.id, (id) => dependsOnBySource.get(id) ?? [])) {
      errors.push(`dependsOn cycle detected at node '${node.id}'.`);
      break;
    }
  }

  return errors;
}
