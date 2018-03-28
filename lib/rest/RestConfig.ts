import { SchemaDefinition } from "mongoose";
import * as _ from 'lodash';

export interface RestConfigMap {
  [key: string]: {
    db: SchemaDefinition,
    rest: {[key: string]: RestKeyConfig}
  }
}

export class RestConfig {
  configs: {[key: string]: RestKeyConfig} = {}
  constructor(_configs){
    for (let key in _configs) {
      this.configs[key] = new RestKeyConfig();
      for (let configName in _configs[key]) {
        this.configs[key][configName] = _configs[key][configName];
      }
    }
  }

  public isReadable(key){
    if (!this.configs) {
      return true;
    }
    return this.configs[key] ? this.configs[key].readable : true;
  }
  public get primaryKey() {
    return _.findKey(this.configs, {primaryKey: true}) || '__id'
  }
}


export class RestKeyConfig {
  required?: boolean = false
  writable?: boolean = true
  readable?: boolean = true
  primaryKey?: boolean = false
  autoIncrement?: boolean = false
}
