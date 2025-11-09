document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');

  // File upload elements
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const imagePreview = document.getElementById('image-preview');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const fileNameDisplay = document.getElementById('file-name');
  const removeImageBtn = document.getElementById('remove-image');

  const backendUrl = 'http://localhost:3000';
  let uploadedImage = null;

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

  // 2. File upload handlers
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Remove image handler
  removeImageBtn.addEventListener('click', () => {
    uploadedImage = null;
    imagePreviewContainer.classList.add('hidden');
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

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        fileNameDisplay.textContent = file.name;
        imagePreviewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, just show filename
      imagePreview.src = '';
      fileNameDisplay.textContent = file.name;
      imagePreviewContainer.classList.remove('hidden');
    }

    // Automatically analyze the uploaded report
    addMessage('📊 Blood report uploaded! Analyzing...', 'bot');
    await analyzeUploadedReport();
  }

  // Function to automatically analyze uploaded report
  async function analyzeUploadedReport() {
    if (!uploadedImage) return;

    // Show the uploaded image in chat
    const reader = new FileReader();
    reader.onload = (e) => {
      addImageMessage(e.target.result, 'user');
    };
    reader.readAsDataURL(uploadedImage);

    // Display typing indicator
    const typingIndicator = addTypingIndicator();
    sendButton.disabled = true;

    try {
      // Prepare request data
      const formData = new FormData();
      formData.append('message', 'Please analyze this blood report');
      formData.append('image', uploadedImage);

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
        addMessage(data.message || 'Sorry, something went wrong analyzing the report.', 'bot');
      }

      // Clear uploaded image after successful submission
      uploadedImage = null;
      imagePreviewContainer.classList.add('hidden');
      fileInput.value = '';

    } catch (error) {
      typingIndicator.remove();
      sendButton.disabled = false;
      addMessage('❌ Error analyzing the report. Please try again.', 'bot');
      console.error('Analysis error:', error);
    }
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
        imagePreviewContainer.classList.add('hidden');
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
