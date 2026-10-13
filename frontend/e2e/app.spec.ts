import { expect, test as base, type Page } from "@playwright/test";

type Fixtures = { consoleErrors: string[] };

/** Fails a test if the browser logged any console error or uncaught exception. */
const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await use(errors);
  },
});

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function addLead(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Add Lead" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Name/).fill(name);
  await dialog.getByRole("button", { name: "Create lead" }).click();
  await expect(page.getByRole("button", { name: `Open ${name}` })).toBeVisible();
}

test("create lead, add discussion with follow-up, update and persist status", async ({
  page,
  consoleErrors,
}) => {
  const name = uniqueName("E2E Lead");
  const note = "E2E kickoff call notes";

  await page.goto("/");
  await addLead(page, name);

  // Open the lead (dialog, not a route change).
  const row = page.getByRole("button", { name: `Open ${name}` });
  await row.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Add a discussion with a follow-up scheduled for tomorrow.
  await dialog.getByLabel("Add discussion note").fill(note);
  await dialog
    .getByLabel(/Next follow-up/)
    .fill(toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  await dialog.getByRole("button", { name: "Save discussion" }).click();

  // The discussion appears in the timeline immediately.
  await expect(dialog.getByText(note)).toBeVisible();

  // Update the status and verify it persists after reopening.
  await dialog.getByLabel("Update lead status").selectOption("Qualified");
  await expect(dialog.getByLabel("Update lead status")).toHaveValue("Qualified");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Dashboard reflects the latest note.
  await expect(page.getByText(note)).toBeVisible();

  await row.click();
  const reopened = page.getByRole("dialog");
  await expect(reopened.getByLabel("Update lead status")).toHaveValue("Qualified");
  await expect(reopened.getByText(note)).toBeVisible();
  await page.keyboard.press("Escape");

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("overdue and today follow-ups are classified into their own sections", async ({
  page,
  consoleErrors,
}) => {
  const overdueName = uniqueName("Overdue Lead");
  const todayName = uniqueName("Today Lead");

  await page.goto("/");

  await addLead(page, overdueName);
  await page.getByRole("button", { name: `Open ${overdueName}` }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Add discussion note").fill("Missed this one");
  await dialog
    .getByLabel(/Next follow-up/)
    .fill(toLocalInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  await dialog.getByRole("button", { name: "Save discussion" }).click();
  await page.keyboard.press("Escape");

  await addLead(page, todayName);
  await page.getByRole("button", { name: `Open ${todayName}` }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Add discussion note").fill("Later today");
  const laterToday = new Date();
  laterToday.setHours(23, 30, 0, 0);
  if (laterToday.getTime() <= Date.now()) {
    laterToday.setTime(Date.now() + 60_000);
  }
  await dialog.getByLabel(/Next follow-up/).fill(toLocalInputValue(laterToday));
  await dialog.getByRole("button", { name: "Save discussion" }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("overdue-section").getByText(overdueName)).toBeVisible();
  await expect(page.getByTestId("today-section").getByText(todayName)).toBeVisible();

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
