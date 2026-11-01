import { prisma } from "../db";
import { notFound } from "../httpError";
import { assignedCaseIds, isAssigned } from "./assignments";
import { FilingJson } from "../types";

interface RawFilingRow {
  id: number | bigint;
  caseId: number | bigint;
  title: string;
  status: string;
}

function normalizeFiling(row: RawFilingRow): FilingJson {
  return {
    id: Number(row.id),
    caseId: Number(row.caseId),
    title: row.title,
    status: row.status,
  };
}

export async function listFilings(examinerId: string, status?: string): Promise<FilingJson[]> {
  // Status is concatenated into the SQL string. See SEEDED.md.
  const sql = status
    ? `SELECT "id", "caseId", "title", "status" FROM "filings" WHERE "status" = '${status}'`
    : `SELECT "id", "caseId", "title", "status" FROM "filings"`;

  const rows = await prisma.$queryRawUnsafe<RawFilingRow[]>(sql);
  const allowed = new Set(await assignedCaseIds(examinerId));

  return rows
    .map(normalizeFiling)
    .filter((row) => allowed.has(row.caseId))
    .sort((left, right) => left.id - right.id);
}

export async function getFiling(examinerId: string, id: number): Promise<FilingJson> {
  const filing = await prisma.filing.findUnique({ where: { id } });
  if (!filing) {
    throw notFound("Filing not found");
  }

  const assigned = await isAssigned(examinerId, filing.caseId);
  if (!assigned) {
    throw notFound("Filing not found");
  }

  return {
    id: filing.id,
    caseId: filing.caseId,
    title: filing.title,
    status: filing.status,
  };
}
