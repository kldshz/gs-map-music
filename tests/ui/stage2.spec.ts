import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openPage(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '声音地图', exact: true })).toBeVisible();
  await expect(page.locator('#track-detail')).toContainText('Carefree');
  return errors;
}

test('desktop: map, provenance, sample time filters and honest player state', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openPage(page);
  await expect(page.getByText('阶段 2 示例', { exact: true })).toBeVisible();
  await expect(page.locator('.map-disclaimer')).toContainText('非实际游戏地图');
  const sampleList = page.locator('.music-panel .track-list').first();
  await expect(sampleList.getByRole('button')).toHaveCount(2);
  await page.getByRole('button', { name: '切换到夜晚模式' }).click();
  await expect(sampleList.getByRole('button')).toHaveCount(1);
  await expect(sampleList).toContainText('Brittle Rille');
  await page.getByRole('button', { name: /^示例地点 C/ }).click();
  await expect(page.locator('.music-panel .empty-state')).toHaveText('当前时段该位置暂无可用曲目');
  await page.getByRole('button', { name: /^示例地点 A/ }).click();
  await page.getByRole('button', { name: '切换到白天模式' }).click();
  await expect(page.locator('#track-detail')).toContainText('非原神许可示例');
  await expect(page.locator('#track-detail')).toContainText('12 秒片段');
  await expect(page.locator('#track-detail').getByRole('button', { name: /在地图定位/ })).toHaveCount(2);
  const locate = page.getByRole('button', { name: '在地图定位 示例地点 B', exact: true });
  await locate.focus();
  await locate.press('Enter');
  await expect(page.getByRole('button', { name: /^示例地点 B/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^示例地点 A/ }).click();
  await expect(page.getByRole('button', { name: '播放/暂停', exact: true })).toBeDisabled();
  await expect(page.getByRole('slider', { name: '播放进度（未接入）' })).toBeDisabled();
  await expect(page.locator('audio')).toHaveCount(0);
  const geometry = await page.evaluate(() => {
    const frame = document.querySelector('.map-frame')!.getBoundingClientRect();
    const footer = document.querySelector('.player-bar')!.getBoundingClientRect();
    const svg = document.querySelector<SVGSVGElement>('.map-svg')!;
    const matrix = svg.getScreenCTM()!;
    const pins = Array.from(document.querySelectorAll<HTMLButtonElement>('.map-pin'));
    const drift = pins.map((pin, index) => {
      const expected = new DOMPoint([100, 500, 900][index], 384).matrixTransform(matrix);
      const bounds = pin.getBoundingClientRect();
      return Math.hypot(bounds.x + bounds.width / 2 - expected.x, bounds.y + bounds.height / 2 - expected.y);
    });
    return { ratio: frame.width / frame.height, footerBottom: footer.bottom, footerTop: footer.top, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, drift };
  });
  expect(Math.abs(geometry.ratio - 4 / 3)).toBeLessThan(0.015);
  expect(geometry.drift.every(distance => distance < 3)).toBeTruthy();
  expect(geometry.footerBottom).toBeLessThanOrEqual(901);
  expect(geometry.footerTop).toBeGreaterThan(0);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
});

test('search: real catalog retains missing audio, coordinates and verified sources', async ({ page }, testInfo) => {
  const errors = await openPage(page);
  const search = page.getByRole('searchbox', { name: '搜索音乐' });
  await search.fill('not-a-track-8173');
  await expect(page.getByText('未找到匹配曲目', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '清除搜索', exact: true }).first().click();
  await search.fill('Dawn Winery Theme');
  await page.getByRole('button', { name: /Dawn Winery Theme/ }).click();
  const detail = page.locator('#track-detail');
  await expect(detail).toContainText('无音源');
  await expect(detail).toContainText('地点待核实');
  await expect(detail).toContainText('昼夜未知');
  await expect(detail).toContainText('无坐标');
  await expect(detail).toContainText('1:07');
  await expect(detail.getByRole('button', { name: /在地图定位/ })).toHaveCount(0);
  const sources = await detail.locator('.source-list a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(sources).toContain('https://music.apple.com/us/album/dawn-winery-theme/1535605650?i=1535607388');
  await page.getByRole('button', { name: '清除搜索', exact: true }).first().click();
  await page.getByRole('button', { name: /原神目录（待核实）/ }).click();
  await expect(page.getByRole('button', { name: /Before Dawn, at the Winery/ })).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('catalog.png'), fullPage: true });
});

test('route draft: keyboard points, revisits, visible line, undo and clear', async ({ page }, testInfo) => {
  const errors = await openPage(page);
  await page.getByRole('button', { name: '路线', exact: true }).click();
  for (const name of ['A', 'B', 'A']) {
    const pin = page.getByRole('button', { name: `将 示例地点 ${name} 加入路线`, exact: true });
    await pin.focus();
    await pin.press('Enter');
  }
  await expect(page.getByRole('list', { name: '路线草稿' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.locator('.map-svg polyline')).toHaveAttribute('points', '100,384 500,384 100,384');
  await expect(page.getByRole('button', { name: '开始模拟', exact: true })).toBeDisabled();
  await expect(page.getByText('图像单位/秒', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('route.png'), fullPage: true });
  await page.getByRole('button', { name: '撤销最后一点', exact: true }).click();
  await expect(page.getByRole('list', { name: '路线草稿' }).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: '清除全部', exact: true }).click();
  await expect(page.getByText('尚未添加任何路点', { exact: true })).toBeVisible();
  await expect(page.locator('.map-svg polyline')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('dialog: keyboard focus, attribution, escape and focus return', async ({ page }, testInfo) => {
  await openPage(page);
  await expect(page.locator('.skip-link')).toHaveCount(1);
  const trigger = page.getByRole('button', { name: '资源说明', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: '资源说明' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Kevin MacLeod');
  await expect(dialog).toContainText('非原神 OST');
  await expect(dialog.getByRole('link')).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - 640)).toBeLessThan(3);
  await page.screenshot({ path: testInfo.outputPath('dialog.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const width of [390, 320]) {
  test(`mobile ${width}: scrollable details, constant player, usable pins and modal`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = await openPage(page);
    await expect(page.locator('.map-disclaimer')).toBeVisible();
    for (const bounds of await page.locator('.map-pin').evaluateAll(pins => pins.map(pin => pin.getBoundingClientRect().toJSON()))) {
      expect(bounds.width).toBeGreaterThanOrEqual(40);
      expect(bounds.height).toBeGreaterThanOrEqual(40);
    }
    await page.locator('#track-detail .source-list').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`mobile-${width}.png`), fullPage: true });
    const layout = await page.evaluate(() => {
      const footer = document.querySelector('.player-bar')!.getBoundingClientRect();
      const source = document.querySelector('#track-detail .source-list')!.getBoundingClientRect();
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, footer: footer.toJSON(), source: source.toJSON() };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(width);
    expect(layout.footer.bottom).toBeLessThanOrEqual(845);
    expect(layout.footer.height).toBeLessThanOrEqual(120);
    expect(layout.source.bottom).toBeLessThanOrEqual(layout.footer.top + 1);
    await page.getByRole('button', { name: '资源说明', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(3);
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
}
