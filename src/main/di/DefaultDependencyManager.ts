'use strict';
import {DependencyManager} from "./DependencyManager";
import {LoggerFactory} from "../logging/LoggerFactory";
import {ConsoleLoggerFactory} from "../logging/ConsoleLoggerFactory";
import {ObjectUtils} from "../ObjectUtils";
import {Unit} from "./Unit";
import {InjectableInfo} from "./injectable/InjectableInfo";
import {FactoryInfo} from "./factory/FactoryInfo";
import {ObjectFactory} from "../core/ObjectFactory";
import {ClassType} from "../ClassType";

export class DefaultDependencyManager implements DependencyManager {
  private _translationMap: Map<string, string>;
  private _logger;
  private _units: Map<string, Unit>;
  private _referencedBy: Map<string, Set<Unit>>;
  private _objectFactory: ObjectFactory;

  constructor(options: DefaultDependencyManagerOptions) {
    let loggerFactory = options.loggerFactory || new ConsoleLoggerFactory();
    this._logger = loggerFactory.getLogger(DefaultDependencyManager);
    this._translationMap = new Map();
    this._units = new Map();
    this._referencedBy = new Map<string, Set<Unit>>();
    this._objectFactory = options.objectFactory || new ObjectFactory();
    this.value('dependencyManager', this);
  }

  /**
   * Defines a static registerValue that will be used by the dependency management to inject in the
   * classes that has `name` as dependency.
   *
   * @param name {string} Name of the dependency.
   * @param value {string} Value of the dependency.
   */
  public async value(name: string, value: any): Promise<void> {
    this._logger.debug(`Registering value ${name}.`);
    this.registerStaticUnit(name, value);
  }

  public async injectable(injectableInfo: InjectableInfo): Promise<void> {
    let name = this.extractInstanceName(injectableInfo.name || injectableInfo.classz);
    let dependencies = injectableInfo.dependencies || ObjectUtils.extractArgs(injectableInfo.classz);

    this.registerInjectableUnit(name, injectableInfo.classz, dependencies);
  }

  public async factory(factoryInfo: FactoryInfo): Promise<void> {
    let name: string = this.extractInstanceName(factoryInfo.name || factoryInfo.factoryFn);
    let dependencies = factoryInfo.dependencies || ObjectUtils.extractArgs(factoryInfo.factoryFn);
    this.registerFactoryUnit(name, factoryInfo.factoryFn, dependencies, factoryInfo.context);
  }

  public async findOne(name: string | Function): Promise<any> {
    if (typeof name !== 'string') {
      name = ObjectUtils.extractClassName(name);
    }
    let instanceName = ObjectUtils.toInstanceName(name);

    let notRegistered: Set<Unit> = new Set();
    if (!this._units.has(instanceName)) {
      return null;
    }

    let unit: Unit = this._units.get(instanceName);
    if (unit.instanceReference) {
      unit = unit.instanceReference;
    }

    let resolved = await this.resolveUnit(unit, notRegistered);

    if (!resolved) {
      for (let missingUnit of notRegistered) {
        this._logger.error(`The depencency ${missingUnit.name} declared in ${Array.from(this._referencedBy[missingUnit.name]).join(', ')} 
        could not be found. Make sure you've registered it.`);
      }
      throw new Error(`The dependency could not be resolved: ${unit.name}.`)
    }

    return unit.instanceValue;
  }

  private registerStaticUnit(name: string, value: Function): Unit {
    let unit: Unit = this.getOrCreateUnit(name);
    unit.instanceValue = value;
    unit.registered = true;
    unit.resolved = true;
    return unit;
  }

  private registerInjectableUnit(name: string,
                              classz: ClassType,
                              dependencies: (string | Function)[],
                              instanceFrom?: string): Unit {

    let unit: Unit = this.getOrCreateUnit(name);
    unit.classz = classz;
    unit.registered = true;
    // Used in case a unit should share the same instance as other unit. For instance,
    // in class inheritance, where both parent and child class will be registered in
    // separate units.
    if (instanceFrom) {
      unit.instanceReference = this.getOrCreateUnit(instanceFrom);
    }
    this.registerDependencies(dependencies, unit);
    return unit;
  }

  private registerFactoryUnit(factoryName: string,
                              factoryFn: Function,
                              dependencies: (string | Function)[],
                              factoryContext?: string | Function): Unit {

    let unit: Unit = this.getOrCreateUnit(factoryName);
    unit.factory = factoryFn;

    if (factoryContext) {
      let factoryContextName = this.extractInstanceName(factoryContext);
      unit.factoryContext = this.getOrCreateUnit(factoryContextName);
      this.addUnitReference(unit.factoryContext.name, unit);
    }

    unit.registered = true;

    this.registerDependencies(dependencies, unit);
    return unit;
  }

  private getOrCreateUnit(name: string): Unit {
    let instanceName: string = ObjectUtils.toInstanceName(name);
    let unit: Unit = this._units.get(instanceName);
    if (!unit) {
      unit = new Unit(instanceName);
      this._units.set(instanceName, unit);
    }
    return unit;
  }

  private extractInstanceName(classz: string | Function): string {
    let name: string | Function = classz;
    if (typeof name === 'function') {
      name = ObjectUtils.extractClassName(name);
    } else if (typeof name !== 'string') {
      return null;
    }
    return ObjectUtils.toInstanceName(name);
  }

  private registerDependencies(dependencies: (string | Function)[], unit: Unit) {
    for (let dependency of dependencies) {
      let dependencyName = this.extractInstanceName(dependency);
      let dependencyUnit = this.getOrCreateUnit(dependencyName);

      this.addUnitReference(dependencyName, unit);

      unit.dependencies.add(dependencyUnit);
    }
  }

  private addUnitReference(dependencyName, unit: Unit) {
    let references: Set<Unit> = this._referencedBy[dependencyName];
    if (!references) {
      references = this._referencedBy[dependencyName] = new Set();
    }
    references.add(unit);
  }

  private async resolveUnit(unit: Unit, notRegistered: Set<Unit>, unresolved?: Set<Unit>): Promise<boolean> {
    let unresolvedDependencyFound: boolean = false;

    if (unit.resolved) {
      return true;
    }

    unresolved = unresolved || new Set();
    unresolved.add(unit);

    if (unit.factoryContext) {
      await this.resolveDependency(unit, unit.factoryContext, notRegistered, unresolved);
    }

    for (let dependency of unit.dependencies) {
      let resolved = await this.resolveDependency(unit, dependency, notRegistered, unresolved);
      unresolvedDependencyFound = unresolvedDependencyFound || !resolved;
      // we could stop here, but lets continue to get all the broken dependencies
    }
    if (unresolvedDependencyFound) {
      return false;
    }
    await this.resolveUnitInstanceValue(unit);
    unresolved.delete(unit);

    return true;
  }

  private async resolveDependency(referencedBy: Unit,
                                  dependency: Unit,
                                  notRegistered: Set<Unit>,
                                  unresolved?: Set<Unit>): Promise<boolean> {
    if (dependency.resolved) {
      return true;
    }
    if (!dependency.registered) {
      notRegistered.add(dependency);
      return false;
    }
    if (unresolved.has(dependency)) {
      throw new Error(`Circular dependency found at ${referencedBy.name}: ${dependency.name}`);
    }
    return this.resolveUnit(dependency, unresolved, notRegistered);
  }

  private async resolveUnitInstanceValue(unit: Unit): Promise<void> {
    let dependencyValues: any[] = Array.from(unit.dependencies).map((dependency: Unit) => dependency.instanceValue);

    if (unit.factory) {
      let context: any = unit.factoryContext ? unit.factoryContext.instanceValue : null;
      if (!context) {
        this._logger.warn(`No context defined for factory ${unit.name}. 
        You will not be able to reference "this" object in the factory function. Be sure you annotate the class containing the 
        factory method with @Injectable or @Configuration.`);
      }
      unit.instanceValue = await unit.factory.apply(context, dependencyValues);
    } else {
      unit.instanceValue = await this._objectFactory.createInstance(unit.classz, dependencyValues);
    }
    unit.resolved = true;
  }
}

export interface DefaultDependencyManagerOptions {
  loggerFactory?: LoggerFactory;
  objectFactory?: ObjectFactory;
}

