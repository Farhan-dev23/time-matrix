const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:10000');
  
  // Login first
  await page.waitForSelector('#loginEmail');
  await page.type('#loginEmail', 'bob@mail.com');
  await page.type('#loginPassword', 'password123');
  await page.click('#authView button[type="submit"]');
  
  await page.waitForSelector('#appShell:not(.is-hidden)');
  
  // Evaluate the layout
  const layout = await page.evaluate(() => {
    const main = document.querySelector('main');
    const matrixView = document.querySelector('#matrixView');
    const header = document.querySelector('.topbar');
    const appShell = document.querySelector('.app-shell');
    const matrixGrid = document.querySelector('.matrix-grid');
    
    return {
      header: header ? header.getBoundingClientRect() : null,
      main: main ? main.getBoundingClientRect() : null,
      matrixView: matrixView ? matrixView.getBoundingClientRect() : null,
      appShell: appShell ? appShell.getBoundingClientRect() : null,
      matrixGrid: matrixGrid ? matrixGrid.getBoundingClientRect() : null
    };
  });
  
  console.log(JSON.stringify(layout, null, 2));
  
  await browser.close();
})();
