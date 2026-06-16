import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260616080000_phase_6_entitlements_webhooks.sql"),
  "utf8",
);

describe("entitlements webhook migration", () => {
  it("uses event-id and object/type dedupe before entitlement mutation", () => {
    expect(migration).toContain("stripe_event_id text not null unique");
    expect(migration).toContain("webhook_events_object_event_fingerprint_unique");
    expect(migration).toContain("stripe_event_fingerprint");
    expect(migration).toContain("event_fingerprint := concat_ws");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("duplicate_event_or_object");
    expect(migration.indexOf("insert into public.webhook_events")).toBeLessThan(
      migration.indexOf("insert into public.entitlements"),
    );
  });

  it("keeps webhook event mutation service-role only", () => {
    expect(migration).toContain("alter table public.webhook_events enable row level security");
    expect(migration).toContain("grant all on public.webhook_events to service_role");
    expect(migration).toContain("revoke execute on function public.process_stripe_subscription_event");
    expect(migration).toContain("to service_role");
  });
});
