import request from "supertest";
import { prisma } from "../../src/db";
import { createApp } from "../../src/app";
import { signToken } from "../helpers/token";

const app = createApp();
const token = () => signToken("examiner-b");

const UNASSIGNED_TITLES = [
  "Northwind Capital Periodic Exam",
  "Harborline Broker-Dealer Review",
];

const UNASSIGNED_FILING_TITLES = [
  "Q3 capital adequacy",
  "Q3 capital adequacy amendment",
  "Workpapers",
  "Harborline inventory",
];

afterAll(async () => {
  await prisma.$disconnect();
});

function expectNoRecordFields(body: unknown): void {
  const serialized = JSON.stringify(body);
  expect(body).not.toHaveProperty("id");
  expect(body).not.toHaveProperty("title");
  expect(body).not.toHaveProperty("status");
  expect(body).not.toHaveProperty("case");
  expect(body).not.toHaveProperty("filings");
  for (const title of [...UNASSIGNED_TITLES, ...UNASSIGNED_FILING_TITLES]) {
    expect(serialized).not.toContain(title);
  }
}

function expectCasesOmitUnassigned(cases: { id: number; title: string }[]): void {
  const ids = cases.map((item) => item.id);
  const titles = cases.map((item) => item.title);
  expect(ids).not.toContain(1042);
  expect(ids).not.toContain(1043);
  for (const title of UNASSIGNED_TITLES) {
    expect(titles).not.toContain(title);
  }
}

async function expectDenialAudit(action: string): Promise<void> {
  const event = await prisma.auditEvent.findFirst({
    where: {
      examinerId: "examiner-b",
      action,
      caseId: 1042,
    },
  });
  expect(event).not.toBeNull();
  expect(event?.createdAt).toBeInstanceOf(Date);
}

describe("AC-3 case reads", () => {
  it("denies GET /cases/1042 to a non-assigned examiner", async () => {
    const response = await request(app)
      .get("/cases/1042")
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(404);
    expectNoRecordFields(response.body);
    await expectDenialAudit("access-denied GET /cases/1042");
  });

  it("omits unassigned cases from GET /cases", async () => {
    const response = await request(app).get("/cases").set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expectCasesOmitUnassigned(response.body.cases);

    const filtered = await request(app)
      .get("/cases")
      .query({ status: "open" })
      .set("Authorization", `Bearer ${token()}`);

    expect(filtered.status).toBe(200);
    expectCasesOmitUnassigned(filtered.body.cases);
  });

  it("omits unassigned cases from title search", async () => {
    const harborline = await request(app)
      .get("/cases")
      .query({ title: "Harborline" })
      .set("Authorization", `Bearer ${token()}`);

    expect(harborline.status).toBe(200);
    expectCasesOmitUnassigned(harborline.body.cases);
    expect(
      harborline.body.cases.some((item: { title: string }) => item.title.includes("Harborline")),
    ).toBe(false);

    const northwind = await request(app)
      .get("/cases")
      .query({ title: "Northwind" })
      .set("Authorization", `Bearer ${token()}`);

    expect(northwind.status).toBe(200);
    expectCasesOmitUnassigned(northwind.body.cases);
    expect(
      northwind.body.cases.some(
        (item: { title: string }) => item.title === "Northwind Capital Periodic Exam",
      ),
    ).toBe(false);
  });

  it("denies GET /cases/1042/export to a non-assigned examiner", async () => {
    const response = await request(app)
      .get("/cases/1042/export")
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(404);
    expectNoRecordFields(response.body);
    await expectDenialAudit("access-denied GET /cases/1042/export");
  });
});
