import { expect, test } from "@playwright/test";

test("la home carga sin sesión", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/MisReferidos/);
});

test("las rutas privadas mandan a login", async ({ page }) => {
  await page.goto("/app/publicar");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("una marca inexistente devuelve 404 real", async ({ request }) => {
  const res = await request.get("/marca/esta-marca-no-existe-e2e");
  expect(res.status()).toBe(404);
});

test("un perfil inexistente devuelve 404 real", async ({ request }) => {
  const res = await request.get("/u/nadie_e2e_404");
  expect(res.status()).toBe(404);
});

test("robots.txt y sitemap.xml son públicos", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<urlset");
});
