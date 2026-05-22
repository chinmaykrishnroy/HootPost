import { validationResult } from "express-validator";
import { badRequest } from "../utils/errors.js";

export const validateRequest = (req, res, next) => {
  const validation = validationResult(req);
  if (!validation.isEmpty()) {
    next(badRequest("Validation failed", validation.array()));
    return;
  }
  next();
};
