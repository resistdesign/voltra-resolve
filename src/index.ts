export type DependencyPathArray = (string | number)[];

export type DependencyPathString = string | number;

export type DependencyPath = DependencyPathArray | DependencyPathString;

export type DependencyReferenceMap = Record<string, DependencyPath>;

export type Dependency = {
  dependencies?: DependencyReferenceMap;
  getters?: DependencyReferenceMap;
  setters?: DependencyReferenceMap;
  factory: (dependencies: Record<string, any>) => Promise<any>;
};

export type Declaration = Dependency | Module;

export type Module = {
  [key: string]: Declaration;
};

export type ValueStructure = Record<string, any>;

export const stringPathToArrayPath = (
  path: DependencyPathString,
): DependencyPathArray =>
  `${path}`.split("/").map((p) => decodeURIComponent(p));

export const arrayPathToStringPath = (path: DependencyPathArray): string =>
  path.map((p) => encodeURIComponent(`${p}`)).join("/");

export const getDependencyPathArray = (
  path: DependencyPath,
): DependencyPathArray =>
  Array.isArray(path) ? path : stringPathToArrayPath(path);

export const getValueFromPath = (
  valueStructure: ValueStructure = {},
  path: DependencyPath = [],
): any => {
  const pathArray = getDependencyPathArray(path);

  let value = valueStructure;

  for (const p of pathArray) {
    value = value?.[p as keyof typeof value];

    if (typeof value === "undefined") {
      break;
    }
  }

  return value;
};

export const getDependencyDeclarationFromDeclaration = (
  declaration: Declaration = {},
  path: DependencyPath = [],
): Declaration | undefined =>
  getValueFromPath(declaration, path) as Declaration | undefined;

export const declarationIsDependency = (
  declaration: Declaration = {},
): boolean => {
  const { factory } = declaration as Dependency;

  return typeof factory === "function";
};

export type ResolvedDependencyData = {
  valueStructure: ValueStructure;
  dependencyValue: any;
};

export const resolveDependency = async (
  valueStructure: ValueStructure = {},
  module: Module,
  path: DependencyPath,
): Promise<ResolvedDependencyData> => {
  const declaration = getDependencyDeclarationFromDeclaration(module, path);
  const isDep = declarationIsDependency(declaration);

  let newValueStructure = valueStructure,
    dependencyValue;

  if (isDep) {
    // TODO: Finish.
  } else {
    dependencyValue = getValueFromPath(valueStructure, path);
  }

  return {
    valueStructure: newValueStructure,
    dependencyValue,
  };
};
