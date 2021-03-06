'use strict';

import "reflect-metadata";

export class ObjectUtils {
  public static *toIterable(value) {
    if (value instanceof Array) {
      for (let i = 0; i < value.length; i++) {
        yield value[i];
      }
      return;
    }
    if (typeof value === 'object') {
      let keys = Object.keys[value];
      for (let key of Reflect.ownKeys(value)) {
        yield {key: key, value: value[key]};
      }
    }
  }

  public static extractClassName(classz: Function): string {
    let asString = classz.toString();
    if (asString === '[object]') {
      asString = classz.constructor.toString();
    }
    if (classz.name) {
      return classz.name;
    }
    let match = asString.match(/(?:function|class)[\s]*(\w+).*(\(|\{)/);
    if (!match) {
      console.log('The class must specify a name.', classz);
      return null;
    }
    return match[1];
  }

  public static isClass(classz: Function): boolean {
    return classz.toString().indexOf('class') === 0;
  }

  public static extractArgs(classz: Function): string[] {
    let regexStr = '\\(([^)]*)\\)';
    if (this.isClass(classz)) {
      regexStr = 'constructor[ ]*' + regexStr;
    }
    let match = classz.toString().match(new RegExp(regexStr));
    if (!match) {
      return [];
    }


    return match[1]
      .split(',')
      .map(name => name.trim())
      .filter((value: string, index: number, array: string[]) => !!value)
      .map(param => ObjectUtils.removeInitialUnderscores(param));
  }

  private static removeInitialUnderscores(param: string): string {
    let correctName = param.match(/[_]*(.*)/)[1];
    if (!correctName) {
      return param;
    }
    return correctName;
  }

  public static instantiate(classz, dependencies) {
    return new (Function.prototype.bind.apply(classz, [classz].concat(dependencies)));
  }

  /**
   * Make sure the first char is lower case.
   */
  public static toInstanceName(name) {
    return name.replace(/^./, name[0].toLowerCase());
  }
}