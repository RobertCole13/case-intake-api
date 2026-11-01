const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
const cmd = input.command || "";
const deny = [
  /\b(curl|wget)\b/i,
  /(>|>>|\btee\b|\bsed\s+-i).*(package\.json|jest\.config|prisma\/seed)/i,
  /\brm\s+-rf\b/i,
  /\bprisma\s+migrate\b/i,
];

if (deny.some((pattern) => pattern.test(cmd))) {
  console.log(
    JSON.stringify({
      permission: "deny",
      user_message:
        "Blocked by policy: network fetch, destructive command, or test-config write in a remediation run.",
      agent_message: "That command is blocked by the repository hook. Do not retry it; continue without it.",
    }),
  );
  process.exit(0);
}

console.log(JSON.stringify({ permission: "allow" }));
