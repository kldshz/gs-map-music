import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/dev-ui',outputDir:'./.local/dev-browser-tests',fullyParallel:false,workers:1,reporter:'list',
  use:{baseURL:'http://127.0.0.1:5193',channel:'msedge',headless:true,trace:'retain-on-failure'},
  webServer:{command:'node scripts/start-development-test.mjs',url:'http://127.0.0.1:5193',reuseExistingServer:false,timeout:30000},
});
