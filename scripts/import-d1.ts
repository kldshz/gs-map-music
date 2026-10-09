import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { exportD1 } from './export-d1';

const args = process.argv.slice(2);
if (args.some(a => !['--local', '--remote'].includes(a)) || args.length !== 1) throw Error('必须明确选择 --local 或 --remote');
const remote = args[0] === '--remote';
const config = remote ? '.local/cloudflare/wrangler.json' : 'wrangler.jsonc';
const result = await exportD1();
const wrangler = path.resolve('node_modules/wrangler/bin/wrangler.js');
fs.mkdirSync('.local/cloudflare/import-logs',{recursive:true});
let step=0;
function run(args: string[]) {
  step++;
  for(let attempt=1;attempt<=3;attempt++){
    const proc = spawnSync(process.execPath, [wrangler, ...args, '--config', config], { encoding:'utf8',windowsHide: true,maxBuffer:32*1024*1024 });
    const log=(proc.stdout??'')+(proc.stderr??'');
    fs.writeFileSync(`.local/cloudflare/import-logs/${remote?'remote':'local'}-${String(step).padStart(3,'0')}-${attempt}.log`,log);
    if(proc.status===0){console.log(`D1 ${remote?'remote':'local'} 步骤 ${step} 完成：${args.includes('--file')?path.basename(args[args.indexOf('--file')+1]):args.slice(0,3).join(' ')}`);return;}
    // Files are idempotent; retry transient provider errors only, never schema/constraint errors.
    if(remote&&attempt<3&&/internal error|fetch failed|ECONNRESET|ETIMEDOUT|\b502\b|\b503\b|\b504\b/i.test(log)){
      console.log(`D1步骤${step}遇到临时服务错误，重试${attempt}/2`);continue;
    }
    console.error((proc.stderr??'').slice(-1600));throw Error('D1 导入已停止；未完成的新版本不会启用，旧版本保留');
  }
}
const mode = remote ? ['--remote'] : ['--local', '--persist-to', '.local/cloudflare/state'];
run(['d1', 'migrations', 'apply', 'DB', ...mode]);
for (const file of result.files) run(['d1', 'execute', 'DB', ...mode, '--file', path.join(result.directory, file.name), '--yes']);
run(['d1', 'execute', 'DB', ...mode, '--command', "SELECT r.manifest_json FROM active_catalog a JOIN catalog_release r ON r.id=a.release_id WHERE a.singleton=1;"]);
console.log(`D1 当前版本：${result.manifest.release}。历史版本保留；浏览器收藏歌单不迁移。`);
