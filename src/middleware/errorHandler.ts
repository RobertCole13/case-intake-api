import { NextFunction, Request, Response } from "express";
import { HttpError } from "../httpError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  const stack = err instanceof Error ? err.stack : undefined;

  // Stack traces are returned to the client. See SEEDED.md.
  res.status(statusCode).json({ error: message, stack });
}
