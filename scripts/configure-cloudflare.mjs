import fs from 'node:fs/promises';
import path from 'node:path';
const [account, database, domain, worker = 'gs-map-music'] = process.argv.slice(2);
if (!/^[a-f0-9]{32}$/.test(account ?? '') || !/^[a-f0-9-]{36}$/.test(database ?? '')
  || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain ?? '') || !/^[a-z0-9-]+$/.test(worker)) {
  throw Error('用法：node scripts/configure-cloudflare.mjs <accountId> <databaseId> <domain> [workerName]');
}
const root = process.cwd();
const config = { name: worker, account_id: account, main: path.join(root, 'worker/index.ts'), compatibility_date: '2026-10-09',
  assets: { directory: path.join(root, 'dist'), binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: ['/api', '/api/*'] },
  d1_databases: [{ binding: 'DB', database_name: 'gs-map-music', database_id: database, migrations_dir: path.join(root, 'database/d1/migrations') }],
  routes: [{ pattern: domain, custom_domain: true }],
  observability: { enabled: true } };
await fs.mkdir('.local/cloudflare', { recursive: true });
await fs.writeFile('.local/cloudflare/wrangler.json', JSON.stringify(config, null, 2) + '\n');
console.log('已生成本机 Cloudflare 配置；账号凭据由 Wrangler 独立保管，不写入此文件或 Git。');
