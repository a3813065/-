const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const path = require('path');


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function scrollPage(page) {
  await page.evaluate(() => {
    window.scrollBy(0, window.innerHeight); 
  });
}


async function downloadPixivArtworkWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`正在嘗試第 ${attempt} 次下載：${url}`);
      await downloadPixivArtwork(url); 
      return; 
    } catch (error) {
      console.log(`嘗試失敗：${error.message}`);
      if (attempt === maxRetries) {
        console.log(`超出最大重試次數，跳過該作品：${url}`);
      }
    }
  }
}


async function downloadPixivArtwork(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: false, 
  });
  
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  
 
  page.on('request', request => {
    const imgUrl = request.url();
    
    
    if (imgUrl.includes('i.pximg.net') && /_p\d+/.test(imgUrl)) {
      console.log(`攔截到圖片請求：${imgUrl}`);
      const artworkId = imgUrl.split('_p')[0].split('/').pop();
      const downloadFolder = path.join(__dirname, artworkId);
      
    
      if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, { recursive: true });
      }

      downloadImage(imgUrl, downloadFolder);
      request.abort(); 
    } else {
      request.continue(); 
    }
  });

 
  await page.goto(url);


  for (let i = 0; i < 4; i++) {
    console.log(`開始進行第 ${i + 1} 次滾動操作...`);
    
   
    for (let j = 0; j < 3; j++) {
      await scrollPage(page);
      await delay(3000); 
    }

    
    try {
      await page.waitForSelector('button[class*="sc-emr523-0"]', { timeout: 5000 });
      await page.click('button[class*="sc-emr523-0"]');
      console.log('已經點擊 "查看全部" 按鈕');
      await delay(2000);
    } catch (e) {
      console.log('未能找到 "查看全部" 按鈕，可能已經顯示全部內容');
    }
  }

 
  await browser.close();
}


function downloadImage(url, folder) {
  const fileName = path.basename(url); 
  const filePath = path.join(folder, fileName); 

  const options = {
    headers: {
      'Referer': 'https://www.pixiv.net/' 
    }
  };

  https.get(url, options, response => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(filePath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`下載完成: ${fileName} 到資料夾 ${folder}`);
      });
    } else {
      console.log(`下載失敗: ${url}`);
    }
  }).on('error', error => {
    console.log(`請求錯誤: ${error.message}`);
  });
}


module.exports = { downloadPixivArtworkWithRetry };
