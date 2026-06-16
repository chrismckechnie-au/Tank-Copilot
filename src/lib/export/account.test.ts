import { describe, expect, it } from "vitest";

import { buildAccountExport } from "./account";

describe("buildAccountExport", () => {
  it("keeps account sections while stripping private share and artifact paths", () => {
    const account = buildAccountExport({
      exportedAt: "2026-06-16T00:00:00.000Z",
      profile: { id: "user-1", email: "person@example.com" },
      entitlements: [{ plan: "free" }],
      businesses: [{ name: "Service Co", logo_path: "private/logo.png" }],
      teamMemberships: [{ business_id: "business-1", user_id: "user-1" }],
      clients: [{ name: "Client", contact: "client@example.com" }],
      tanks: [{ id: "tank-1", photo_path: "private.jpg" }],
      equipment: [],
      waterTests: [{ photo_path: "private.jpg" }],
      recommendations: [],
      observations: [{ photo_paths: ["private.jpg"] }],
      maintenanceTasks: [],
      livestock: [{ photo_path: "private.jpg" }],
      reports: [
        {
          share_id: "secret-token",
          pdf_path: "private.pdf",
          content: { nested: { photoPaths: ["private.jpg"] } },
        },
      ],
    });

    const serialized = JSON.stringify(account);

    expect(account.profile).toEqual({ id: "user-1", email: "person@example.com" });
    expect(account.clients).toHaveLength(1);
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("private.jpg");
    expect(serialized).not.toContain("private.pdf");
  });
});
