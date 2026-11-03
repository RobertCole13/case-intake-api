import request from "supertest";
import { prisma } from "../../src/db";
import { createApp } from "../../src/app";
import { signToken } from "../helpers/token";

const app = createApp();

const ASSIGNED = {
  id: "examiner-a",
  caseId: 1042,
  title: "Northwind Capital Periodic Exam",
};

const UNASSIGNED = {
  id: "examiner-b",
  caseId: 1042,
  title: "Northwind Capital Periodic Exam",
  exportFilingTitle: "Q3 capital adequacy",
};

function auth(examinerId: string): string {
  return `Bearer ${signToken(examinerId)}`;
}

function expectNoRecordFields(body: unknown, title: string): void {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain(title);
  expect(serialized).not.toContain(`"id":${UNASSIGNED.caseId}`);
  expect(serialized).not.toContain(`"id": ${UNASSIGNED.caseId}`);
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("AC-3 case access", () => {
  it("denies GET /cases/:id to an examiner who is not assigned", async () => {
    const response = await request(app)
      .get(`/cases/${UNASSIGNED.caseId}`)
      .set("Authorization", auth(UNASSIGNED.id));

    expect(response.status).toBe(404);
    expect(response.body.id).toBeUndefined();
    expect(response.body.title).toBeUndefined();
    expect(response.body.status).toBeUndefined();
    expectNoRecordFields(response.body, UNASSIGNED.title);

    const events = await prisma.auditEvent.findMany({
      where: {
        examinerId: UNASSIGNED.id,
        caseId: UNASSIGNED.caseId,
        action: `access-denied GET /cases/${UNASSIGNED.caseId}`,
      },
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.createdAt instanceof Date)).toBe(true);
  });

  it("denies GET /cases/:id/export to an examiner who is not assigned", async () => {
    const response = await request(app)
      .get(`/cases/${UNASSIGNED.caseId}/export`)
      .set("Authorization", auth(UNASSIGNED.id));

    expect(response.status).toBe(404);
    expect(response.body.case).toBeUndefined();
    expect(response.body.filings).toBeUndefined();
    expectNoRecordFields(response.body, UNASSIGNED.title);
    expect(JSON.stringify(response.body)).not.toContain(UNASSIGNED.exportFilingTitle);

    const events = await prisma.auditEvent.findMany({
      where: {
        examinerId: UNASSIGNED.id,
        caseId: UNASSIGNED.caseId,
        action: `access-denied GET /cases/${UNASSIGNED.caseId}/export`,
      },
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.createdAt instanceof Date)).toBe(true);
  });

  it("omits unassigned cases from GET /cases", async () => {
    const response = await request(app).get("/cases").set("Authorization", auth(UNASSIGNED.id));

    expect(response.status).toBe(200);
    expect(response.body.cases).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 1107 }), expect.objectContaining({ id: 1108 })]),
    );
    expect(response.body.cases).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: UNASSIGNED.caseId })]),
    );
    expectNoRecordFields(
      response.body.cases.filter((item: { id: number }) => item.id === UNASSIGNED.caseId),
      UNASSIGNED.title,
    );
  });

  it("omits unassigned cases from GET /cases?status=", async () => {
    const response = await request(app)
      .get("/cases")
      .query({ status: "open" })
      .set("Authorization", auth(UNASSIGNED.id));

    expect(response.status).toBe(200);
    expect(response.body.cases).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: UNASSIGNED.caseId })]),
    );
    expect(JSON.stringify(response.body)).not.toContain(UNASSIGNED.title);
  });

  it("omits unassigned cases from GET /cases?title=", async () => {
    const response = await request(app)
      .get("/cases")
      .query({ title: "Northwind Capital" })
      .set("Authorization", auth(UNASSIGNED.id));

    expect(response.status).toBe(200);
    expect(response.body.cases).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain(UNASSIGNED.title);
  });

  it("returns GET /cases/:id to the assigned examiner", async () => {
    const response = await request(app)
      .get(`/cases/${ASSIGNED.caseId}`)
      .set("Authorization", auth(ASSIGNED.id));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: ASSIGNED.caseId,
      title: ASSIGNED.title,
    });
  });

  it("returns GET /cases/:id/export to the assigned examiner", async () => {
    const response = await request(app)
      .get(`/cases/${ASSIGNED.caseId}/export`)
      .set("Authorization", auth(ASSIGNED.id));

    expect(response.status).toBe(200);
    expect(response.body.case).toMatchObject({
      id: ASSIGNED.caseId,
      title: ASSIGNED.title,
    });
  });

  it("includes the assigned case on GET /cases", async () => {
    const response = await request(app).get("/cases").set("Authorization", auth(ASSIGNED.id));

    expect(response.status).toBe(200);
    expect(response.body.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ASSIGNED.caseId,
          title: ASSIGNED.title,
        }),
      ]),
    );
  });
});
