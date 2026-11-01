import request from "supertest";
import { prisma } from "../src/db";
import { createApp } from "../src/app";
import { signToken } from "./helpers/token";

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("workload report", () => {
  it("returns a filing count for each examiner", async () => {
    const response = await request(app)
      .get("/reports/workload")
      .set("Authorization", `Bearer ${signToken("examiner-a")}`);

    expect(response.status).toBe(200);
    const rows = response.body.examiners as { examinerId: string; filingCount: number }[];
    expect(rows.map((row) => row.examinerId)).toEqual(["examiner-a", "examiner-b"]);
    for (const row of rows) {
      expect(typeof row.filingCount).toBe("number");
    }
  });
});
