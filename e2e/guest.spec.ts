import { expect, test, type Page } from "@playwright/test";

async function enterAsGuest(page: Page) {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

async function sectionLinks(page: Page) {
  await page.goto("/woche/1");
  const hrefs = await page.locator('a[href^="/woche/1/"]').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute("href") ?? "", text: a.textContent ?? "" })));
  return [...new Map(hrefs.map((h) => [h.href, h])).values()];
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("sign-in page renders particles and fits the screen", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Deutsch lernen.");
  await expect(page.locator("canvas.particles")).toBeAttached();
  await noHorizontalScroll(page);
});

test("particles stay off with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/signin");
  const drawn = await page.locator("canvas.particles").evaluate((c: HTMLCanvasElement) => c.width > 300 && c.height > 150);
  expect(drawn).toBe(false);
});

test("guest can open week 1 and gap fields keep their width while typing", async ({ page }) => {
  await enterAsGuest(page);
  await noHorizontalScroll(page);
  const links = await sectionLinks(page);
  await noHorizontalScroll(page);
  expect(links.length).toBeGreaterThan(3);
  let gap = page.locator("input.blank").first();
  for (const link of links) {
    await page.goto(link.href);
    if ((await gap.count()) > 0) break;
  }
  gap = page.locator("input.blank").first();
  await expect(gap).toBeVisible();
  const before = await gap.evaluate((el) => el.getBoundingClientRect().width);
  await gap.fill("Zusammenarbeit");
  const after = await gap.evaluate((el) => el.getBoundingClientRect().width);
  expect(after).toBe(before);
});

test("rubric scores move with arrow keys", async ({ page }) => {
  await enterAsGuest(page);
  const speaking = (await sectionLinks(page)).find((l) => /speak|sprechen/i.test(l.text + l.href));
  expect(speaking).toBeTruthy();
  await page.goto(speaking?.href ?? "/woche/1");
  const group = page.locator(".rubric").getByRole("radiogroup").first();
  await expect(group).toBeVisible();
  await group.getByRole("radio").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { checked: true })).toHaveText("1");
  await expect(group.getByRole("radio", { name: "1" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(group.getByRole("radio", { checked: true })).not.toHaveText("1");
});

test("writing shows one task at a time", async ({ page }) => {
  await enterAsGuest(page);
  const writing = (await sectionLinks(page)).find((l) => /writ|schreib/i.test(l.text + l.href));
  expect(writing).toBeTruthy();
  await page.goto(writing?.href ?? "/woche/1");
  await expect(page.locator(".writing")).toHaveCount(1);
  const first = await page.locator(".writing .task").textContent();
  await page.getByRole("button", { name: "Next task" }).click();
  await expect(page.locator(".writing .task")).not.toHaveText(first ?? "");
  await expect(page.getByText(/^Task 2 of \d+$/)).toBeVisible();
});

test("flashcards page loads for guests", async ({ page }) => {
  await enterAsGuest(page);
  await page.goto("/karten");
  await expect(page.locator("main")).toBeVisible();
  await noHorizontalScroll(page);
});
