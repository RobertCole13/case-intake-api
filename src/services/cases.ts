import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { badRequest, notFound } from "../httpError";
import { isAssigned } from "./assignments";
import {
  CaseExport,
  CaseJson,
  CaseListQuery,
  FilingJson,
  isCaseStatus,
} from "../types";

function toCaseJson(row: { id: number; title: string; status: string }): CaseJson {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
  };
}

function toFilingJson(row: { id: number; caseId: number; title: string; status: string }): FilingJson {
  return {
    id: row.id,
    caseId: row.caseId,
    title: row.title,
    status: row.status,
  };
}

function listWhere(query: CaseListQuery): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.title) {
    where.title = { contains: query.title };
  }
  return where;
}

export async function getById(id: number): Promise<CaseJson> {
  // Case read does not check assignment. See SEEDED.md.
  const row = await prisma.case.findUnique({ where: { id } });
  if (!row) {
    throw notFound("Case not found");
  }
  return toCaseJson(row);
}

export async function list(query: CaseListQuery): Promise<CaseJson[]> {
  // Case list does not check assignment. See SEEDED.md.
  const rows = await prisma.case.findMany({
    where: listWhere(query),
    orderBy: { id: "asc" },
  });
  return rows.map(toCaseJson);
}

export async function exportCase(id: number): Promise<CaseExport> {
  // Case export does not check assignment. See SEEDED.md.
  const row = await prisma.case.findUnique({
    where: { id },
    include: {
      filings: { orderBy: { id: "asc" } },
    },
  });
  if (!row) {
    throw notFound("Case not found");
  }

  return {
    case: toCaseJson(row),
    filings: row.filings.map(toFilingJson),
    generatedAt: new Date().toISOString(),
  };
}

export async function updateStatus(
  examinerId: string,
  id: number,
  status: string,
): Promise<CaseJson> {
  if (!isCaseStatus(status)) {
    throw badRequest("Unknown case status");
  }

  const existing = await prisma.case.findUnique({ where: { id } });
  if (!existing) {
    throw notFound("Case not found");
  }

  const assigned = await isAssigned(examinerId, id);
  if (!assigned) {
    throw notFound("Case not found");
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { status },
  });

  // Status changes do not write an audit event. See SEEDED.md.
  return toCaseJson(updated);
}
