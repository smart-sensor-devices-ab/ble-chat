const socket = io();

const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('send');
const chatLog = document.getElementById('chatLog');

// Set dual role and start advertising immediately when the page loads
console.log('[USER 2]: Setting dual role and starting advertising');
socket.emit('setDualRole', 'user2');

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

// Display Messages
socket.on('user2Message', (message) => {
  console.log('[USER 2]: Received message:', message);
  processMessage('User 1', message);
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
