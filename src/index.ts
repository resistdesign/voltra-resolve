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

export const setValueFromPath = (
  valueStructure: ValueStructure = {},
  path: DependencyPath = [],
  value: any,
): ValueStructure => {
  const pathArray = getDependencyPathArray(path);
  const newValueStructure: ValueStructure = { ...valueStructure };

  let lastValueStructure: ValueStructure = newValueStructure;

  for (let i = 0; i < pathArray.length; i++) {
    const p = pathArray[i];
    const isLast = i === pathArray.length - 1;

    if (isLast) {
      lastValueStructure[p] = value;
    } else {
      lastValueStructure[p] = {
        ...lastValueStructure[p],
      };
      lastValueStructure = lastValueStructure[p];
    }
  }

  return newValueStructure;
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
    dependencyValue = getValueFromPath(valueStructure, path);

  if (isDep && typeof dependencyValue === "undefined") {
    const { dependencies = {}, factory } = declaration as Dependency;
    const subDepValues: Record<string, any> = {};

    for (const k in dependencies) {
      const {
        valueStructure: newSubValueStructure,
        dependencyValue: subDepValue,
      } = await resolveDependency(newValueStructure, module, dependencies[k]);

      newValueStructure = newSubValueStructure;
      subDepValues[k] = subDepValue;
    }

    dependencyValue = await factory(subDepValues);
    newValueStructure = setValueFromPath(
      newValueStructure,
      path,
      dependencyValue,
    );
  }

  return {
    valueStructure: newValueStructure,
    dependencyValue,
  };
};
// TODO: Add relative path support, Ex: ./path/to/dependency and ../path/to/dependency.
