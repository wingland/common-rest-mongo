import * as morgan from 'morgan';
import * as _ from 'lodash';
import { Document, Model, model, Schema, SchemaDefinition } from "mongoose";
import { CounterModel } from "./Counter";
import { getLogger } from 'log4js';
import { SchemaConfigError } from './errors';
import { RestConfig, RestConfigMap } from './RestConfig';

export class ResourceFactory {

  private static logger = getLogger('out');

  protected modelMap: { [key:string]: Model<any>} = {};
  private restConfigs: { [key:string]: RestConfig} = {};
  private counter:Model<CounterModel>;


  public constructor(schemaConfigs: RestConfigMap) {
    this.modelMap = _.mapValues<RestConfigMap, Model<any>>(schemaConfigs,
      (schemaConfig, key) => {
        const resourceSchema = new Schema(schemaConfig.db);
        let resourceModel = model(key, resourceSchema);
        return resourceModel;
      });
    this.restConfigs = _.mapValues<RestConfigMap, RestConfig>(schemaConfigs,
      (schemaConfig, key) => new RestConfig(schemaConfig.rest)
    )
    this.generateCounter();
  }


  public async getAutoValue(resName, key): Promise<Number> {
    if (this.counter) {
      return await new Promise<Number>((resolve, reject)=>{
        this.counter.findByIdAndUpdate( `${resName}_${key}`, { $inc: { seq: 1 } }, {new: true, upsert: true}, (error, res) => {
          if (error || !res) {
            ResourceFactory.logger.error(`Can not get auto-incremented id for ${key}: ${error}}`);
            reject(error);
            return;
          }
          resolve(res.seq);
        });
      });
    } else {
      throw new Error('No counter created');
    }
  }


  public restConfig(resourceName): RestConfig | null {
    if (this.restConfigs[resourceName]) {
      return this.restConfigs[resourceName];
    } else {
      ResourceFactory.logger.error(`Can not find config schema of resource for: ${resourceName}`);
      throw new SchemaConfigError(`Schema of resource: ${resourceName} is not configured`, resourceName);
    }
  }


  public resourceModel(resourceName): Model<any> {
    if (this.modelMap[resourceName]) {
      return this.modelMap[resourceName];
    } else {
      ResourceFactory.logger.error(`Can not find schema of resource for:  ${resourceName}`);
      throw new SchemaConfigError(`Schema of resource: ${resourceName} is not configured`, resourceName);
    }
  }

  private generateCounter() {
    const counterSchema = new Schema({
      '_id': { type: String},
      'seq': { type: Number, required: true, default: 0},
    });
    this.counter = model<CounterModel>('counter', counterSchema);
  }
}


