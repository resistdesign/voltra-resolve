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

export type Declaration = Dependency | Module | DependencyPath;

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
  Array.isArray(path) ? [...path] : stringPathToArrayPath(path);

export const joinPaths = (...paths: DependencyPath[]): DependencyPathArray => {
  const pathsArray = paths.map((p) => getDependencyPathArray(p));

  return pathsArray.reduce((acc, p) => [...acc, ...p], []);
};

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
): Declaration | undefined => {
  if (getDeclarationIsPath(declaration)) {
    return {
      dependencies: {
        value: declaration as DependencyPath,
      },
      factory: async ({ value }) => value,
    };
  } else {
    return getValueFromPath(declaration as Module, path) as
      | Declaration
      | undefined;
  }
};
export const declarationIsDependency = (
  declaration: Declaration = {},
): boolean => {
  const { factory } = declaration as Dependency;

  return typeof factory === "function";
};

export const getDeclarationIsPath = (declaration: Declaration = {}): boolean =>
  Array.isArray(declaration) ||
  typeof declaration === "string" ||
  typeof declaration === "number";

export const resolvePath = (
  path: DependencyPath,
  basePath: DependencyPath = [""],
): DependencyPathArray => {
  const pathArray = getDependencyPathArray(path);

  if (pathArray[0] === "") {
    // Absolute path.
    return pathArray;
  } else {
    // Relative path.
    const pathArrayWithoutCurrentDirRef = pathArray.filter((p) => p !== ".");
    const pathNavUpRelCount = pathArrayWithoutCurrentDirRef.filter(
      (p) => p === "..",
    ).length;
    const basePathArray = getDependencyPathArray(basePath).filter(
      (p, i) => i >= pathNavUpRelCount,
    );
    const pathArrayWithoutNavUpRel = pathArrayWithoutCurrentDirRef.filter(
      (p) => p !== "..",
    );

    return [...basePathArray, ...pathArrayWithoutNavUpRel];
  }
};

export type DependantTree = Record<string, DependencyPath[]>;

export const mergeAndUniqueDependencyPathLists = (
  arr1: DependencyPath[] = [],
  arr2: DependencyPath[] = [],
): string[] => {
  const pathList1 = [...arr1].map((p) =>
    arrayPathToStringPath(getDependencyPathArray(p)),
  );
  const pathList2 = [...arr2].map((p) =>
    arrayPathToStringPath(getDependencyPathArray(p)),
  );
  const uniqueStringPathList = [...pathList1];

  for (const p of pathList2) {
    if (!uniqueStringPathList.includes(p)) {
      uniqueStringPathList.push(p);
    }
  }

  return uniqueStringPathList;
};

export const mergeDependantTrees = (
  tree1: DependantTree = {},
  tree2: DependantTree = {},
): DependantTree => {
  let newTree = {
    ...tree1,
  };

  for (const k in tree2) {
    const tree2Paths = tree2[k] || ([] as DependencyPath[]);
    const tree1Paths = tree1[k] || ([] as DependencyPath[]);

    newTree[k] = mergeAndUniqueDependencyPathLists(tree1Paths, tree2Paths);
  }

  return newTree;
};

export const getDependantTree = (
  module: Module,
  basePath: DependencyPath = [""],
): DependantTree => {
  let newDepTree = {};

  for (const k in module) {
    const depPath = joinPaths(basePath, k);
    const declaration = getDependencyDeclarationFromDeclaration(
      module,
      depPath,
    );
    const isDep = declarationIsDependency(declaration);

    if (isDep) {
      const { dependencies = {} } = declaration as Dependency;

      for (const k in dependencies) {
        const depPath = dependencies[k];
        const depPathArray = getDependencyPathArray(depPath);
        const depPathString = arrayPathToStringPath(depPathArray);

        newDepTree = mergeDependantTrees(newDepTree, {
          [depPathString]: [joinPaths(basePath, k)],
        });
      }
    } else {
      const subDepTree = getDependantTree(declaration as Module, depPath);

      newDepTree = mergeDependantTrees(newDepTree, subDepTree);
    }
  }

  return newDepTree;
};

export type ResolvedDependencyData = {
  valueStructure: ValueStructure;
  dependencyValue: any;
  changedPaths: DependencyPath[];
};

export const resolveDependency = async (
  valueStructure: ValueStructure = {},
  module: Module,
  path: DependencyPath,
  basePath: DependencyPath = [""],
  // TODO: onSetValueByPath.
  // TODO: onGetValueByPath.
  // TODO: onListenToPath.
): Promise<ResolvedDependencyData> => {
  const fullPath = resolvePath(path, basePath);
  const correctedBasePath = fullPath.slice(0, fullPath.length - 1);
  const declaration = getDependencyDeclarationFromDeclaration(module, fullPath);
  const isDep = declarationIsDependency(declaration);

  let newValueStructure = valueStructure,
    dependencyValue = getValueFromPath(valueStructure, fullPath),
    changedPaths: DependencyPath[] = [];

  if (isDep && typeof dependencyValue === "undefined") {
    const { dependencies = {}, factory } = declaration as Dependency;
    const oldValue = getValueFromPath(valueStructure, fullPath);
    const subDepValues: Record<string, any> = {};

    for (const k in dependencies) {
      const subPath = resolvePath(dependencies[k], fullPath);
      const oldSubValue = getValueFromPath(valueStructure, subPath);
      const {
        valueStructure: newSubValueStructure,
        dependencyValue: subDepValue,
        changedPaths: changedSubPaths,
      } = await resolveDependency(
        newValueStructure,
        module,
        dependencies[k],
        correctedBasePath,
      );

      changedPaths = mergeAndUniqueDependencyPathLists(
        changedPaths,
        changedSubPaths,
      );

      if (dependencyValue !== oldSubValue) {
        newValueStructure = newSubValueStructure;
        subDepValues[k] = subDepValue;
        changedPaths = mergeAndUniqueDependencyPathLists(changedPaths, [
          subPath,
        ]);
      }
    }

    dependencyValue = await factory(subDepValues);

    if (dependencyValue !== oldValue) {
      newValueStructure = setValueFromPath(
        newValueStructure,
        fullPath,
        dependencyValue,
      );
      changedPaths = mergeAndUniqueDependencyPathLists(changedPaths, [
        fullPath,
      ]);
    }
  }

  return {
    valueStructure: newValueStructure,
    dependencyValue,
    changedPaths,
  };
};
