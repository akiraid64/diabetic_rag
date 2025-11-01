
document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  const backendUrl = 'http://localhost:3000';

  // 1. Load the PDF on page load
  fetch(`${backendUrl}/load-pdf`, { method: 'POST' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        loadingContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
      } else {
        console.error('Error loading PDF:', data.message);
        loadingContainer.innerHTML = '<p>Error loading PDF. Please check the backend console.</p>';
      }
    })
    .catch(error => {
      console.error('Error communicating with backend:', error);
      loadingContainer.innerHTML = '<p>Could not connect to the backend. Is it running?</p>';
    });

  // 2. Handle chat form submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Display user message
    addMessage(message, 'user');
    chatInput.value = '';

    // Display thinking message
    const thinkingMessage = addMessage('Thinking...', 'bot');

    try {
      // Send message to backend
      const response = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      // Remove thinking message and display bot response
      thinkingMessage.remove();
      if (data.success) {
        addMessage(data.message, 'bot');
      } else {
        addMessage('Sorry, something went wrong.', 'bot');
      }

    } catch (error) {
      thinkingMessage.remove();
      addMessage('Error connecting to the backend.', 'bot');
      console.error('Chat error:', error);
    }
  });

  // Function to add a message to the chat window
  function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    // For bot messages, parse markdown; for user messages, use plain text
    if (sender === 'bot' && typeof marked !== 'undefined') {
      messageElement.innerHTML = marked.parse(text);
    } else {
      messageElement.textContent = text;
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
  }
});
