const express = require('express');
const { SerialPort, list } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let ports = { user1: null, user2: null }; // Dynamic port configuration
let parsers = {}; // Parsers for detected ports

// Function to detect connected BleuIO dongle
const detectBleuIODongle = async () => {
  const portList = await SerialPort.list();
  for (const port of portList) {
    if (
      (process.platform === 'win32' &&
        port.pnpId &&
        port.pnpId.includes('VID_2DCF&PID_6002')) ||
      (process.platform === 'darwin' &&
        port.manufacturer &&
        port.manufacturer.includes('Smart Sensor Devices'))
    ) {
      return port.path; // Return the path of the detected dongle
    }
  }
  return null; // No dongle detected
};

// Function to initialize a port dynamically
const initializePort = async (user) => {
  const detectedPort = await detectBleuIODongle();
  if (!detectedPort) {
    console.error(`[ERROR]: No dongle detected for ${user}.`);
    return null;
  }
  console.log(`[${user.toUpperCase()}]: Detected BleuIO on ${detectedPort}`);
  const port = new SerialPort({ path: detectedPort, baudRate: 115200 });
  parsers[user] = port.pipe(new ReadlineParser({ delimiter: '\r\n' })); // Attach parser
  return port;
};

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`[SOCKET CONNECTED]: ${socket.id}`);

  socket.on('setUser', async (user) => {
    console.log(`[REQUEST]: Setting role for ${user}`);
    if (ports[user]) {
      console.log(`[INFO]: Port already assigned for ${user}`);
      socket.emit('roleSet', `Successfully assigned dongle to ${user}`);
      return;
    }

    // Dynamically initialize the port
    ports[user] = await initializePort(user);
    if (!ports[user]) {
      socket.emit('error', `[ERROR]: No dongle detected for ${user}`);
      return;
    }

    // Attach listener to port parser
    parsers[user].on('data', (data) => {
      console.log(`[${user.toUpperCase()} INCOMING DATA]: ${data}`);
      io.emit(`${user}Message`, data);
    });

    // Set the dongle to dual role for the user
    ports[user].write('AT+DUAL\r\n', (err) => {
      if (err) {
        console.error(`[ERROR]: Failed to set dual role for ${user}`);
        socket.emit('error', `[ERROR]: Failed to set dual role for ${user}`);
        return;
      }
      console.log(`[${user.toUpperCase()}]: Dual role set`);

      if (user === 'user2') {
        // Start advertising for User 2
        ports[user].write('AT+ADVSTART\r\n', (err) => {
          if (err) {
            console.error(`[ERROR]: Failed to start advertising for ${user}`);
            socket.emit(
              'error',
              `[ERROR]: Failed to start advertising for ${user}`
            );
            return;
          }
          console.log(`[${user.toUpperCase()}]: Advertising started`);
        });
      }

      // Emit roleSet event to the frontend
      socket.emit('roleSet', `Successfully assigned dongle to ${user}`);
    });
  });

  // Handle scanning for User 1
  socket.on('scan', () => {
    if (!ports.user1) {
      console.error('[ERROR]: Port for User 1 not initialized.');
      socket.emit('error', '[ERROR]: Port for User 1 not initialized.');
      return;
    }
    console.log('[SCAN INITIATED]: User 1');
    ports.user1.write('AT+GAPSCAN=3\r\n', (err) => {
      if (err) {
        console.error('[ERROR]: Failed to start scanning.');
        socket.emit('error', '[ERROR]: Failed to start scanning.');
        return;
      }
      console.log('[SCAN STARTED]');
    });
  });

  // Connect to device for User 1
  socket.on('connectDevice', (mac) => {
    if (!ports.user1) {
      console.error('[ERROR]: Port for User 1 not initialized.');
      socket.emit('error', '[ERROR]: Port for User 1 not initialized.');
      return;
    }
    console.log(`[USER 1]: Connecting to device: ${mac}`);
    ports.user1.write(`AT+GAPCONNECT=${mac}\r\n`, (err) => {
      if (err) {
        console.error('[ERROR]: Failed to connect to device.');
        socket.emit('error', '[ERROR]: Failed to connect to device.');
        return;
      }
      console.log(`[USER 1]: Connection command sent.`);
    });
  });

  // Handle message sending
  socket.on('sendMessage', ({ user, message }) => {
    if (!ports[user]) {
      console.error(`[ERROR]: Port for ${user} not initialized.`);
      socket.emit('error', `[ERROR]: Port for ${user} not initialized.`);
      return;
    }
    console.log(`[${user.toUpperCase()}]: Sending message: ${message}`);
    ports[user].write(`AT+SPSSEND=${message}\r\n`, (err) => {
      if (err) {
        console.error(`[ERROR]: Failed to send message for ${user}`);
        socket.emit('error', `[ERROR]: Failed to send message for ${user}`);
        return;
      }
      console.log(`[${user.toUpperCase()}]: Message sent.`);
    });
  });
});

app.use(express.static('public'));

server.listen(3000, () =>
  console.log('Server running on http://localhost:3000')
);
