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

async function addLead(
  page: Page,
  name: string,
  options: { company?: string; phone?: string } = {},
): Promise<void> {
  await page.getByRole("button", { name: "Add Lead" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Name/).fill(name);
  if (options.company) await dialog.getByLabel("Company").fill(options.company);
  if (options.phone) await dialog.getByLabel("Phone").fill(options.phone);
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

test("reload keeps lead, discussions, status and follow-up; a bare note retains the reminder", async ({
  page,
  consoleErrors,
}) => {
  const name = uniqueName("Persist Lead");
  const firstNote = "Kickoff with a reminder";
  const bareNote = "Follow-up email sent";

  await page.goto("/");
  // Item 1: name plus the optional company/phone fields.
  await addLead(page, name, { company: "Persist Co", phone: "+1 555 0100" });

  await page.getByRole("button", { name: `Open ${name}` }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByText("+1 555 0100")).toBeVisible();

  // Item 4: a discussion note with a follow-up scheduled for tomorrow.
  await dialog.getByLabel("Add discussion note").fill(firstNote);
  await dialog
    .getByLabel(/Next follow-up/)
    .fill(toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  await dialog.getByRole("button", { name: "Save discussion" }).click();
  await expect(dialog.getByText(firstNote)).toBeVisible();

  const reminderCell = () => dialog.locator("dt:has-text('Next follow-up') + dd");
  const reminderBefore = (await reminderCell().innerText()).trim();
  expect(reminderBefore).not.toContain("Not scheduled");

  // Item 9: a bare note (no follow-up) must keep the existing reminder.
  await dialog.getByLabel("Add discussion note").fill(bareNote);
  await dialog.getByRole("button", { name: "Save discussion" }).click();
  await expect(dialog.getByText(bareNote)).toBeVisible();
  const reminderAfter = (await reminderCell().innerText()).trim();
  expect(reminderAfter).toBe(reminderBefore);

  // Item 3: the timeline is reverse chronological (newest note first).
  const items = dialog.locator("ol[aria-label='Discussion history'] li");
  await expect(items).toHaveCount(2);
  const texts = await items.allInnerTexts();
  expect(texts[0]).toContain(bareNote);
  expect(texts[1]).toContain(firstNote);

  // Item 7: change status.
  await dialog.getByLabel("Update lead status").selectOption("Qualified");
  await expect(dialog.getByLabel("Update lead status")).toHaveValue("Qualified");
  await page.keyboard.press("Escape");

  // Item 8: a full page reload — everything is served from persisted data.
  await page.reload();
  const row = page.getByRole("button", { name: `Open ${name}` });
  await expect(row).toBeVisible();
  await expect(row).toContainText(bareNote);
  await expect(row).toContainText("Qualified");

  await row.click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Update lead status")).toHaveValue("Qualified");
  await expect(dialog.getByText(firstNote)).toBeVisible();
  await expect(dialog.getByText(bareNote)).toBeVisible();
  const reminderReloaded = (await reminderCell().innerText()).trim();
  expect(reminderReloaded).toBe(reminderBefore);
  await page.keyboard.press("Escape");

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("search, status filter and empty states", async ({ page, consoleErrors }) => {
  const alpha = uniqueName("Search Alpha");
  const beta = uniqueName("Search Beta");

  await page.goto("/");
  await addLead(page, alpha);
  await addLead(page, beta);

  // Search narrows the list to matching names.
  const search = page.getByLabel("Search leads by name");
  await search.fill(alpha);
  await expect(page.getByRole("button", { name: `Open ${alpha}` })).toBeVisible();
  await expect(page.getByRole("button", { name: `Open ${beta}` })).toHaveCount(0);

  // Clearing the search restores the full list.
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("button", { name: `Open ${beta}` })).toBeVisible();

  // A status filter that matches nothing shows the empty state.
  await page.getByLabel("Filter by status").selectOption("Won");
  await expect(page.getByText("No leads match your filters")).toBeVisible();

  // A nonsense search shows the empty state too.
  await page.getByLabel("Filter by status").selectOption("All");
  await search.fill("zzz-no-such-lead-000");
  await expect(page.getByText("No leads match your filters")).toBeVisible();

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
