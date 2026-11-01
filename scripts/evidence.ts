import { spawn, execSync, type ChildProcess } from "child_process";
import { createServer } from "net";
import { mkdirSync, writeFileSync } from "fs";
import http from "http";
import path from "path";
import { chromium } from "playwright";
import { signToken } from "../tests/helpers/token";

const findingId = process.argv[2];
const control = "ac-3";
const casePath = "/cases/1042";

if (findingId !== "412") {
  console.error("Usage: npm run evidence -- 412");
  process.exit(1);
}

interface Exchange {
  role: "denied" | "allowed";
  examinerId: string;
  method: "GET";
  url: string;
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function git(args: string): string {
  return execSync(`git ${args}`, { encoding: "utf8" }).trim();
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not bind a local port"));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function requestOnce(url: string, token: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
  });
}

async function request(url: string, token: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await requestOnce(url, token);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function card(input: {
  timestamp: string;
  sha: string;
  branch: string;
  environment: string;
  denied: Exchange;
  allowed: Exchange;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Finding ${findingId} ${control} evidence</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; margin: 32px; color: #1a1a1a; background: #fff; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .meta { font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
    .status { font-size: 42px; font-weight: 700; margin: 8px 0; }
    pre { font-size: 16px; background: #f4f4f4; padding: 16px; white-space: pre-wrap; word-break: break-word; }
    h2 { font-size: 18px; margin: 24px 0 8px; }
  </style>
</head>
<body>
  <h1>Finding ${findingId} · ${control.toUpperCase()}</h1>
  <div class="meta">
    <div>${escapeHtml(input.environment)}</div>
    <div>Branch ${escapeHtml(input.branch)} · ${escapeHtml(input.sha)}</div>
    <div>${escapeHtml(input.timestamp)}</div>
  </div>
  <h2>Denied request · ${escapeHtml(input.denied.examinerId)}</h2>
  <div>${escapeHtml(input.denied.method)} ${escapeHtml(casePath)}</div>
  <div class="status">${input.denied.status}</div>
  <pre>${escapeHtml(input.denied.body)}</pre>
  <h2>Allowed request · ${escapeHtml(input.allowed.examinerId)}</h2>
  <div>${escapeHtml(input.allowed.method)} ${escapeHtml(casePath)} · ${input.allowed.status}</div>
</body>
</html>`;
}

async function main(): Promise<void> {
  const sha = git("rev-parse HEAD");
  const branch = git("rev-parse --abbrev-ref HEAD");
  const dirty = git("status --porcelain").length > 0;
  const timestamp = new Date().toISOString();
  const environment = dirty
    ? `local build at ${sha}, with uncommitted changes`
    : `local build at ${sha}`;
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child: ChildProcess = spawn("npx", ["ts-node", "src/index.ts"], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    logs += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    logs += chunk.toString("utf8");
  });

  try {
    const deniedToken = signToken("examiner-b");
    const allowedToken = signToken("examiner-a");
    const deniedResponse = await request(`${base}${casePath}`, deniedToken);
    const allowedResponse = await request(`${base}${casePath}`, allowedToken);
    const denied: Exchange = {
      role: "denied",
      examinerId: "examiner-b",
      method: "GET",
      url: `${base}${casePath}`,
      status: deniedResponse.status,
      headers: deniedResponse.headers,
      body: deniedResponse.body,
    };
    const allowed: Exchange = {
      role: "allowed",
      examinerId: "examiner-a",
      method: "GET",
      url: `${base}${casePath}`,
      status: allowedResponse.status,
      headers: allowedResponse.headers,
      body: allowedResponse.body,
    };

    const outDir = path.join("evidence", findingId);
    mkdirSync(outDir, { recursive: true });
    const record = { findingId, control, timestamp, sha, branch, environment, denied, allowed };
    writeFileSync(path.join(outDir, "deny.json"), `${JSON.stringify(record, null, 2)}\n`);

    const pngPath = path.join(outDir, `${findingId}-${control}-deny-${sha}.png`);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
      await page.setContent(card({ timestamp, sha, branch, environment, denied, allowed }), {
        waitUntil: "load",
      });
      await page.screenshot({ path: pngPath, fullPage: true });
    } finally {
      await browser.close();
    }

    console.log(`Wrote ${path.join(outDir, "deny.json")}`);
    console.log(`Wrote ${pngPath}`);
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
