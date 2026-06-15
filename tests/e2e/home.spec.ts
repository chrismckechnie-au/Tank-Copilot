import { expect, test } from "@playwright/test";

test("home page exposes the Phase 0 shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /aquarium triage/i }),
  ).toBeVisible();
  await expect(page.getByText("Phase 0 foundation", { exact: true })).toBeVisible();
});

test("health endpoint reports Phase 0 status without secrets", async ({ request }) => {
  const response = await request.get("/health");
  const body = await response.json();

  expect(response.ok()).toBe(true);
  expect(body).toMatchObject({
    ok: true,
    service: "tank-copilot",
    phase: "0-foundation",
  });
  expect(JSON.stringify(body)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(JSON.stringify(body)).not.toContain("postgresql://");
});

test("web app manifest is available", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  const body = await response.json();

  expect(response.ok()).toBe(true);
  expect(body.name).toBe("Tank Copilot");
  expect(body.display).toBe("standalone");
});

test("login page exposes configured auth options", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /send magic link/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("protected app routes explain missing Supabase anon key", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: /supabase browser auth is not configured/i }),
  ).toBeVisible();
});
