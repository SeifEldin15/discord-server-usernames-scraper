const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const bot = require('./bot');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('start-scraping', async (event, config) => {
    try {
        await bot.run(config, (message) => {
            event.reply('log-message', message);
        });
        event.reply('scraping-complete');
    } catch (error) {
        event.reply('scraping-error', error.message);
    }
});