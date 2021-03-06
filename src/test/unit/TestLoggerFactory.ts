import {TestLogger} from "./TestLogger";
import {LoggerFactory} from "../../main/logging/LoggerFactory";
import {Logger} from "../../main/logging/Logger";
import {ObjectUtils} from "../../main/ObjectUtils";

export class TestLoggerFactory implements LoggerFactory {
  private _loggers;

  constructor() {
    this._loggers = {};
  }

  public getLogger(loggerIdentifier: any): Logger {
    const name = (typeof loggerIdentifier === 'string') ? loggerIdentifier : ObjectUtils.extractClassName(loggerIdentifier);
    return new TestLogger(name);
  }
}