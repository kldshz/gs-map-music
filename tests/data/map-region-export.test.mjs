import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildRegionCatalog, csvRows } from '../../scripts/export-map-region-data.mjs';

const areas = [
  { id: 1, name: '测试顶级', code: 'C:TEST', parentId: -1, sortIndex: 2, hiddenFlag: 0 },
  { id: 2, name: '测试地区', code: 'A:TEST:ONE', parentId: 1, sortIndex: 1, hiddenFlag: 0 },
];
const layer = { label: '测试目录', value: 'GROUP', children: [{ label: '测试分层', value: 'LEAF' }] };
const config = { plugins: { 'A:TEST:ONE': {
  extraConfig: { underground: { levels: [structuredClone(layer)] } },
  overlayConfig: { overlays: [structuredClone(layer), { label: '叠图独有状态', value: 'STATE' }] },
} } };

test('合并镜像目录，同时保留单渠道条目及真实来源', () => {
  const result = buildRegionCatalog(areas, config);
  assert.equal(result.nodes.length, 5);
  assert.equal(result.counts.mergedMirrorOccurrences, 2);
  const leaf = result.nodes.find(n => n.sourceValue === 'LEAF');
  assert.deepEqual(leaf.path, ['测试顶级', '测试地区', '测试目录', '测试分层']);
  assert.deepEqual(leaf.channels, ['underground', 'overlay']);
  assert.equal(leaf.sourceAreaId, null);
  assert.equal(leaf.ownerAreaId, 2);
  assert.equal(result.nodes.find(n => n.sourceValue === 'STATE').channels[0], 'overlay');
});

test('同名地点不按名称合并，隐藏标记从顶级传递', () => {
  const copy = structuredClone(config);
  copy.plugins['A:TEST:ONE'].overlayConfig.overlays.push({ label: '测试目录', value: 'OTHER' });
  const result = buildRegionCatalog(areas.map(a => ({ ...a, hiddenFlag: a.id === 1 ? 3 : 0 })), copy);
  assert.equal(result.nodes.filter(n => n.name === '测试目录').length, 2);
  assert(result.nodes.every(n => n.inheritedHidden));
});

test('拒绝父链缺失/循环、ID重复及同值路径名称冲突', () => {
  assert.throws(() => buildRegionCatalog([areas[1]], config), /缺少父地区/);
  assert.throws(() => buildRegionCatalog([{ ...areas[0], parentId: 2 }, areas[1]], config), /循环/);
  assert.throws(() => buildRegionCatalog([...areas, areas[1]], config), /重复地区/);
  const conflict = structuredClone(config);
  conflict.plugins['A:TEST:ONE'].overlayConfig.overlays[0].label = '冲突名称';
  assert.throws(() => buildRegionCatalog(areas, conflict), /名称冲突/);
});

test('不忽略无法匹配地区的分层配置', () => {
  assert.throws(() => buildRegionCatalog(areas, { plugins: { 'A:UNKNOWN:ONE': config.plugins['A:TEST:ONE'] } }), /无对应API地区/);
});

test('实际导出包含47个API地区和全部497个分层节点，纳塔示例父链正确', async () => {
  const catalog = JSON.parse(await fs.readFile(new URL('../../outputs/map-regions-20261006/kongying-region-catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(catalog.counts, { apiAreas: 47, roots: 11, expandedLayerNodes: 497, undergroundOccurrences: 453,
    overlayOccurrences: 494, mergedMirrorOccurrences: 450, totalNodes: 544, maxDepth: 4 });
  const keys = new Set(catalog.nodes.map(n => n.nodeKey));
  assert.equal(keys.size, 544);
  for (const node of catalog.nodes) {
    assert(!node.parentNodeKey || keys.has(node.parentNodeKey));
    assert.equal(node.depth, node.path.length);
    assert.equal(node.path.at(-1), node.name);
  }
  for (const [value, label] of [['LEGEND_SKYSERPENT_SHIP', '传说中的天蛇船'], ['NIGHTMARES_NURSERY', '噩梦的温床']]) {
    const node = catalog.nodes.find(n => n.areaCode === 'A:NT:NATA2' && n.sourceValue === value);
    assert.deepEqual(node.path, ['纳塔', '镜璧山、翘枝崖、奥奇卡纳塔', '奥奇卡纳塔', label]);
    assert.equal(node.sourceAreaId, null);
    assert.equal(node.ownerAreaId, 46);
    assert.equal(node.pointers.length, 2);
  }
  const rows = csvRows(catalog);
  assert.equal(rows.length, 544);
  assert(rows.every(row => row.length === 20 && row[7] === '' && row[8] === ''));
});
