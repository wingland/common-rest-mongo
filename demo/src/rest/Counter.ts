
import { Document } from "mongoose";
export interface CounterInterface {seq: Number};
export interface CounterModel extends CounterInterface, Document{}


