import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 fullyParallel:false,
 workers:1,
 retries:1,
 timeout:60000,
 expect:{timeout:15000},
 reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4397',locale:'en-IE',timezoneId:'Europe/Dublin',trace:'retain-on-failure',screenshot:'only-on-failure',serviceWorkers:'allow'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}],
 webServer:{command:'node steady-src/release.cjs && node steady-src/test-server.cjs',url:'http://127.0.0.1:4397',reuseExistingServer:false,timeout:30000}
});
