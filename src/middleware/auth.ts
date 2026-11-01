import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../db";
import { HttpError } from "../httpError";

// JWT `sub` is the examiner id.
function examinerIdFromToken(token: string): string {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, "Invalid token");
  }

  if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new HttpError(401, "Invalid token");
  }

  return payload.sub;
}

function bearerToken(header: string | undefined): string {
  if (!header) {
    throw new HttpError(401, "Missing bearer token");
  }

  const [scheme, token, extra] = header.split(" ");
  if (scheme !== "Bearer" || !token || extra !== undefined) {
    throw new HttpError(401, "Missing bearer token");
  }

  return token;
}

async function resolveExaminer(req: Request): Promise<string> {
  const examinerId = examinerIdFromToken(bearerToken(req.header("authorization")));
  const examiner = await prisma.examiner.findUnique({ where: { id: examinerId } });
  if (!examiner) {
    throw new HttpError(401, "Unknown examiner");
  }
  return examiner.id;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  resolveExaminer(req)
    .then((examinerId) => {
      req.examinerId = examinerId;
      next();
    })
    .catch(next);
}
