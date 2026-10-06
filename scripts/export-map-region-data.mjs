import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const areaFields = ['id', 'name', 'code', 'parentId', 'isFinal', 'hiddenFlag', 'specialFlag', 'sortIndex'];

/** Join official area records with the two public map-layer trees, preserving provenance. */
export function buildRegionCatalog(areaRows, config) {
  if (!Array.isArray(areaRows) || !areaRows.length || !config.plugins) throw new Error('缺少地区数组或地图插件配置');
  const areas = areaRows.map(row => Object.fromEntries(areaFields.map(key => [key, row[key] ?? null])));
  const byId = new Map();
  const byCode = new Map();
  for (const area of areas) {
    if (!Number.isInteger(area.id) || typeof area.name !== 'string' || typeof area.code !== 'string') throw new Error('地区ID/名称/代码无效');
    if (byId.has(area.id) || byCode.has(area.code)) throw new Error(`重复地区: ${area.id}/${area.code}`);
    byId.set(area.id, area);
    byCode.set(area.code, area);
  }
  function ancestors(area, visited = new Set()) {
    if (visited.has(area.id)) throw new Error(`地区父链循环: ${area.id}`);
    visited.add(area.id);
    if (area.parentId === -1) return [area];
    const parent = byId.get(area.parentId);
    if (!parent) throw new Error(`缺少父地区: ${area.parentId}`);
    return [...ancestors(parent, visited), area];
  }
  const groups = new Map();
  for (const area of areas) {
    ancestors(area);
    const parent = area.parentId;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(area);
  }
  for (const group of groups.values()) group.sort((a, b) => (b.sortIndex ?? 0) - (a.sortIndex ?? 0) || a.id - b.id);

  const nodes = [];
  let undergroundCount = 0;
  let overlayCount = 0;
  let mirroredCount = 0;
  const areaKey = area => `area:${area.code}`;
  function appendArea(area) {
    const areaChain = ancestors(area);
    const labels = areaChain.map(a => a.name);
    const effectiveHidden = areaChain.some(a => a.hiddenFlag === 3);
    nodes.push({
      nodeKey: areaKey(area), parentNodeKey: area.parentId === -1 ? null : areaKey(byId.get(area.parentId)),
      depth: labels.length, name: area.name, path: labels, kind: area.parentId === -1 ? '顶级分类' : 'API地区',
      sourceAreaId: area.id, ownerAreaId: area.id, areaCode: area.code, sourceValue: null,
      channels: ['area-api'], pointers: [`area[id=${area.id}]`], hiddenFlag: area.hiddenFlag, inheritedHidden: effectiveHidden,
      sourceLabelUnknown: /^[？?]+$/.test(area.name), chunkIds: [], overlayBounds: [], supplementalPlace: '', userNotes: '',
    });
    const plugin = config.plugins[area.code];
    if (plugin) {
      const layerNodes = new Map();
      function visit(list, channel, pointer, values = [], names = []) {
        if (!Array.isArray(list)) throw new Error(`分层不是数组: ${pointer}`);
        for (let i = 0; i < list.length; i++) {
          const layer = list[i];
          if (typeof layer.label !== 'string' || typeof layer.value !== 'string') throw new Error(`分层label/value无效: ${pointer}[${i}]`);
          const valueChain = [...values, layer.value];
          const nameChain = [...names, layer.label];
          const key = `layer:${area.code}:${valueChain.map(encodeURIComponent).join('/')}`;
          let node = layerNodes.get(key);
          if (node) {
            if (node.name !== layer.label) throw new Error(`同一value路径名称冲突: ${key}`);
            if (node.channels.includes(channel)) throw new Error(`同一渠道重复value路径: ${key}`);
            mirroredCount++;
          } else {
            node = {
              nodeKey: key, parentNodeKey: values.length ? `layer:${area.code}:${values.map(encodeURIComponent).join('/')}` : areaKey(area),
              depth: labels.length + nameChain.length, name: layer.label, path: [...labels, ...nameChain],
              kind: values.length ? '地图分层子项' : '地图分层目录',
              sourceAreaId: null, ownerAreaId: area.id, areaCode: area.code, sourceValue: layer.value,
              channels: [], pointers: [], hiddenFlag: null, inheritedHidden: effectiveHidden,
              sourceLabelUnknown: /^[？?]+$/.test(layer.label), chunkIds: [], overlayBounds: [], supplementalPlace: '', userNotes: '',
            };
            layerNodes.set(key, node);
          }
          node.channels.push(channel);
          node.pointers.push(`${pointer}[${i}]`);
          if (channel === 'underground') undergroundCount++; else overlayCount++;
          if (channel === 'overlay') {
            for (const chunk of layer.chunks ?? []) {
              if (typeof chunk.value === 'string') node.chunkIds.push(chunk.value);
              if (Array.isArray(chunk.bounds)) node.overlayBounds.push(chunk.bounds);
            }
          }
          visit(layer.children ?? [], channel, `${pointer}[${i}].children`, valueChain, nameChain);
        }
      }
      visit(plugin.extraConfig?.underground?.levels ?? [], 'underground', `plugins[${JSON.stringify(area.code)}].extraConfig.underground.levels`);
      visit(plugin.overlayConfig?.overlays ?? [], 'overlay', `plugins[${JSON.stringify(area.code)}].overlayConfig.overlays`);
      const layerGroups = new Map();
      for (const node of layerNodes.values()) {
        if (!layerGroups.has(node.parentNodeKey)) layerGroups.set(node.parentNodeKey, []);
        layerGroups.get(node.parentNodeKey).push(node);
      }
      function appendLayers(parentKey) {
        for (const node of layerGroups.get(parentKey) ?? []) {
          nodes.push(node);
          appendLayers(node.nodeKey);
        }
      }
      appendLayers(areaKey(area));
    }
    for (const child of groups.get(area.id) ?? []) appendArea(child);
  }
  for (const area of groups.get(-1) ?? []) appendArea(area);
  const nodeKeys = new Set(nodes.map(node => node.nodeKey));
  if (nodes.length !== nodeKeys.size) throw new Error('目录节点键重复');
  for (const node of nodes) {
    if (node.parentNodeKey && !nodeKeys.has(node.parentNodeKey)) throw new Error(`父节点缺失: ${node.nodeKey}`);
  }
  const unmatchedPlugins = Object.entries(config.plugins).filter(([code, plugin]) =>
    !byCode.has(code) && (plugin.extraConfig?.underground?.levels?.length || plugin.overlayConfig?.overlays?.length)).map(([code]) => code);
  if (unmatchedPlugins.length) throw new Error(`分层配置无对应API地区: ${unmatchedPlugins.join(', ')}`);
  return {
    schemaVersion: 1, areas, nodes,
    counts: { apiAreas: areas.length, roots: groups.get(-1)?.length ?? 0, expandedLayerNodes: nodes.length - areas.length,
      undergroundOccurrences: undergroundCount, overlayOccurrences: overlayCount, mergedMirrorOccurrences: mirroredCount,
      totalNodes: nodes.length, maxDepth: Math.max(...nodes.map(node => node.depth)) },
  };
}

export const csvHeaders = ['层级','一级分类','二级地区','三级目录','四级分层','当前名称','来源类型','补充地点（填写）','备注（填写）',
  '节点键','父节点键','节点地区ID','所属地区ID','地区代码','原始value','配置渠道','完整路径','隐藏状态','名称待确认','来源位置'];
export function csvRows(catalog) {
  return catalog.nodes.map(n => [n.depth, ...Array.from({ length: 4 }, (_, i) => n.path[i] ?? ''), n.name, n.kind, '', '',
    n.nodeKey, n.parentNodeKey ?? '', n.sourceAreaId === null ? '' : String(n.sourceAreaId), String(n.ownerAreaId), n.areaCode,
    n.sourceValue ?? '', n.channels.join(' + '), n.path.join(' / '), n.inheritedHidden ? '包含默认隐藏分类' : '未标记默认隐藏',
    n.sourceLabelUnknown ? '原配置为问号' : '', n.pointers.join(' ; ')]);
}
const quoteCsv = value => `"${String(value).replaceAll('"', '""')}"`;

async function main() {
  const [areaPath, configPath, destination, capturedOn] = process.argv.slice(2);
  if (!areaPath || !configPath || !destination) throw new Error('用法: node scripts/export-map-region-data.mjs 地区响应.json webapp.json 输出目录 [来源快照日期YYYY-MM-DD]');
  if (capturedOn && !/^\d{4}-\d{2}-\d{2}$/.test(capturedOn)) throw new Error('来源快照日期格式应为YYYY-MM-DD');
  const [areaBytes, configBytes] = await Promise.all([fs.readFile(areaPath), fs.readFile(configPath)]);
  const response = JSON.parse(areaBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const envelope = response.body ?? response;
  if (!Array.isArray(envelope) && envelope.errorStatus !== 200) throw new Error('地区API业务状态不是200');
  const areaRows = Array.isArray(envelope) ? envelope : envelope.data;
  const config = JSON.parse(configBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const catalog = buildRegionCatalog(areaRows, config);
  catalog.provenance = {
    capturedOn: capturedOn ?? null, areaEndpoint: 'https://cloud.yuanshen.site/api/area/get/list',
    areaMethod: 'POST', areaRequest: { isTraverse: true, parentId: -1 },
    access: 'Official public V3 page initiated its normal visitor flow; no account credentials copied into this export.',
    areaRecordsSha256: hash(JSON.stringify(catalog.areas)), configUrl: 'https://assets.yuanshen.site/webapp.json', configSha256: hash(configBytes),
    scope: 'Returned API area tree plus underground/overlay directory union; not a list of every named game location, waypoint or music association.',
    rights: 'Personal project reference export requested by user; access does not independently grant public redistribution of game assets.',
  };
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, 'kongying-region-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  const rows = [csvHeaders, ...csvRows(catalog)];
  await fs.writeFile(path.join(destination, '空荧地区完整目录.csv'), '\uFEFF' + rows.map(row => row.map(quoteCsv).join(',')).join('\r\n') + '\r\n');
  console.log(JSON.stringify(catalog.counts));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
