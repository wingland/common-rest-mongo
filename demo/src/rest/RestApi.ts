import { SchemaConfigError, RestError, ServerError, MissingParameterError, NotFoundError } from './errors';
import  *  as _ from 'lodash';
// express
import { NextFunction, Response, Request, Router } from "express";
import { configure, getLogger } from 'log4js';
import { ResourceFactory } from './ResourceFactory';
import { RestConfig, RestConfigMap } from './RestConfig';


/**
 * @class RestApi
 */
export class RestApi {

  private static logger = getLogger('out');

  private static resourceFactory;

  /**
   * Create the api.
   * @static
   */
  public static create(router: Router, restConfigMap: RestConfigMap) {

    this.resourceFactory = new ResourceFactory(restConfigMap);
    // DELETE
    router.delete("/:resource/:id", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().delete(req, res, next);
    });

    // DELETE Multiple defined in body
    router.post("/:resource/batch-delete", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().deleteMultiple(req, res, next);
    });

    // GET MULTIPLE, by default get all, query allowed
    router.get("/:resource", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().list(req, res, next);
    });

    //GET ONE
    router.get("/:resource/:id", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().get(req, res, next);
    });

    // POST ONE or MULTIPLE
    router.post("/:resource", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().create(req, res, next);
    });

    // PUT MULTIPLE, query allowed
    router.put("/:resource", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().updateMultiple(req, res, next);
    });

    //PUT ONE
    router.put("/:resource/:id", (req: Request, res: Response, next: NextFunction) => {
      new RestApi().update(req, res, next);
    });
  }

  private async convertSaveData(userData:any, restConfig: RestConfig, resourceName: string, createMode:boolean = true) {
    const saveData = {};
    for ( let key in restConfig.configs) {
      let config = restConfig.configs[key];
      if (createMode && config.autoIncrement) {
        saveData[key] = await RestApi.resourceFactory.getAutoValue(resourceName, key);
      } else if (config.writable) {
        if (userData.hasOwnProperty(key)) {
          saveData[key] = userData[key];
        } else if (createMode && config.required) {
          throw new MissingParameterError(`${key} is required to create the ${resourceName}`, key);
        }
      }
    }
    return saveData;
  }

  /**
   * Create a new hero.
   * @param req {Request} The express request object.
   * @param res {Response} The express response object.
   * @param next {NextFunction} The next function to continue.
   */
  public async create(req: Request, res: Response, next: NextFunction) {
    // create hero
    try {
      const resourceName = req.params['resource']
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const restConfig = RestApi.resourceFactory.restConfig(resourceName);
      if (req.body instanceof Array) {
        const createdResources = await Promise.all(req.body.map(async (resData) =>  {
          return new ResourceModel(await this.convertSaveData(resData, restConfig, resourceName));
        }));
        const savedResources = await ResourceModel.insertMany(createdResources);
        RestApi.logger.debug(`Resources for ${resourceName} were created: ${savedResources}`);
        res.json(savedResources);
        next();
      } else {
        const createdResource = new ResourceModel(await this.convertSaveData(req.body, restConfig, resourceName));
        const savedResource = await createdResource.save();
        RestApi.logger.debug(`Resource for ${resourceName} was created: ${savedResource.toObject()}`);
        res.json(savedResource.toObject());
        next();
      }
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }
  }

  /**
   * Delete a resource
   * @param req {Request} The express request object.
   * @param res {Response} The express response object.
   * @param next {NextFunction} The next function to continue.
   */
  public async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceName = req.params['resource'];
      const id: string = req.params['id'];
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const restConfig = RestApi.resourceFactory.restConfig(resourceName);
      const pk = restConfig.primaryKey;
      const matchedResource = await ResourceModel.findOne({[pk]: id});
      if (matchedResource) {
        await matchedResource.remove();
        RestApi.logger.debug(`${resourceName}/${id} was removed successfully`);
        res.sendStatus(200);
        next();
      } else {
        throw new NotFoundError(`${resourceName}/${id} is not found`);
      }
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }
  }

   /**
   * Delete multiple resources
   * @param req {Request} The express request object.
   * @param res {Response} The express response object.
   * @param next {NextFunction} The next function to continue.
   */
  public async deleteMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceName = req.params['resource'];
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const {primaryKey} = RestApi.resourceFactory.restConfig(resourceName);
      const deleteData = req.body instanceof Array? req.body: [req.body];
      const deleteIds = _.chain(deleteData).map(primaryKey).filter(x=>x !== undefined).value();
      if (deleteIds.length === 0) {
        res.json({deleted: 0});
        next();
        return;
      }
      const response = await ResourceModel.deleteMany({[primaryKey]: { $in: deleteIds} });
      RestApi.logger.debug(`${response.n} resources for ${resourceName} were deleted`);
      res.json({deleted: response.n});
      next();
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }
  }
  /**
   * Get a resource
   * @param req {Request} The express request object.
   * @param res {Response} The express response object.
   * @param next {NextFunction} The next function to continue.
   */
  public async get(req: Request, res: Response, next: NextFunction) {
    // verify the id parameter exists
    try {
      const resourceName = req.params['resource'];
      const id: string = req.params['id'];
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const restConfig = RestApi.resourceFactory.restConfig(resourceName);
      const pk = restConfig.primaryKey;

      const matchedResource = await ResourceModel.findOne({ [pk]: id});
      if (matchedResource) {
        res.json(
          _.pickBy(matchedResource.toObject(), (value, key) => restConfig.isReadable(key))
        );
        next();
      } else {
        throw new NotFoundError(`${resourceName}/${id} is not found`);
      }
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }
  }

  /**
   * List all heros.
   * @param req {Request} The express request object.
   * @param res {Response} The express response object.
   * @param next {NextFunction} The next function to continue.
   */
  public async list(req: Request, res: Response, next: NextFunction) {
    // get heros
    try {
      const resourceName = req.params['resource'];
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const restConfig = RestApi.resourceFactory.restConfig(resourceName);
      const resources = await ResourceModel.find();
      res.json(resources.map(resource =>
        _.pickBy(resource.toObject(), (value, key) => {
          return restConfig.isReadable(key)
        })
      ));
      next();
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }

  }

  public async updateMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceName = req.params['resource'];
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const restConfig = RestApi.resourceFactory.restConfig(resourceName);
      const pk = restConfig.primaryKey;
      const writeData = req.body instanceof Array? req.body: [req.body];
      if (writeData.length === 0) {
        res.json({updated: 0});
        next();
        return;
      }
      const writeOperations = await Promise.all(writeData.map(async (resData) => {
        const savedData = await this.convertSaveData(resData, restConfig, resourceName, false);
        const writeOperation = {
          updateOne: { filter: {[pk]: resData[pk]}, update: savedData }
        };
        return writeOperation;
      }));
      const response = await ResourceModel.bulkWrite(writeOperations);
      const modifiedCount = response.modifiedCount;
      RestApi.logger.debug(`${modifiedCount} resources for ${resourceName} were updated`);
      if ((response as any).hasWriteErrors()) {
        const errors = (response as any).getWriteErrors();
        RestApi.logger.debug(`${errors.length} resources for ${resourceName} failed on update`);
        errors.forEach(error => {
          RestApi.logger.debug(`Update Error Detail:${error}`);
        });
        throw new ServerError('Failed on updating');
      }
      res.json({updated: modifiedCount});
      next();
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }
  }

  /**
   * Update a hero.
   * @param req {Request} The express request object.
   * @param res {Response} The express response object.
   * @param next {NextFunction} The next function to continue.
   */
  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceName = req.params['resource'];
      const id: string = req.params['id'];
      const ResourceModel = RestApi.resourceFactory.resourceModel(resourceName);
      const restConfig = RestApi.resourceFactory.restConfig(resourceName);
      const pk = restConfig.primaryKey;
      const matchedResource = await ResourceModel.findOne({[pk]: id});
      if (matchedResource) {
        const updateData = await this.convertSaveData(req.body, restConfig, resourceName, false);
        Object.assign(matchedResource, updateData);
        const savedResource = await matchedResource.save();
        RestApi.logger.debug(`Resource ${resourceName}/${id} was saved: ${savedResource.toObject()}`);
        res.json(savedResource.toObject());
        next();
      } else {
        throw new NotFoundError(`${resourceName}/${id} is not found`);
      }
    } catch(error) {
      if (error instanceof RestError) {
        res.status(error.errorCode).send({
          msg: error.errorMsg
        })
      } else {
        next(error);
      }
    }
  }

}
