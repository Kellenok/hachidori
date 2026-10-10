// SPDX-License-Identifier: GPL-3.0-or-later

// Settings asks before a removal or reset in its own modal rather than a native
// dialog. This waits for it, reads the question and its explanation, answers
// it and waits for it to close.
export async function answerConfirmation(page, accept) {
  await page.waitForSelector("#confirm-dialog[open]");
  const message = await page.$eval("#confirm-dialog", dialog =>
    `${dialog.querySelector("#confirm-dialog-title").textContent} ${dialog.querySelector("#confirm-dialog-body").textContent}`);
  // A pointer click at the button's centre: page.click's visibility wait does
  // not settle for a button inside the modal dialog.
  const point = await page.$eval(accept ? "#confirm-dialog-accept" : "#confirm-dialog-cancel", button => {
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForSelector("#confirm-dialog:not([open])");
  return message;
}
