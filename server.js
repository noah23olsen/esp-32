const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = 8080;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at root path and /temp for backward compatibility
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/temp', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast helper
function broadcast(data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Send welcome message
    ws.send(JSON.stringify({
        temperature: 0,
        humidity: 0,
        message: 'Connected to server'
    }));

    ws.on('message', (message) => {
        console.log('Received:', message.toString());

        // Just echo it to everyone
        try {
            const data = JSON.parse(message);
            broadcast(data);
        } catch (err) {
            console.error('Invalid JSON:', err.message);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`For local network access, use: http://${getLocalIp()}:${port}`);
});

// Helper function to get local IP address
function getLocalIp() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}
