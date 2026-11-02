#!/usr/bin/env bash
# Fail if any file changed since BASE is outside .harness/scope/<id>.txt.
# Branch must be finding/<id>. The evidence screenshot is allowed by pattern
# because its name includes the commit SHA and is not listed in advance.
set -euo pipefail

BASE="${1:-origin/main}"
BRANCH="${2:-}"

if [[ -z "${BRANCH}" ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

case "${BRANCH}" in
  finding/*)
    FINDING_ID="${BRANCH#finding/}"
    ;;
  *)
    echo "scope-check: branch '${BRANCH}' is not finding/<id>; skipping."
    exit 0
    ;;
esac

if [[ ! "${FINDING_ID}" =~ ^[0-9]+$ ]]; then
  echo "scope-check: finding id '${FINDING_ID}' must be numeric"
  exit 1
fi

SCOPE_FILE=".harness/scope/${FINDING_ID}.txt"

if [[ ! -f "${SCOPE_FILE}" ]]; then
  echo "scope-check: missing ${SCOPE_FILE}"
  exit 1
fi

ALLOWED_FILE="$(mktemp)"
trap 'rm -f "${ALLOWED_FILE}"' EXIT
grep -v '^[[:space:]]*$' "${SCOPE_FILE}" | sed 's/[[:space:]]*$//' > "${ALLOWED_FILE}"
if ! grep -Fxq -- "${SCOPE_FILE}" "${ALLOWED_FILE}"; then
  echo "${SCOPE_FILE}" >> "${ALLOWED_FILE}"
fi

is_allowed() {
  local path="$1"
  if grep -Fxq -- "${path}" "${ALLOWED_FILE}"; then
    return 0
  fi
  case "${path}" in
    evidence/"${FINDING_ID}"/*-deny-*.png)
      return 0
      ;;
  esac
  return 1
}

CHANGED_FILE="$(mktemp)"
trap 'rm -f "${ALLOWED_FILE}" "${CHANGED_FILE}"' EXIT
git diff --name-only "${BASE}...HEAD" > "${CHANGED_FILE}"

if [[ ! -s "${CHANGED_FILE}" ]]; then
  echo "scope-check: no changed files against ${BASE}"
  exit 0
fi

FAILED=0
echo "scope-check: finding ${FINDING_ID}"
echo "scope-check: base ${BASE}"
echo "scope-check: allowed paths from ${SCOPE_FILE}"
sed 's/^/  - /' "${ALLOWED_FILE}"
echo "scope-check: changed files"
while IFS= read -r path; do
  [[ -z "${path}" ]] && continue
  if is_allowed "${path}"; then
    echo "  ok  ${path}"
  else
    echo "  BAD ${path}"
    FAILED=1
  fi
done < "${CHANGED_FILE}"

if [[ "${FAILED}" -ne 0 ]]; then
  echo "scope-check: one or more files are outside the approved scope list"
  exit 1
fi

echo "scope-check: all changed files are in scope"
