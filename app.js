const puppeteer = require('puppeteer');
const { downloadPixivArtworkWithRetry } = require('./666'); 


const MAX_PAGES = 8;  

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: false,
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-TW'
  });

  
  await page.setCookie({
    name: 'PHPSESSID',
    value: '你的cookies',  
    domain: 'www.pixiv.net',
  });

  let currentPage = 1;


  while (currentPage <= MAX_PAGES) {
    console.log(`正在加載第 ${currentPage} 頁...`);

    const url = `https://www.pixiv.net/tags/%E9%9C%8A%E7%A0%82/illustrations?p=${currentPage}`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
    });

   
    await page.waitForSelector('a[href*="/artworks/"]');

   
    const artworkLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/artworks/"]'));
      return [...new Set(links.map(link => link.href))];
    });

    console.log(`共找到 ${artworkLinks.length} 個作品連結`);

    
    for (let i = 0; i < artworkLinks.length; i++) {
      console.log(`正在處理第 ${i + 1} 個作品: ${artworkLinks[i]}`);
      await downloadPixivArtworkWithRetry(artworkLinks[i]); 
    }

   
    currentPage++;
  }

  console.log('所有頁面處理完畢');
  await browser.close();
})();
