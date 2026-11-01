import request from "supertest";
import { prisma } from "../src/db";
import { createApp } from "../src/app";
import { signToken } from "./helpers/token";

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("filings", () => {
  it("lists submitted filings for the caller", async () => {
    const response = await request(app)
      .get("/filings")
      .query({ status: "submitted" })
      .set("Authorization", `Bearer ${signToken("examiner-a")}`);

    expect(response.status).toBe(200);
    expect(
      response.body.filings.every((filing: { status: string }) => filing.status === "submitted"),
    ).toBe(true);
    expect(response.body.filings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 5001,
          status: "submitted",
        }),
      ]),
    );
  });

  it("returns filing 5001", async () => {
    const response = await request(app)
      .get("/filings/5001")
      .set("Authorization", `Bearer ${signToken("examiner-a")}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 5001,
      caseId: 1042,
      title: "Q3 capital adequacy",
      status: "submitted",
    });
  });
});
