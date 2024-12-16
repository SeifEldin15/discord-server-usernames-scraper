const { ipcRenderer } = require('electron');

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