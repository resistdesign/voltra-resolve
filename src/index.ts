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

export const getDependencyDeclarationFromDeclaration = (
  declaration: Declaration = {},
  path: DependencyPath = [],
): Declaration | undefined => {
  const pathArray = getDependencyPathArray(path);

  let dependency = declaration;

  for (const p of pathArray) {
    if (
      dependency !== null &&
      typeof dependency !== "undefined" &&
      p in dependency
    ) {
      dependency = dependency[p as keyof typeof dependency] as Declaration;
    } else {
      break;
    }
  }

  return dependency;
};

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

  // TODO: Finish.

  let newValueStructure = valueStructure,
    dependencyValue;

  return {
    valueStructure: newValueStructure,
    dependencyValue,
  };
};
