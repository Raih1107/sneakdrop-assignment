import {Router, Request, Response} from "express";
import { reserveOrQueue } from "../services/inventory";
import { asyncHandler } from "../utils/asyncHandler";


export const buyRouter = Router();