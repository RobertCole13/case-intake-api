import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();

// Case 1043 is the status-patch target so case 1042 stays open for read tests.
const examiners = [
  { id: "examiner-a", name: "Examiner A" },
  { id: "examiner-b", name: "Examiner B" },
];

const cases = [
  {
    id: 1042,
    title: "Northwind Capital Periodic Exam",
    status: "open",
  },
  {
    id: 1043,
    title: "Harborline Broker-Dealer Review",
    status: "open",
  },
  {
    id: 1107,
    title: "Southbank Mutual Fund Sweep",
    status: "in_review",
  },
  {
    id: 1108,
    title: "Northwind Affiliate Referral",
    status: "closed",
  },
];

// Case 1042 is assigned only to examiner-a.
const assignments = [
  { caseId: 1042, examinerId: "examiner-a" },
  { caseId: 1043, examinerId: "examiner-a" },
  { caseId: 1107, examinerId: "examiner-b" },
  { caseId: 1108, examinerId: "examiner-b" },
];

const filings = [
  {
    id: 5001,
    caseId: 1042,
    title: "Q3 capital adequacy",
    status: "submitted",
  },
  {
    id: 5002,
    caseId: 1042,
    title: "Q3 capital adequacy amendment",
    status: "amended",
  },
  {
    id: 5003,
    caseId: 1042,
    title: "Workpapers",
    status: "draft",
  },
  {
    id: 5004,
    caseId: 1043,
    title: "Harborline inventory",
    status: "submitted",
  },
  {
    id: 5005,
    caseId: 1107,
    title: "Southbank sweep amendment",
    status: "amended",
  },
  {
    id: 5006,
    caseId: 1107,
    title: "Southbank closing memo",
    status: "closed",
  },
  {
    id: 5007,
    caseId: 1108,
    title: "Affiliate referral draft",
    status: "draft",
  },
];

// Historical rows only. Nothing here is a case status change.
const auditEvents = [
  {
    examinerId: "examiner-a",
    action: "case_opened",
    caseId: 1042,
  },
  {
    examinerId: "examiner-a",
    action: "filing_submitted",
    caseId: 1042,
  },
];

async function main(): Promise<void> {
  await prisma.examiner.createMany({ data: examiners });
  await prisma.case.createMany({ data: cases });
  await prisma.assignment.createMany({ data: assignments });
  await prisma.filing.createMany({ data: filings });
  await prisma.auditEvent.createMany({ data: auditEvents });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
