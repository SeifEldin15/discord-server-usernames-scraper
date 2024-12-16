const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getDefaultPaths() {
    const platform = process.platform;
    let chromePath;
    let userDataDir;

    if (platform === 'win32') {
        const username = process.env.USERNAME;
        chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        if (!fs.existsSync(chromePath)) {
            chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
        }
        userDataDir = path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\User Data');
    } else if (platform === 'darwin') {
        chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        userDataDir = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome');
    } else if (platform === 'linux') {
        chromePath = '/usr/bin/google-chrome';
        userDataDir = path.join(process.env.HOME, '.config/google-chrome');
    }

    return { chromePath, userDataDir };
}

async function run(config, logCallback) {
    try {
        const defaultPaths = await getDefaultPaths();
        
        logCallback(`Using Chrome path: ${config.chromePath || defaultPaths.chromePath}`);
        logCallback(`Using user data dir: ${config.userDataDir || defaultPaths.userDataDir}`);

        if (!fs.existsSync(config.chromePath || defaultPaths.chromePath)) {
            throw new Error(`Chrome executable not found at: ${config.chromePath || defaultPaths.chromePath}`);
        }

        const browser = await puppeteer.launch({
            executablePath: config.chromePath || defaultPaths.chromePath,
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--user-data-dir=${config.userDataDir || defaultPaths.userDataDir}`,
                '--profile-directory=Default'
            ],
            ignoreDefaultArgs: ['--disable-extensions']
        });
        const page = await browser.newPage();
        
        logCallback('Navigating to Discord...');
        await page.goto(config.discordUrl, {waitUntil: 'networkidle2'});
        
        logCallback('Waiting for page to load completely...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        logCallback('Looking for elements...');
        await page.waitForSelector('.wrapper_c51b4e', { timeout: 60000 });

        logCallback('Extracting aria labels...');
        const Output = await page.evaluate(() => {
            const elements = document.querySelectorAll('.wrapper_c51b4e');
            const labels = Array.from(elements).map(el => {
                const label = el.getAttribute('aria-label');
                return label ? label.trim() : null;
            }).filter(label => label !== null);
            return labels;
        });

        logCallback(`Found ${Output.length} aria labels`);
        
        if (Output.length > 0) {
            const OutputJson = JSON.stringify(Output, null, 2);
            fs.writeFileSync('output.json', OutputJson);
            logCallback('Successfully saved Output.json');
        } else {
            logCallback('No aria labels found to save');
        }

        await browser.close();
    } catch (error) {
        logCallback(`Error: ${error.message}`);
        throw error;
    }
}

module.exports = { run, getDefaultPaths };
