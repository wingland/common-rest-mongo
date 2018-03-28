import * as morgan from "morgan";
import * as log4js from 'log4js';
import * as mongoose from "mongoose";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as path from "path";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");
import { RestApi } from 'common-rest-mongo';
import { sampleConfig } from "./config/sampleConfig";
/**
 * The server.
 *
 * @class Server
 */
export class Server {

  public app: express.Application;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
   */
  public static bootstrap(): Server {
    return new Server();
  }

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {
    //create express js application
    this.app = express();

    //configure application
    this.config();

    //add api
    this.api();
  }

  /**
   * Create REST API routes
   *
   * @class Server
   * @method api
   */
  public api() {

    var router = express.Router();

    // configure CORS
    const corsOptions: cors.CorsOptions = {
      allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
      credentials: true,
      methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
      origin: "http://localhost:4200",
      preflightContinue: false
    };
    router.use(cors(corsOptions));

    // root request
    router.get("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.json({ announcement: "Welcome to our API." });
      next();
    });

    // create API routes
    RestApi.create(router, sampleConfig);

    // wire up the REST API
    this.app.use("/api", router);

    // enable CORS pre-flight
    router.options("*", cors(corsOptions));
    //empty for now
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   */
  public config() {
    // morgan middleware to log HTTP requests
    this.app.use(morgan("dev"));

    //log4j
    log4js.configure({
      appenders: { out: { type: 'console' }, file: {type: 'file', filename: 'logs/server.log'}},
      categories: { default: { appenders: ['out', 'file'], level: 'debug' } }
    });

    //use json form parser middleware
    this.app.use(bodyParser.json());


    //use query string parser middleware
    this.app.use(bodyParser.urlencoded({
      extended: true
    }));


    //use cookie parser middleware
    this.app.use(cookieParser("SECRET_GOES_HERE"));

    //use override middleware
    this.app.use(methodOverride());

    //connect to mongoose
    mongoose.connect("mongodb://localhost:27017/homeland");
    mongoose.connection.on("error", error => {
      console.error(error);
    });

    //catch 404 and forward to error handler
    this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
        err.status = 404;
        next(err);
    });

    //error handling
    this.app.use(errorHandler());

  }

}
require('source-map-support').install();
