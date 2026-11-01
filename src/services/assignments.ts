import { prisma } from "../db";

export async function isAssigned(examinerId: string, caseId: number): Promise<boolean> {
  const assignment = await prisma.assignment.findUnique({
    where: {
      caseId_examinerId: { caseId, examinerId },
    },
  });
  return assignment !== null;
}

export async function assignedCaseIds(examinerId: string): Promise<number[]> {
  const rows = await prisma.assignment.findMany({
    where: { examinerId },
    select: { caseId: true },
  });
  return rows.map((row) => row.caseId);
}
