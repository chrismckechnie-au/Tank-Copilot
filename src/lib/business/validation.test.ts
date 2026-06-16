import { describe, expect, it } from "vitest";

import {
  businessFormSchema,
  clientFormSchema,
  clientTankFormSchema,
  teamMemberFormSchema,
} from "./validation";

describe("business validation", () => {
  it("accepts bounded business and client records", () => {
    expect(
      businessFormSchema.parse({
        name: "Harbour Aquatics",
        logoPath: "https://cdn.example.com/logo.png",
      }),
    ).toEqual({
      name: "Harbour Aquatics",
      logoPath: "https://cdn.example.com/logo.png",
    });

    expect(
      clientFormSchema.parse({
        businessId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Jones family reef",
        contact: "client@example.com",
        location: "Brisbane",
        notes: "Prefers weekend visits.",
      }),
    ).toMatchObject({ name: "Jones family reef" });
  });

  it("rejects invalid membership roles and client tank ownership input", () => {
    expect(() =>
      teamMemberFormSchema.parse({
        businessId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174111",
        role: "owner",
      }),
    ).toThrow();

    expect(() =>
      clientTankFormSchema.parse({
        businessId: "not-a-uuid",
        clientId: "123e4567-e89b-12d3-a456-426614174222",
        name: "Frag system",
        type: "reef",
        volume: 200,
        unitSystem: "metric",
        waterSource: "RODI",
      }),
    ).toThrow();
  });
});
