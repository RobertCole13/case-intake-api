import request from "supertest";
import { prisma } from "../../src/db";
import { createApp } from "../../src/app";
import { signToken } from "../helpers/token";

const app = createApp();
const examinerB = () => signToken("examiner-b");

const HIDDEN_TITLES = [
  "Northwind Capital Periodic Exam",
  "Harborline Broker-Dealer Review",
];

afterAll(async () => {
  await prisma.$disconnect();
});

function expectNoHiddenRecord(body: unknown): void {
  const serialized = JSON.stringify(body);
  for (const title of HIDDEN_TITLES) {
    expect(serialized).not.toContain(title);
  }
  expect(body).not.toHaveProperty("title");
  expect(body).not.toHaveProperty("status");
  expect(body).not.toHaveProperty("filings");
  expect(body).not.toHaveProperty("case");
}

async function expectDenialAudit(action: string, caseId: number): Promise<void> {
  const events = await prisma.auditEvent.findMany({
    where: { examinerId: "examiner-b", caseId, action },
  });
  expect(events).toHaveLength(1);
  expect(events[0].createdAt).toBeInstanceOf(Date);
}

describe("case access", () => {
  it("denies an unassigned examiner the case detail", async () => {
    const response = await request(app)
      .get("/cases/1042")
      .set("Authorization", `Bearer ${examinerB()}`);

    expect(response.status).toBe(404);
    expectNoHiddenRecord(response.body);
    await expectDenialAudit("access-denied GET /cases/1042", 1042);
  });

  it("omits unassigned cases from the list", async () => {
    const response = await request(app)
      .get("/cases")
      .set("Authorization", `Bearer ${examinerB()}`);

    expect(response.status).toBe(200);
    const ids = response.body.cases.map((item: { id: number }) => item.id);
    expect(ids).not.toContain(1042);
    expect(ids).not.toContain(1043);
    const serialized = JSON.stringify(response.body);
    for (const title of HIDDEN_TITLES) {
      expect(serialized).not.toContain(title);
    }
  });

  it("omits an unassigned case from title search", async () => {
    const response = await request(app)
      .get("/cases")
      .query({ title: "Harborline" })
      .set("Authorization", `Bearer ${examinerB()}`);

    expect(response.status).toBe(200);
    expect(response.body.cases).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain("Harborline Broker-Dealer Review");
  });

  it("omits unassigned cases from status search", async () => {
    const response = await request(app)
      .get("/cases")
      .query({ status: "open" })
      .set("Authorization", `Bearer ${examinerB()}`);

    expect(response.status).toBe(200);
    const ids = response.body.cases.map((item: { id: number }) => item.id);
    expect(ids).not.toContain(1042);
    expect(ids).not.toContain(1043);
    const serialized = JSON.stringify(response.body);
    for (const title of HIDDEN_TITLES) {
      expect(serialized).not.toContain(title);
    }
  });

  it("denies an unassigned examiner the case export", async () => {
    const response = await request(app)
      .get("/cases/1042/export")
      .set("Authorization", `Bearer ${examinerB()}`);

    expect(response.status).toBe(404);
    expectNoHiddenRecord(response.body);
    await expectDenialAudit("access-denied GET /cases/1042/export", 1042);
  });

  it("denies an unassigned examiner the status update", async () => {
    const response = await request(app)
      .patch("/cases/1042/status")
      .set("Authorization", `Bearer ${examinerB()}`)
      .send({ status: "in_review" });

    expect(response.status).toBe(404);
    expectNoHiddenRecord(response.body);
    await expectDenialAudit("access-denied PATCH /cases/1042/status", 1042);
  });

  it("returns case 1107 to the assigned examiner", async () => {
    const response = await request(app)
      .get("/cases/1107")
      .set("Authorization", `Bearer ${examinerB()}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1107,
      title: "Southbank Mutual Fund Sweep",
      status: "in_review",
    });
  });
});
