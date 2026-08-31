import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Playwright otherwise starts webServer relative to this configuration file,
// which produced steady-src/steady-src/release.cjs instead of the real path.
const repositoryRoot=fileURLToPath(new URL('../',import.meta.url));

export default defineConfig({
 testDir:'./e2e',
 outputDir:path.join(repositoryRoot,'test-results'),
 fullyParallel:false,
 forbidOnly:!!process.env.CI,
 workers:1,
 retries:1,
 timeout:60000,
 expect:{timeout:15000},
 reporter:[['list'],['html',{outputFolder:path.join(repositoryRoot,'playwright-report'),open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4397',locale:'en-IE',timezoneId:'Europe/Dublin',trace:'retain-on-failure',screenshot:'only-on-failure',serviceWorkers:'allow'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}],
 webServer:{
  cwd:repositoryRoot,
  command:'node steady-src/release.cjs && node steady-src/test-server.cjs',
  url:'http://127.0.0.1:4397',
  reuseExistingServer:false,
  timeout:30000,
  gracefulShutdown:{signal:'SIGTERM',timeout:5000}
 }
});
