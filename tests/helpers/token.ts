import jwt from "jsonwebtoken";
import { config } from "../../src/config";

export function signToken(examinerId: string): string {
  return jwt.sign({ sub: examinerId }, config.jwtSecret, { expiresIn: "1h" });
}
