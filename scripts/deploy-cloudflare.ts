import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildD1Export } from './export-d1';
import { validateSnapshot, validateLibrary } from '../src/domain/validation';
import { applyAssociationEdits } from '../src/domain/association-edits';

/** Vite merges manual edits and normalizes field order. Compare against that effective library. */
export async function checkCloudflareBuild(root=process.cwd()) {
  const read=async(p:string)=>fs.readFile(path.join(root,p));
  const sourceMap=await read('public/data/kongying-map.json');
  const map=validateSnapshot(JSON.parse(sourceMap.toString('utf8')));
  const base=validateLibrary(JSON.parse((await read('public/data/music-library.json')).toString('utf8')),new Set(map.anchors.map(a=>a.id)),map);
  const edits=JSON.parse((await read('data/association-edits.json')).toString('utf8'));
  const library=applyAssociationEdits(base,map,edits);
  const builtMap=await read('dist/data/kongying-map.json');
  const builtMusic=await read('dist/data/music-library.json');
  if(!sourceMap.equals(builtMap)||builtMusic.toString('utf8')!==JSON.stringify(library,null,2)+'\n'){
    throw Error('构建快照与当前数据/人工编辑不一致；请先重新 npm run build，再发布');
  }
  return buildD1Export(map,base,edits).manifest.release;
}
export function requireCatalogVersion(expected:string,actual:string|undefined){
  if(actual!==expected)throw Error('远程D1活动版本与当前构建不一致；先执行 npm run cf:import:remote，不发布混合版本');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length>1||args.some(a=>a!=='--dry-run'))throw Error('只允许可选 --dry-run');
  const release=await checkCloudflareBuild();
  const wrangler=path.resolve('node_modules/wrangler/bin/wrangler.js'),config='.local/cloudflare/wrangler.json';
  const audit=spawnSync(process.execPath,[wrangler,'d1','execute','DB','--remote','--config',config,'--command','SELECT release_id FROM active_catalog WHERE singleton=1;','--json'],{encoding:'utf8',windowsHide:true});
  if(audit.status!==0)throw Error('无法读取远程D1版本，发布已停止；检查本机登录和绑定');
  requireCatalogVersion(release,JSON.parse(audit.stdout)?.[0]?.results?.[0]?.release_id);
  console.log(`构建与D1快照一致：${release}`);
  const deployed=spawnSync(process.execPath,[wrangler,'deploy','--config',config,...args],{stdio:'inherit',windowsHide:true});
  if(deployed.status!==0)throw Error('Cloudflare发布失败，请检查日志');
}
