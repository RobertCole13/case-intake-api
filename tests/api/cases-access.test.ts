import request from "supertest";
import { prisma } from "../../src/db";
import { createApp } from "../../src/app";
import { signToken } from "../helpers/token";

const app = createApp();
const unassigned = () => signToken("examiner-b");

const caseTitle = "Northwind Capital Periodic Exam";
const searchTitle = "Harborline Broker-Dealer Review";

afterAll(async () => {
  await prisma.$disconnect();
});

function serialized(body: unknown): string {
  return JSON.stringify(body);
}

describe("AC-3 case access", () => {
  it("denies GET /cases/1042 to a non-assigned examiner", async () => {
    const response = await request(app)
      .get("/cases/1042")
      .set("Authorization", `Bearer ${unassigned()}`);

    expect(response.status).toBe(404);
    expect(response.body.id).toBeUndefined();
    expect(response.body.title).toBeUndefined();
    expect(response.body.status).toBeUndefined();
    expect(serialized(response.body)).not.toContain("1042");
    expect(serialized(response.body)).not.toContain(caseTitle);
  });

  it("omits unassigned cases from GET /cases", async () => {
    const list = await request(app).get("/cases").set("Authorization", `Bearer ${unassigned()}`);

    expect(list.status).toBe(200);
    const listed = list.body.cases as { id: number; title: string }[];
    expect(listed.map((item) => item.id)).not.toContain(1042);
    expect(listed.map((item) => item.id)).not.toContain(1043);
    expect(serialized(list.body)).not.toContain(caseTitle);
    expect(serialized(list.body)).not.toContain(searchTitle);

    const search = await request(app)
      .get("/cases")
      .query({ title: "Harborline" })
      .set("Authorization", `Bearer ${unassigned()}`);

    expect(search.status).toBe(200);
    const found = search.body.cases as { id: number; title: string }[];
    expect(found.map((item) => item.id)).not.toContain(1043);
    expect(serialized(search.body)).not.toContain(searchTitle);
  });

  it("denies GET /cases/1042/export to a non-assigned examiner", async () => {
    const response = await request(app)
      .get("/cases/1042/export")
      .set("Authorization", `Bearer ${unassigned()}`);

    expect(response.status).toBe(404);
    expect(response.body.case).toBeUndefined();
    expect(response.body.filings).toBeUndefined();
    expect(serialized(response.body)).not.toContain("1042");
    expect(serialized(response.body)).not.toContain(caseTitle);
  });

  it("records access-denied audit events for named case reads", async () => {
    await request(app).get("/cases/1042").set("Authorization", `Bearer ${unassigned()}`);
    await request(app).get("/cases/1042/export").set("Authorization", `Bearer ${unassigned()}`);

    const detail = await prisma.auditEvent.findFirst({
      where: {
        examinerId: "examiner-b",
        caseId: 1042,
        action: "access-denied GET /cases/1042",
      },
    });
    expect(detail).not.toBeNull();
    expect(detail?.createdAt).toBeInstanceOf(Date);

    const exported = await prisma.auditEvent.findFirst({
      where: {
        examinerId: "examiner-b",
        caseId: 1042,
        action: "access-denied GET /cases/1042/export",
      },
    });
    expect(exported).not.toBeNull();
    expect(exported?.createdAt).toBeInstanceOf(Date);
  });
});
