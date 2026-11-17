import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TOPIC = "/sets/2024-s/mangel-paa-arbejdskraft";

test.describe("navigation", () => {
  test("home links to every practice mode", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Prøve i Dansk 3",
    );
    await page.getByRole("link", { name: "Questions" }).first().click();
    await expect(page).toHaveURL(/\/sets$/);
    await expect(
      page.getByRole("link", { name: /Mangel på arbejdskraft/ }),
    ).toBeVisible();
  });

  test("unknown topics return 404", async ({ page }) => {
    const response = await page.goto("/sets/2024-s/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });
});

test.describe("topic practice", () => {
  test("shows the picture sheet, questions and a playable suggested answer", async ({
    page,
  }) => {
    await page.goto(TOPIC);
    await expect(
      page.getByRole("heading", { level: 1, name: "Mangel på arbejdskraft" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Mangel på arbejdskraft/ }).first(),
    ).toBeVisible();

    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toContainText(
      "Der mangler arbejdskraft i sundhedssektoren",
    );
    await firstCard
      .getByRole("button", { name: "Show suggested answer" })
      .click();

    const play = firstCard.getByRole("button", { name: "Play answer" });
    await expect(play).toBeVisible();
    await expect(
      firstCard.locator('p[lang="da"] button').first(),
    ).toBeVisible();
    // The generated MP3 for the first sentence is requested and the sentence is highlighted.
    const audioResponse = page.waitForResponse(
      (r) => /\/audio\/[a-f0-9]+\.mp3$/.test(r.url()) && r.ok(),
    );
    await play.click();
    await audioResponse;
    await expect(firstCard.getByRole("button", { name: "Stop" })).toBeVisible();
  });

  test("English translations can be switched on", async ({ page }) => {
    await page.goto(TOPIC);
    await expect(page.locator('p[lang="en"]')).toHaveCount(0);
    await page.getByRole("switch", { name: "Show English" }).click();
    await expect(page.locator('p[lang="en"]').first()).toBeVisible();
  });

  test("marking a question as practised updates the progress", async ({
    page,
  }) => {
    await page.goto(TOPIC);
    await expect(page.getByText(/^0 of 6 questions$/)).toBeVisible();
    await page.getByRole("button", { name: "Practised" }).first().click();
    await expect(page.getByText(/^1 of 6 questions$/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/^1 of 6 questions$/)).toBeVisible();
  });
});

test("mock exam runs from intro to review", async ({ page }) => {
  await page.goto("/mock-exam");
  await page
    .getByLabel("Topic")
    .selectOption({ label: "Mangel på arbejdskraft (Maj-juni 2024)" });
  await page.getByRole("button", { name: "Start mock exam" }).click();

  // Keyboard only from here: focus must follow each phase (never fall back to <body>).
  const status = page.getByRole("status");
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(status).toContainText("Look at the pictures");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("button", { name: "I'm ready" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(status).toContainText("Answer the examiner");
  const next = page.getByRole("button", { name: /Next question|Finish/ });
  await expect(next).toBeFocused();
  for (let i = 0; i < 10 && (await next.isVisible()); i++) {
    await page.keyboard.press("Enter");
  }

  await expect(status).toContainText("The exam is over");
  await expect(
    page.getByRole("heading", { name: "Questions you were asked" }),
  ).toBeFocused();
});

test("delprøve 1 timer gives feedback on the length", async ({ page }) => {
  await page.goto("/delproeve-1");
  await page
    .getByLabel("Topic from your school")
    .fill("Livsstilssygdomme med fokus på diabetes");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/Too short/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Topic from your school")).toHaveValue(
    "Livsstilssygdomme med fokus på diabetes",
  );
});

test.describe("accessibility (axe, WCAG 2.2 A/AA)", () => {
  for (const path of [
    "/",
    "/sets",
    "/sets/2024-s",
    TOPIC,
    "/mock-exam",
    "/delproeve-1",
  ]) {
    test(`no serious violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
      ).toEqual([]);
    });
  }
});
