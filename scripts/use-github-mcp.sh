#!/usr/bin/env bash
# Export a GitHub token for Cursor's project MCP config (.cursor/mcp.json).
# Run this in the shell that launches Cursor, or add it to your login profile,
# then fully quit and reopen Cursor so the MCP server can read the env var.
# Prefer a fine-grained PAT limited to RobertCole13/case-intake-api with
# Issues: write, Pull requests: write, Contents: read. For rehearsal, the
# token from `gh auth token` works if it still has repo scope.
set -euo pipefail

if [[ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
  echo "GITHUB_PERSONAL_ACCESS_TOKEN is already set (${#GITHUB_PERSONAL_ACCESS_TOKEN} chars)."
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is not installed. Create a fine-grained PAT and export it as GITHUB_PERSONAL_ACCESS_TOKEN."
  exit 1
fi

TOKEN="$(gh auth token)"
if [[ -z "${TOKEN}" ]]; then
  echo "gh auth token returned empty. Run: gh auth login -h github.com"
  exit 1
fi

export GITHUB_PERSONAL_ACCESS_TOKEN="${TOKEN}"
echo "Exported GITHUB_PERSONAL_ACCESS_TOKEN for this shell (${#TOKEN} chars)."
echo "Quit Cursor fully and relaunch it from this shell, or add the export to your login profile."
echo "MCP toolsets in .cursor/mcp.json: issues, pull_requests. mcpAllowlist stays empty so each call asks."
