
export class RestError extends Error {
  errorCode: number
  constructor(public errorMsg: string) {
    super(errorMsg)
  }
}

export class ServerError extends RestError {
  public errorCode = 500;
  constructor(public errorMsg:string){
    super(errorMsg);
  }
}

export class NotFoundError extends RestError {
  public errorCode = 404;
  constructor(public errorMsg:string){
    super(errorMsg);
  }
}


export class SchemaConfigError extends RestError {
  public errorCode = 400;
  constructor(public errorMsg:string, public schemaName: string){
    super(errorMsg);
  }
}

export class MissingParameterError extends RestError {
  public errorCode = 400;
  constructor(public errorMsg:string, public parameterKey: string) {
    super(errorMsg);
  }
}
