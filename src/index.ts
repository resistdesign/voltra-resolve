export type PathToken = {
    [key: string]: PathToken;
};

export type Feature<DependencyConfig extends Record<string, PathToken>, ResolvedDependenciesType extends Record<keyof DependencyConfig, any>> = {
    dependencies?: Partial<DependencyConfig>;
    getters?: Partial<DependencyConfig>;
    setters?: Partial<DependencyConfig>;
    factory: (resolvedDependencies: ResolvedDependenciesType) => Promise<any>;
};

export type Module = {
    [key: string]: Feature<any, any> | Module;
};
