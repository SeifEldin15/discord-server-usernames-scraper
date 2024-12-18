const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const bot = require('./bot');
const fs = require('fs');

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

ipcMain.on('get-default-paths', async (event) => {
    const defaultPaths = await bot.getDefaultPaths();
    event.reply('default-paths', defaultPaths);
});

ipcMain.on('browse-chrome', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Executables', extensions: ['exe'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        event.reply('selected-chrome-path', result.filePaths[0]);
    }
});

ipcMain.on('browse-userdata', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        event.reply('selected-userdata-path', result.filePaths[0]);
    }
});

ipcMain.on('start-inviting', async (event, config) => {
    try {
        await bot.sendInvites(config, (message) => {
            event.reply('log-message', message);
        });
        event.reply('inviting-complete');
    } catch (error) {
        event.reply('inviting-error', error.message);
    }
});

ipcMain.on('start-messaging-all', async (event, config) => {
    try {
        await bot.messageAll(config, (message) => {
            event.reply('log-message', message);
        });
        event.reply('messaging-complete');
    } catch (error) {
        event.reply('messaging-error', error.message);
    }
});

ipcMain.on('read-json-file', (event) => {
    try {
        const filePath = path.join(process.cwd(), 'output.json');
        const content = fs.readFileSync(filePath, 'utf8');
        event.reply('json-file-content', content);
    } catch (error) {
        event.reply('json-file-content', '[]');
    }
});

ipcMain.on('read-json-file-messaging', (event) => {
    try {
        const filePath = path.join(process.cwd(), 'output2.json');
        const content = fs.readFileSync(filePath, 'utf8');
        event.reply('json-file-content-messaging', content);
    } catch (error) {
        event.reply('json-file-content-messaging', '[]');
    }
});

ipcMain.on('save-json-file', (event, content) => {
    try {
        const filePath = path.join(process.cwd(), 'output.json');
        fs.writeFileSync(filePath, content);
        event.reply('json-save-success');
    } catch (error) {
        event.reply('json-save-error', error.message);
    }
});

ipcMain.on('cancel-processes', (event) => {
    bot.cancelProcesses();
    event.reply('processes-cancelled');
});