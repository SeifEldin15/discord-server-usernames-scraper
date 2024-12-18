const { ipcRenderer } = require('electron');
const path = require('path');

// Load default paths when the window loads
window.addEventListener('DOMContentLoaded', async () => {
    ipcRenderer.send('get-default-paths');
    document.getElementById('cancelProcess').style.display = 'none';
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
        userDataDir: document.getElementById('userDataDir').value,
        useLimit: document.getElementById('useLimit').checked,
        userLimit: document.getElementById('userLimit').value
    };

    // Add validation
    if (!config.discordUrl.trim()) {
        alert('Please enter a Discord server URL');
        return;
    }
    if (!config.chromePath.trim()) {
        alert('Please select Chrome executable path');
        return;
    }
    if (!config.userDataDir.trim()) {
        alert('Please select User Data Directory');
        return;
    }

    document.getElementById('status').textContent = 'Status: Scraping...';
    document.getElementById('startScraping').disabled = true;
    document.getElementById('cancelProcess').style.display = 'inline-block';
    
    ipcRenderer.send('start-scraping', config);
});

document.getElementById('inviteAll').addEventListener('click', () => {
    const config = {
        discordUrl: document.getElementById('discordUrl').value,
        chromePath: document.getElementById('chromePath').value,
        userDataDir: document.getElementById('userDataDir').value,
        customMessage: document.getElementById('customMessage').value || 'hi',
        useLimit: document.getElementById('useLimit').checked,
        userLimit: document.getElementById('userLimit').value
    };

    // Add validation
    if (!config.discordUrl.trim()) {
        alert('Please enter a Discord server URL');
        return;
    }
    if (!config.chromePath.trim()) {
        alert('Please select Chrome executable path');
        return;
    }
    if (!config.userDataDir.trim()) {
        alert('Please select User Data Directory');
        return;
    }
    
    document.getElementById('status').textContent = 'Status: Sending invites...';
    document.getElementById('inviteAll').disabled = true;
    document.getElementById('cancelProcess').style.display = 'inline-block';
    
    ipcRenderer.send('start-inviting', config);
});

document.getElementById('messageAll').addEventListener('click', () => {
    lastClickedButton = 'messageAll';
    const config = {
        discordUrl: document.getElementById('discordUrl').value,
        chromePath: document.getElementById('chromePath').value,
        userDataDir: document.getElementById('userDataDir').value,
        customMessage: document.getElementById('customMessage').value,
        useLimit: document.getElementById('useLimit').checked,
        userLimit: document.getElementById('userLimit').value
    };
    
    // Add validation
    if (!config.discordUrl.trim()) {
        alert('Please enter a Discord server URL');
        return;
    }
    if (!config.chromePath.trim()) {
        alert('Please select Chrome executable path');
        return;
    }
    if (!config.userDataDir.trim()) {
        alert('Please select User Data Directory');
        return;
    }
    if (!config.customMessage.trim()) {
        alert('Please enter a message to send');
        return;
    }
    
    document.getElementById('status').textContent = 'Status: Sending messages...';
    document.getElementById('messageAll').disabled = true;
    document.getElementById('cancelProcess').style.display = 'inline-block';
    
    ipcRenderer.send('start-messaging-all', config);
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
    document.getElementById('cancelProcess').style.display = 'none';
});

ipcRenderer.on('scraping-error', (event, error) => {
    document.getElementById('status').textContent = `Status: Error - ${error}`;
    document.getElementById('startScraping').disabled = false;
    document.getElementById('cancelProcess').style.display = 'none';
});

ipcRenderer.on('inviting-complete', () => {
    document.getElementById('status').textContent = 'Status: Invites Sent';
    document.getElementById('inviteAll').disabled = false;
    document.getElementById('cancelProcess').style.display = 'none';
});

ipcRenderer.on('inviting-error', (event, error) => {
    document.getElementById('status').textContent = `Status: Invite Error - ${error}`;
    document.getElementById('inviteAll').disabled = false;
    document.getElementById('cancelProcess').style.display = 'none';
});

ipcRenderer.on('messaging-complete', () => {
    document.getElementById('status').textContent = 'Status: Messages Sent';
    document.getElementById('messageAll').disabled = false;
    document.getElementById('cancelProcess').style.display = 'none';
});

ipcRenderer.on('messaging-error', (event, error) => {
    document.getElementById('status').textContent = `Status: Messaging Error - ${error}`;
    document.getElementById('messageAll').disabled = false;
    document.getElementById('cancelProcess').style.display = 'none';
});

document.getElementById('openEditor').addEventListener('click', () => {
    const editorContainer = document.getElementById('editorContainer');
    const jsonEditor = document.getElementById('jsonEditor');
    
    // Read the appropriate JSON file based on context
    if (lastClickedButton === 'messageAll') {
        ipcRenderer.send('read-json-file-messaging');
    } else {
        ipcRenderer.send('read-json-file');
    }
});

document.getElementById('closeEditor').addEventListener('click', () => {
    document.getElementById('editorContainer').style.display = 'none';
});

document.getElementById('saveEditor').addEventListener('click', () => {
    const jsonEditor = document.getElementById('jsonEditor');
    try {
        // Validate JSON
        JSON.parse(jsonEditor.value);
        
        // Send to main process to save
        ipcRenderer.send('save-json-file', jsonEditor.value);
    } catch (error) {
        document.getElementById('status').textContent = 'Status: Invalid JSON format';
    }
});

ipcRenderer.on('json-file-content', (event, content) => {
    const jsonEditor = document.getElementById('jsonEditor');
    const editorContainer = document.getElementById('editorContainer');
    
    try {
        // Format the JSON with proper indentation
        const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
        jsonEditor.value = formattedJson;
        editorContainer.style.display = 'block';
    } catch (error) {
        document.getElementById('status').textContent = 'Status: Error loading JSON file';
    }
});

ipcRenderer.on('json-save-success', () => {
    document.getElementById('status').textContent = 'Status: JSON file saved successfully';
    document.getElementById('editorContainer').style.display = 'none';
});

ipcRenderer.on('json-save-error', (event, error) => {
    document.getElementById('status').textContent = `Status: Error saving JSON - ${error}`;
});

// Add new event listener for cancel button
document.getElementById('cancelProcess').addEventListener('click', () => {
    ipcRenderer.send('cancel-processes');
    document.getElementById('status').textContent = 'Status: Cancelling...';
});

// Add new IPC listener for cancel confirmation
ipcRenderer.on('processes-cancelled', () => {
    document.getElementById('status').textContent = 'Status: Cancelled';
    document.getElementById('startScraping').disabled = false;
    document.getElementById('inviteAll').disabled = false;
    document.getElementById('messageAll').disabled = false;
    document.getElementById('cancelProcess').style.display = 'none';
});

// Add new IPC listener for messaging JSON content
ipcRenderer.on('json-file-content-messaging', (event, content) => {
    const jsonEditor = document.getElementById('jsonEditor');
    const editorContainer = document.getElementById('editorContainer');
    
    try {
        const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
        jsonEditor.value = formattedJson;
        editorContainer.style.display = 'block';
    } catch (error) {
        document.getElementById('status').textContent = 'Status: Error loading JSON file';
    }
});

// Add variable to track which button was last clicked
let lastClickedButton = '';