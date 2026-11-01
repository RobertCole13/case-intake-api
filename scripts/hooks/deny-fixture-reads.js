const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
const filePath = input.file_path || input.path || "";

if (/(^|\/)fixtures\//.test(filePath)) {
  console.log(
    JSON.stringify({
      permission: "deny",
      user_message: "fixtures/ is not readable by the agent",
      agent_message: "fixtures/ is blocked by the repository hook. Do not retry the read.",
    }),
  );
  process.exit(0);
}

console.log(JSON.stringify({ permission: "allow" }));
