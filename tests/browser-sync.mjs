const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {}), headless: true });
const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
const [a,b] = await Promise.all(contexts.map(c => c.newPage()));
const base = process.env.BASE_URL || "http://localhost:31401";
const results = [];
async function join(page, name) {
  await page.goto(base);
  await page.getByLabel("MỌI NGƯỜI GỌI BẠN LÀ").fill(name);
  await page.getByRole("button", {name:"Vào rạp cùng mọi người"}).click();
  await page.getByRole("button", {name:"Vào rạp cùng mọi người"}).waitFor({state:"hidden"});
}
async function observe(label) {
  const data = await Promise.all([a,b].map(p => p.locator(".youtube-mount").evaluate(el => ({...el.dataset}))));
  const errors = await Promise.all([a,b].map(p => p.locator(".player-error").allTextContents()));
  const residuals = data.map(d => Number(d.position) - Number(d.target));
  results.push({label, data, errors, residuals, estimatedPairDrift: Math.abs(residuals[0] - residuals[1])});
  assert.equal(data[0].revision, data[1].revision, label + ": same revision");
  assert.equal(data[0].video, data[1].video, label + ": same video");
  assert.ok(data.every(d => d.position !== undefined), label + ": player telemetry ready");
  assert.ok(errors.every(e => e.length === 0), label + ": no player errors");
  assert.ok(residuals.every(r => Math.abs(r) <= 1.75), label + ": within tolerance");
}
try {
  await join(a, "Host QA");
  await a.getByRole("button", {name:"Phát", exact:true}).click();
  await a.waitForTimeout(4000);
  await join(b, "Guest QA");
  await b.waitForTimeout(6000);
  await observe("late join");
  assert.equal(await b.getByRole("button",{name:"Tạm dừng",exact:true}).isDisabled(),true);
  await a.getByRole("button",{name:"Tạm dừng",exact:true}).click();
  await a.waitForTimeout(1600);
  await observe("pause");
  await a.getByLabel("Vị trí tua (giây)").fill("42");
  await a.getByRole("button",{name:"Tua",exact:true}).click();
  await a.waitForTimeout(1800); await observe("seek");
  await a.getByRole("button",{name:"Phát",exact:true}).click();
  await a.waitForTimeout(1800); await observe("play");
  await a.getByRole("button",{name:"Gửi video",exact:true}).click();
  await a.getByRole("textbox",{name:"Đường dẫn YouTube",exact:true}).fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await a.getByRole("button",{name:"Thêm vào hàng chờ",exact:true}).click();
  await a.locator('button[title="Chủ rạp chuyển bài"]').click();
  await a.waitForTimeout(5000); await observe("change video");
  await contexts[1].setOffline(true);
  await a.waitForTimeout(2000);
  await a.getByLabel("Vị trí tua (giây)").fill("80");
  await a.getByRole("button",{name:"Tua",exact:true}).click();
  await a.waitForTimeout(1000);
  await contexts[1].setOffline(false);
  await b.waitForTimeout(6500); await observe("reconnect");
  await a.screenshot({path:"artifacts/sync-host.png"});
  await b.screenshot({path:"artifacts/sync-guest.png"});
} finally {
  await writeFile("artifacts/browser-sync.json", JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
  await browser.close();
}
