const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Add CORS support
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/temp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server Configuration
const wss = new WebSocket.Server({
  server,
  clientTracking: true,
  perMessageDeflate: {
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    zlibDeflateOptions: {
      level: 3
    },
    clientMaxWindowBits: 10,
    serverMaxWindowBits: 10,
    concurrentDeflate: true,
    threshold: 1024 // only compress if payload is larger than 1kb
  }
});

// Broadcast helper with error handling
function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(json);
      } catch (error) {
        console.error('Broadcast error:', error);
      }
    }
  });
}

// Connection management
const connections = new Set();

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`New WebSocket connection from: ${ip}`);

  // Track connection
  connections.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    temperature: 0,
    humidity: 0,
    message: 'Connected to server',
    connectedClients: connections.size
  }));

  // Message handling
  ws.on('message', (rawMessage) => {
    try {
      const message = rawMessage.toString();
      console.log('Received:', message);

      const data = JSON.parse(message);
      
      // Broadcast with timestamp
      const broadcastData = {
        ...data,
        timestamp: new Date().toISOString()
      };

      broadcast(broadcastData);
    } catch (err) {
      console.error('Message processing error:', err);
      ws.send(JSON.stringify({
        error: 'Invalid message format',
        message: rawMessage.toString()
      }));
    }
  });

  // Connection lifecycle
  ws.on('close', () => {
    connections.delete(ws);
    console.log(`WebSocket connection closed from: ${ip}`);
    
    // Optional: Broadcast connection count
    broadcast({
      message: 'Client disconnected',
      connectedClients: connections.size
    });
  });

  // Error handling
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${ip}:`, error);
    connections.delete(ws);
  });
});

// Connection keepalive mechanism
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Cleanup on server close
wss.on('close', () => {
  clearInterval(interval);
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  
  // Render deployment logging
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  wss.close(() => {
    console.log('WebSocket server closed');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});