document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');

  // File upload elements
  const fileInput = document.getElementById('file-input');
  const attachButton = document.getElementById('attach-button');
  const previewMini = document.getElementById('image-preview-mini');
  const previewThumb = document.getElementById('preview-thumb');
  const removePreviewBtn = document.getElementById('remove-preview');

  const backendUrl = 'http://localhost:3000';
  let uploadedImage = null;

  // 1. Load the PDF on page load
  fetch(`${backendUrl}/load-pdf`, { method: 'POST' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        loadingContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');

        // Show welcome message with document info
        addMessage(`✅ **Vector Store Ready!**\n\n📚 Diabetes medical document loaded and indexed in FAISS\n\n💡 You can now:\n- Upload blood glucose reports for AI analysis\n- Ask questions about diabetes management\n- Get insights from the medical knowledge base\n\nHow can I help you today?`, 'bot');
      } else {
        console.error('Error loading PDF:', data.message);
        loadingContainer.innerHTML = '<p>Error loading PDF. Please check the backend console.</p>';
      }
    })
    .catch(error => {
      console.error('Error communicating with backend:', error);
      loadingContainer.innerHTML = '<p>Could not connect to the backend. Is it running?</p>';
    });

  // 2. File upload handlers
  attachButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', handleFileSelect);

  // Remove image handler
  removePreviewBtn.addEventListener('click', () => {
    uploadedImage = null;
    previewMini.classList.add('hidden');
    fileInput.value = '';
  });

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  }

  async function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      addMessage('❌ Please upload a valid image file (JPG, PNG, GIF) or PDF.', 'bot');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      addMessage('❌ File size too large. Maximum size is 10MB.', 'bot');
      return;
    }

    uploadedImage = file;

    // Show mini preview thumbnail
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewThumb.src = e.target.result;
        previewMini.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, show a generic icon or text
      previewThumb.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
      previewMini.classList.remove('hidden');
    }

    chatInput.focus();
  }


  // 3. Handle chat form submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();

    // Check if there's either a message or an uploaded image
    if (!message && !uploadedImage) return;

    // Display user message if any
    if (message) {
      addMessage(message, 'user');
    }

    // If there's an uploaded image, show it in chat
    if (uploadedImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        addImageMessage(e.target.result, 'user');
      };
      reader.readAsDataURL(uploadedImage);
    }

    chatInput.value = '';

    // Display typing indicator
    const typingIndicator = addTypingIndicator();
    sendButton.disabled = true;

    try {
      // Prepare request data
      const formData = new FormData();
      if (message) formData.append('message', message);
      if (uploadedImage) formData.append('image', uploadedImage);

      // Send to backend
      const response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      // Remove typing indicator
      typingIndicator.remove();
      sendButton.disabled = false;

      if (data.success) {
        addMessage(data.message, 'bot');
      } else {
        addMessage(data.message || 'Sorry, something went wrong.', 'bot');
      }

      // Clear uploaded image after successful submission
      if (uploadedImage) {
        uploadedImage = null;
        previewMini.classList.add('hidden');
        fileInput.value = '';
      }

    } catch (error) {
      typingIndicator.remove();
      sendButton.disabled = false;
      addMessage('Error connecting to the backend. Please try again.', 'bot');
      console.error('Chat error:', error);
    }
  });

  // Function to add a text message to the chat window
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

  // Function to add an image message
  function addImageMessage(imageSrc, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`, 'image-message');

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Uploaded report';

    const caption = document.createElement('p');
    caption.textContent = 'Blood Report';
    caption.style.margin = '0';
    caption.style.fontSize = '13px';
    caption.style.opacity = '0.8';

    messageElement.appendChild(caption);
    messageElement.appendChild(img);

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
  }

  // Function to add typing indicator
  function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    indicator.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
  }
});
