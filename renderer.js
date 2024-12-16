const { ipcRenderer } = require('electron');
const path = require('path');

// Load default paths when the window loads
window.addEventListener('DOMContentLoaded', async () => {
    ipcRenderer.send('get-default-paths');
});

ipcRenderer.on('default-paths', (event, paths) => {
    document.getElementById('chromePath').value = paths.chromePath || '';
    document.getElementById('userDataDir').value = paths.userDataDir || '';
});

document.getElementById('browseChrome').addEventListener('click', () => {
    ipcRenderer.send('browse-chrome');
});

document.getElementById('browseUserData').addEventListener('click', () => {
    ipcRenderer.send('browse-userdata');
});

ipcRenderer.on('selected-chrome-path', (event, path) => {
    document.getElementById('chromePath').value = path;
});

ipcRenderer.on('selected-userdata-path', (event, path) => {
    document.getElementById('userDataDir').value = path;
});

document.getElementById('startScraping').addEventListener('click', () => {
    const config = {
        discordUrl: document.getElementById('discordUrl').value,
        chromePath: document.getElementById('chromePath').value,
        userDataDir: document.getElementById('userDataDir').value
    };

    document.getElementById('status').textContent = 'Status: Scraping...';
    document.getElementById('startScraping').disabled = true;
    
    ipcRenderer.send('start-scraping', config);
});

document.getElementById('openList').addEventListener('click', () => {
    ipcRenderer.send('open-list');
});

function appendToLog(message) {
    const log = document.getElementById('log');
    log.innerHTML += `${message}<br>`;
    log.scrollTop = log.scrollHeight;
}

ipcRenderer.on('log-message', (event, message) => {
    appendToLog(message);
});

ipcRenderer.on('scraping-complete', () => {
    document.getElementById('status').textContent = 'Status: Complete';
    document.getElementById('startScraping').disabled = false;
});

ipcRenderer.on('scraping-error', (event, error) => {
    document.getElementById('status').textContent = `Status: Error - ${error}`;
    document.getElementById('startScraping').disabled = false;
});