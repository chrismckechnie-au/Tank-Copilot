import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260616070000_phase_5_commercial_foundation.sql"),
  "utf8",
);

describe("commercial RLS migration", () => {
  it("defines locked business helpers and role-gated tank policies", () => {
    expect(migration).toContain("public.is_business_member");
    expect(migration).toContain("public.has_business_role");
    expect(migration).toContain("public.can_manage_membership");
    expect(migration).toMatch(/security definer\s+set search_path = public/);
    expect(migration).toContain("and p_user_id = auth.uid()");
    expect(migration).toContain("revoke execute on function public.has_business_role");
    expect(migration).toContain("team_members_user_id_business_id_idx");
    expect(migration).toContain("drop constraint if exists reports_hobby_business_null");
    expect(migration).toContain("tanks_select_owner_or_business");
    expect(migration).toContain("public.can_read_tank(id, (select auth.uid()))");
    expect(migration).toContain("array['admin', 'editor']");
  });

  it("records membership and client-tank invariants in database triggers", () => {
    expect(migration).toContain("membership_admin_required");
    expect(migration).toContain("cannot_remove_last_admin");
    expect(migration).toContain("membership_identity_immutable");
    expect(migration).toContain("business_tank_requires_client");
    expect(migration).toContain("client_not_in_business");
  });
});
