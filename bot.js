const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let isCancelled = false;
let currentBrowser = null;

function resetCancelFlag() {
    isCancelled = false;
}

function setBrowser(browser) {
    currentBrowser = browser;
}

async function cancelProcesses() {
    isCancelled = true;
    if (currentBrowser) {
        try {
            await currentBrowser.close();
        } catch (error) {
            console.error('Error closing browser:', error);
        }
        currentBrowser = null;
    }
}

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

async function getSelfUsername(page) {
    try {
        const selfUsername = await page.evaluate(() => {
            const avatarElement = document.querySelector('.avatar_b2ca13');
            if (avatarElement) {
                const ariaLabel = avatarElement.getAttribute('aria-label');
                return ariaLabel ? ariaLabel.split(',')[0].trim() : null;
            }
            return null;
        });
        return selfUsername;
    } catch (error) {
        console.error('Error getting self username:', error);
        return null;
    }
}

async function run(config, logCallback) {
    try {
        resetCancelFlag();
        
        const defaultPaths = await getDefaultPaths();
        
        if (isCancelled) {
            throw new Error('Process cancelled by user');
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

        try {
            const page = await browser.newPage();
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            logCallback('Navigating to Discord...');
            await page.goto(config.discordUrl, {waitUntil: 'networkidle2'});
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            logCallback('Getting self username...');
            const selfUsername = await getSelfUsername(page);
            if (selfUsername) {
                logCallback(`Found self username: ${selfUsername}`);
            }

            logCallback('Waiting for page to load completely...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            logCallback('Looking for elements...');
            await page.waitForSelector('.wrapper_c51b4e', { timeout: 60000 });

            logCallback('Extracting aria labels...');
            const Output = await page.evaluate((selfUser) => {
                console.log('Self username to filter:', selfUser); // Debug log
                const elements = document.querySelectorAll('.wrapper_c51b4e');
                const labels = Array.from(elements)
                    .map(el => {
                        const label = el.getAttribute('aria-label');
                        // Extract just the username before the comma or status
                        return label ? label.split(',')[0].trim() : null;
                    })
                    .filter(label => {
                        // More strict filtering:
                        // 1. Remove null values
                        // 2. Remove empty strings
                        // 3. Remove exact matches with self username
                        return label !== null && 
                               label !== '' && 
                               label.toLowerCase() !== (selfUser || '').toLowerCase();
                    });
                return labels;
            }, selfUsername);

            logCallback(`Found ${Output.length} usernames (excluding self)`);
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            if (Output.length > 0) {
                const OutputJson = JSON.stringify(Output, null, 2);
                fs.writeFileSync('output.json', OutputJson);
                logCallback('Successfully saved Output.json');
            } else {
                logCallback('No aria labels found to save');
            }
        } finally {
            await browser.close();
        }
    } catch (error) {
        logCallback(`Error: ${error.message}`);
        throw error;
    }
}

async function sendInvites(config, logCallback) {
    try {
        resetCancelFlag();

        // First check if output.json exists
        const outputPath = path.join(process.cwd(), 'output.json');
        if (!fs.existsSync(outputPath)) {
            throw new Error('output.json not found. Please run the scraper first.');
        }

        // Read and parse the output.json file
        const usernames = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        if (!usernames || usernames.length === 0) {
            throw new Error('No usernames found in output.json');
        }

        logCallback(`Loaded ${usernames.length} usernames from output.json`);

        const browser = await puppeteer.launch({
            executablePath: config.chromePath,
            userDataDir: config.userDataDir,
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        try {
            const page = await browser.newPage();
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            await page.goto(config.discordUrl);
            
            // Get self username first
            const selfUsername = await getSelfUsername(page);
            if (selfUsername) {
                logCallback(`Found self username: ${selfUsername}`);
            }

            // Wait for the page to load
            await new Promise(resolve => setTimeout(resolve, 5000));

            for (const username of usernames) {
                if (isCancelled) {
                    throw new Error('Process cancelled by user');
                }
                // Skip if this is the self username
                if (username === selfUsername) {
                    logCallback(`Skipping self username: ${username}`);
                    continue;
                }
                try {
                    logCallback(`Processing user: ${username}`);

                    // Get all member elements
                    const members = await page.evaluate((targetUsername) => {
                        const elements = document.querySelectorAll('[aria-label]');
                        for (const el of elements) {
                            const ariaLabel = el.getAttribute('aria-label');
                            if (ariaLabel && ariaLabel.startsWith(targetUsername)) {
                                return el.getAttribute('aria-label');
                            }
                        }
                        return null;
                    }, username);

                    if (!members) {
                        logCallback(`Could not find member: ${username}`);
                        continue;
                    }

                    // Click on the member using the full aria-label (including status)
                    const memberSelector = `[aria-label="${members}"]`;
                    await page.waitForSelector(memberSelector, { timeout: 5000 });
                    await page.click(memberSelector);

                    // Try both input selectors
                    let messageInput = null;
                    try {
                        // First attempt: original class selector
                        messageInput = await page.waitForSelector('.textAreaForUserProfile_bdf0de', { timeout: 3000 });
                    } catch (inputError) {
                        logCallback('First input selector not found, trying aria-label selector...');
                        // Second attempt: aria-label selector
                        messageInput = await page.waitForSelector(`[aria-label^="${username}"]`, { timeout: 3000 });
                    }

                    if (!messageInput) {
                        throw new Error('Could not find message input field');
                    }

                    // Type the custom message instead of 'hi'
                    await messageInput.type(config.customMessage || 'hi');
                    
                    // Small delay before pressing Enter
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Press Enter to send
                    await page.keyboard.press('Enter');
                    
                    // Wait longer after sending to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    logCallback(`Successfully sent message to ${username}`);
                } catch (error) {
                    logCallback(`Failed to send message to ${username}: ${error.message}`);
                    continue;
                }

                if (isCancelled) {
                    throw new Error('Process cancelled by user');
                }
            }
        } finally {
            await browser.close();
        }
    } catch (error) {
        logCallback(`Error: ${error.message}`);
        throw error;
    }
}

async function messageAll(config, logCallback) {
    try {
        resetCancelFlag();

        // First run the scraper to update output2.json
        logCallback('Running scraper to update user list...');
        try {
            // Modified scraping logic to save to output2.json
            await runForMessaging(config, logCallback);
            logCallback('Successfully updated output2.json');
        } catch (error) {
            logCallback(`Failed to update user list: ${error.message}`);
            throw error;
        }

        const outputPath = path.join(process.cwd(), 'output2.json');
        const usernames = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        if (!usernames || usernames.length === 0) {
            throw new Error('No usernames found in output2.json');
        }

        logCallback(`Loaded ${usernames.length} usernames from output2.json`);

        for (const username of usernames) {
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }
            const browser = await puppeteer.launch({
                executablePath: config.chromePath,
                userDataDir: config.userDataDir,
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });

            try {
                const page = await browser.newPage();
                
                if (isCancelled) {
                    throw new Error('Process cancelled by user');
                }

                logCallback(`Processing user: ${username}`);
                
                // Navigate to Discord
                await page.goto(config.discordUrl, {waitUntil: 'networkidle2'});
                
                // Get self username first
                const selfUsername = await getSelfUsername(page);
                if (selfUsername && username === selfUsername) {
                    logCallback(`Skipping self username: ${username}`);
                    continue;
                }
                
                // Wait for the page to load
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Get all member elements
                const members = await page.evaluate((targetUsername) => {
                    const elements = document.querySelectorAll('[aria-label]');
                    for (const el of elements) {
                        const ariaLabel = el.getAttribute('aria-label');
                        if (ariaLabel && ariaLabel.startsWith(targetUsername)) {
                            return el.getAttribute('aria-label');
                        }
                    }
                    return null;
                }, username);

                if (!members) {
                    logCallback(`Could not find member: ${username}`);
                    continue;
                }

                // Click on the member using the full aria-label
                const memberSelector = `[aria-label="${members}"]`;
                await page.waitForSelector(memberSelector, { timeout: 5000 });
                await page.click(memberSelector);

                // Try both input selectors
                let messageInput = null;
                try {
                    messageInput = await page.waitForSelector('.textAreaForUserProfile_bdf0de', { timeout: 3000 });
                } catch (inputError) {
                    logCallback('First input selector not found, trying aria-label selector...');
                    messageInput = await page.waitForSelector(`[aria-label^="${username}"]`, { timeout: 3000 });
                }

                if (!messageInput) {
                    throw new Error('Could not find message input field');
                }

                // Type the custom message
                await messageInput.type(config.customMessage);
                
                // Small delay before pressing Enter
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Press Enter to send
                await page.keyboard.press('Enter');
                
                // Wait longer between messages to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                logCallback(`Successfully sent message to ${username}`);
            } catch (error) {
                logCallback(`Failed to send message to ${username}: ${error.message}`);
            } finally {
                await browser.close();
            }

            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }
        }
    } catch (error) {
        logCallback(`Error: ${error.message}`);
        throw error;
    }
}

// New function - copy of run() but saves to output2.json
async function runForMessaging(config, logCallback) {
    try {
        resetCancelFlag();
        
        const defaultPaths = await getDefaultPaths();
        
        if (isCancelled) {
            throw new Error('Process cancelled by user');
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

        try {
            const page = await browser.newPage();
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            logCallback('Navigating to Discord...');
            await page.goto(config.discordUrl, {waitUntil: 'networkidle2'});
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            logCallback('Getting self username...');
            const selfUsername = await getSelfUsername(page);
            if (selfUsername) {
                logCallback(`Found self username: ${selfUsername}`);
            }

            logCallback('Waiting for page to load completely...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            logCallback('Looking for elements...');
            await page.waitForSelector('.wrapper_c51b4e', { timeout: 60000 });

            logCallback('Extracting aria labels...');
            const Output = await page.evaluate((selfUser) => {
                console.log('Self username to filter:', selfUser); // Debug log
                const elements = document.querySelectorAll('.wrapper_c51b4e');
                const labels = Array.from(elements)
                    .map(el => {
                        const label = el.getAttribute('aria-label');
                        // Extract just the username before the comma or status
                        return label ? label.split(',')[0].trim() : null;
                    })
                    .filter(label => {
                        // More strict filtering:
                        // 1. Remove null values
                        // 2. Remove empty strings
                        // 3. Remove exact matches with self username
                        return label !== null && 
                               label !== '' && 
                               label.toLowerCase() !== (selfUser || '').toLowerCase();
                    });
                return labels;
            }, selfUsername);

            logCallback(`Found ${Output.length} usernames (excluding self)`);
            
            if (isCancelled) {
                throw new Error('Process cancelled by user');
            }

            if (Output.length > 0) {
                const OutputJson = JSON.stringify(Output, null, 2);
                fs.writeFileSync('output2.json', OutputJson);
                logCallback('Successfully saved output2.json');
            } else {
                logCallback('No aria labels found to save');
            }
        } finally {
            await browser.close();
        }
    } catch (error) {
        logCallback(`Error: ${error.message}`);
        throw error;
    }
}

module.exports = { 
    run, 
    getDefaultPaths, 
    sendInvites, 
    messageAll, 
    cancelProcesses,
    setBrowser,
    runForMessaging
};