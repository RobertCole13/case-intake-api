import request from "supertest";
import { prisma } from "../src/db";
import { createApp } from "../src/app";
import { signToken } from "./helpers/token";

const app = createApp();
const token = () => signToken("examiner-a");

afterAll(async () => {
  await prisma.$disconnect();
});

describe("cases", () => {
  it("returns case 1042", async () => {
    const response = await request(app)
      .get("/cases/1042")
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1042,
      title: "Northwind Capital Periodic Exam",
      status: "open",
    });
  });

  it("lists cases including 1042", async () => {
    const response = await request(app).get("/cases").set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1042,
          title: "Northwind Capital Periodic Exam",
        }),
      ]),
    );
  });

  it("filters cases by status", async () => {
    const response = await request(app)
      .get("/cases")
      .query({ status: "open" })
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.cases.length).toBeGreaterThan(0);
    expect(response.body.cases.every((item: { status: string }) => item.status === "open")).toBe(
      true,
    );
    expect(response.body.cases).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 1042 })]),
    );
  });

  it("searches cases by title", async () => {
    const response = await request(app)
      .get("/cases")
      .query({ title: "Harborline" })
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.cases).toEqual([
      expect.objectContaining({
        id: 1043,
        title: "Harborline Broker-Dealer Review",
      }),
    ]);
  });

  it("exports case 1042", async () => {
    const response = await request(app)
      .get("/cases/1042/export")
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.case).toMatchObject({
      id: 1042,
      title: "Northwind Capital Periodic Exam",
      status: "open",
    });
    expect(response.body.filings.map((filing: { id: number }) => filing.id)).toEqual([
      5001, 5002, 5003,
    ]);
    expect(response.body.generatedAt).toBe(new Date(response.body.generatedAt).toISOString());
  });

  it("updates the status of case 1043", async () => {
    const response = await request(app)
      .patch("/cases/1043/status")
      .set("Authorization", `Bearer ${token()}`)
      .send({ status: "in_review" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1043,
      status: "in_review",
    });
  });
});
