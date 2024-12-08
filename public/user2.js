const socket = io();

const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('send');
const chatLog = document.getElementById('chatLog');

// Set dual role and start advertising immediately when the page loads
console.log('[USER 2]: Setting dual role and starting advertising');
socket.emit('setDualRole', 'user2');

// Request MAC address after setting dual role and starting advertising
setTimeout(() => {
  console.log('[USER 2]: Requesting MAC address');
  socket.emit('getmac', { user: 'user2', command: 'AT+GETMAC' });
}, 1000); // Slight delay to ensure dual role is set

// Handle incoming MAC address response
socket.on('user2Message', (message) => {
  console.log('[USER 2]: Received message:', message);
  if (message.includes('OWN MAC ADDRESS:')) {
    const macMatch = message.match(/OWN MAC ADDRESS:(.+)/);
    if (macMatch && macMatch[1]) {
      const formattedMac = `[0]${macMatch[1].trim()}`;
      displayMacAddress(formattedMac);
    }
  } else {
    processMessage('User 1', message);
  }
});

// Send Message
sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    console.log(`[USER 2]: Sending message: ${message}`);
    socket.emit('sendMessage', { user: 'user2', message });
    addToChatLog('You', message);
    messageInput.value = '';
  } else {
    alert('Please enter a message.');
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

function displayMacAddress(mac) {
  const macDisplay = document.createElement('div');
  macDisplay.className = 'alert alert-secondary'; // Bootstrap styling
  macDisplay.textContent = `Device MAC Address: ${mac}`;
  document.querySelector('.container').prepend(macDisplay); // Display at the top of the page
}
