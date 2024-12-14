const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch({
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: false,
        rgs: ['--profile-directory="your-profile-name-chrome"'],
        userDataDir:"C:\\Users\\your-system-username\\AppData\\Local\\Google\\Chrome\\User Data"
    });
    const page = await browser.newPage();
    
    console.log('Navigating to Discord...');
    await page.goto("*a url to the server you want to scrape with the right tab of usernames open*", {waitUntil: 'networkidle2'});
    
    console.log('Waiting for page to load completely...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Looking for elements...');
    await page.waitForSelector('.wrapper_c51b4e', { timeout: 60000 });

    console.log('Extracting aria labels...');
    const ariaLabels = await page.evaluate(() => {
        const elements = document.querySelectorAll('.wrapper_c51b4e');
        console.log(`Found ${elements.length} elements`);
        const labels = Array.from(elements).map(el => {
            const label = el.getAttribute('aria-label');
            return label ? label.trim() : null;
        }).filter(label => label !== null);
        return labels;
    });

    console.log(`Found ${ariaLabels.length} aria labels`);
    
    if (ariaLabels.length > 0) {
        const ariaLabelsJson = JSON.stringify(ariaLabels, null, 2);
        fs.writeFileSync('ariaLabels.json', ariaLabelsJson);
        console.log('Successfully saved ariaLabels.json');
    } else {
        console.log('No aria labels found to save');
    }
}

run().catch(error => {
    console.error('An error occurred:', error);
});
