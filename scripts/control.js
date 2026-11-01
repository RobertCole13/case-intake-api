const fs = require("fs");
const path = require("path");

const controlId = (process.argv[2] || "").trim().toLowerCase();
if (!controlId) {
  console.error("Usage: npm run control -- <control-id>");
  process.exit(1);
}

const catalogPath = path.join(__dirname, "..", "controls", "NIST_SP-800-53_rev5_catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

function walk(nodes, visit) {
  for (const node of nodes || []) {
    visit(node);
    walk(node.controls, visit);
    walk(node.groups, visit);
  }
}

let control = null;
walk(catalog.catalog.groups, (node) => {
  if ((node.id || "").toLowerCase() === controlId) {
    control = node;
  }
});

if (!control) {
  console.error(`No control ${controlId} in the pinned catalog.`);
  process.exit(1);
}

function displayId(node) {
  const label = (node.props || []).find((prop) => prop.name === "label" && prop.class !== "zero-padded");
  return label ? label.value : node.id.toUpperCase();
}

function proseLines(part, lines) {
  if (part.prose) {
    lines.push(part.prose.trim());
  }
  for (const child of part.parts || []) {
    proseLines(child, lines);
  }
}

const statement = (control.parts || []).find((part) => part.name === "statement");
const lines = [];
if (statement) {
  proseLines(statement, lines);
}

const version = catalog.catalog.metadata.version;
console.log(`${displayId(control)} ${control.title}`);
console.log(`Catalog: NIST SP 800-53 Rev ${version}`);
console.log("");
console.log("Statement");
console.log(lines.join("\n\n") || "None");
console.log("");
console.log("Parameters");
const params = control.params || [];
if (params.length === 0) {
  console.log("None");
} else {
  for (const param of params) {
    const choices = param.select && param.select.choice;
    const detail = choices && choices.length ? ` (${choices.join("; ")})` : "";
    console.log(`- ${param.id}: ${param.label || param.id}${detail}`);
  }
}
