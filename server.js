const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
// Use the port provided by Render or default to 8080
const port = process.env.PORT || 8080;

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
const wss = new WebSocket.Server({
    server,
    // Allow pings and automatic pongs to keep connections alive
    clientTracking: true,
    perMessageDeflate: true
});

// Broadcast helper
function broadcast(data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`New WebSocket connection from: ${ip}`);

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
        console.log(`WebSocket connection closed from: ${ip}`);
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${ip}:`, error);
    });
});

// Set a ping interval to keep connections alive
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// Set the 'isAlive' property on new connections and handle pongs
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    if (process.env.RENDER) {
        console.log(`Deployed on Render at ${process.env.RENDER_EXTERNAL_URL}`);
    } else {
        console.log(`For local network access, use: http://${getLocalIp()}:${port}`);
    }
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
