const socket = io();

const connectBtn = document.getElementById('connect');
const macAddressInput = document.getElementById('macAddress');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('send');
const chatLog = document.getElementById('chatLog');

// Ensure status display is appended properly
const container = document.querySelector('.container'); // Ensure container exists
const statusDisplay = document.createElement('div');
statusDisplay.className = 'alert alert-info'; // Bootstrap class for styling
statusDisplay.textContent = 'Waiting for action...';
container.insertBefore(statusDisplay, container.firstChild); // Append at the top of the container

// Set dual role immediately when the page loads
console.log('[USER 1]: Setting dual role');
socket.emit('setDualRole', 'user1');

// Connect to Device
connectBtn.addEventListener('click', () => {
  const mac = macAddressInput.value.trim();
  if (mac) {
    console.log(`[USER 1]: Connecting to device: ${mac}`);
    statusDisplay.textContent = 'Connecting...'; // Show connecting status
    statusDisplay.className = 'alert alert-warning'; // Update styling
    socket.emit('connectDevice', mac);
  } else {
    alert('Please enter a valid MAC address.');
  }
});

// Send Message
sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    console.log(`[USER 1]: Sending message: ${message}`);
    socket.emit('sendMessage', { user: 'user1', message });
    addToChatLog('You', message);
    messageInput.value = '';
  } else {
    alert('Please enter a message.');
  }
});

// Display Messages
socket.on('user1Message', (message) => {
  console.log('[USER 1]: Received message:', message);
  processMessage('User 2', message);

  // Check for "CONNECTED." response
  if (message.includes('CONNECTED.')) {
    statusDisplay.textContent = 'Connected! You can now send messages.';
    statusDisplay.className = 'alert alert-success'; // Update styling
  }
});

// Helper Functions
function addToChatLog(sender, message) {
  const log = document.createElement('div');
  log.textContent = `${sender}: ${message}`;
  chatLog.appendChild(log);
}

function processMessage(sender, message) {
  // Look for "[Received]: <message>" in the log
  if (message.includes('[Received]:')) {
    const receivedMatch = message.match(/\[Received\]:\s(.+)/);
    if (receivedMatch && receivedMatch[1]) {
      addToChatLog(sender, receivedMatch[1].trim());
    }
  }
}
