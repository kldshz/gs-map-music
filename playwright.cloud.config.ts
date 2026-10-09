import { defineConfig } from '@playwright/test';
const baseURL=process.env.APP_BASE_URL??'http://127.0.0.1:8787';
export default defineConfig({
  testDir:'./tests/ui',testMatch:['cloudflare.spec.ts','real-audio.spec.ts'],
  outputDir:'./.local/cloudflare/browser-tests',fullyParallel:false,workers:1,reporter:'list',
  use:{baseURL,channel:'msedge',headless:true,trace:'retain-on-failure'},
  webServer:baseURL.startsWith('http://127.0.0.1:8787')?{
    command:'npm run cf:dev',url:baseURL,reuseExistingServer:true,timeout:30000,
  }:undefined,
});
