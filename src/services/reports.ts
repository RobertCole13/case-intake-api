import { prisma } from "../db";
import { WorkloadReport } from "../types";

export async function workload(): Promise<WorkloadReport> {
  const examiners = await prisma.examiner.findMany({
    orderBy: { id: "asc" },
    include: {
      assignments: {
        include: {
          caseRecord: {
            include: { filings: true },
          },
        },
      },
    },
  });

  return {
    examiners: examiners.map((examiner) => {
      let filingCount = 0;
      for (const assignment of examiner.assignments) {
        for (const filing of assignment.caseRecord.filings) {
          filingCount += 1;
          // Amended filings are counted twice. See SEEDED.md.
          if (filing.status === "amended") {
            filingCount += 1;
          }
        }
      }
      return { examinerId: examiner.id, filingCount };
    }),
  };
}
