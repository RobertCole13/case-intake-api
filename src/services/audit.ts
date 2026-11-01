import { prisma } from "../db";

// Writes one audit_events row. The status-change path does not call this. See SEEDED.md.
export async function record(examinerId: string, action: string, caseId: number): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      examinerId,
      action,
      caseId,
    },
  });
}
