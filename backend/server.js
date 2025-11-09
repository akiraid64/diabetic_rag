
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RetrievalQAChain } = require('langchain/chains');
const { PromptTemplate } = require('langchain/prompts');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.'));
    }
  }
});

app.use(cors());
app.use(bodyParser.json());

let vectorStore;

// Load API key from environment variables
const googleApiKey = process.env.GOOGLE_API_KEY;

if (!googleApiKey) {
  console.error('ERROR: GOOGLE_API_KEY is not set in environment variables!');
  console.error('Please create a .env file in the backend directory with:');
  console.error('GOOGLE_API_KEY=your_api_key_here');
  process.exit(1);
}

// FAISS storage directory
const FAISS_STORE_PATH = path.join(__dirname, 'faiss_vector_store');

// Endpoint to load the PDF and create the vector store
app.post('/load-pdf', async (req, res) => {
  try {
    console.log('Loading PDF...');
    const pdfPath = path.join(__dirname, '..', 'diabetes (1).pdf'); // Path to your PDF
    const dataBuffer = fs.readFileSync(pdfPath);

    const data = await pdf(dataBuffer);
    const text = data.text;

    // 1. Split the text into chunks
    const textSplitter = new (require('langchain/text_splitter').RecursiveCharacterTextSplitter)({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments([text]);

    // 2. Create embeddings with Google Gemini
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: googleApiKey,
      modelName: "text-embedding-004",
    });

    // 3. Check if FAISS store already exists
    if (fs.existsSync(FAISS_STORE_PATH)) {
      console.log('Loading existing FAISS vector store...');
      vectorStore = await FaissStore.load(FAISS_STORE_PATH, embeddings);
      console.log('Existing FAISS vector store loaded successfully.');
      res.json({ success: true, message: 'Loaded existing vector store from disk.' });
    } else {
      console.log('Creating new FAISS vector store...');
      // Create the vector store
      vectorStore = await FaissStore.fromDocuments(docs, embeddings);

      // Save to disk
      await vectorStore.save(FAISS_STORE_PATH);
      console.log(`PDF loaded and FAISS vector store created and saved to ${FAISS_STORE_PATH}`);
      res.json({ success: true, message: 'PDF loaded and vector store created on disk.' });
    }

  } catch (error) {
    console.error('Error loading PDF:', error);
    res.status(500).json({ success: false, message: 'Error loading PDF.' });
  }
});

// Endpoint to handle chat messages
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!vectorStore) {
    return res.status(400).json({ success: false, message: 'PDF not loaded yet.' });
  }

  try {
    // 4. Create the chat model with Google Gemini
    const model = new ChatGoogleGenerativeAI({
      apiKey: googleApiKey,
      modelName: "gemini-2.5-flash",
    });

    // 5. Create a custom prompt template
    const promptTemplate = `You are a helpful diabetes information assistant with access to a diabetes document.

Guidelines:
- For greetings (hi, hello): Respond warmly and ask how you can help with diabetes questions
- For "what do you do": Briefly explain you're a diabetes chatbot that answers questions from the document
- For diabetes questions: Provide clear, concise answers using the context below
- For symptoms or medical concerns: Answer based on the context if available, then add one line: "Please consult your doctor for personalized advice"
- Keep responses concise (2-4 sentences max unless detailed explanation needed)
- Use markdown formatting for better readability (**, -, bullet points, etc.)
- For off-topic questions: Politely say you only discuss diabetes-related topics

Context:
{context}

Question: {question}

Answer:`;

    const prompt = PromptTemplate.fromTemplate(promptTemplate);

    // 6. Create the retrieval chain with the custom prompt
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), { prompt });

    // 7. Query the chain
    const response = await chain.call({ query: message });

    res.json({ success: true, message: response.text });

  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ success: false, message: 'Error processing chat message.' });
  }
});

// Endpoint to analyze blood reports with vision + RAG
app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const message = req.body.message || '';
    const imageFile = req.file;

    // If there's an image, use vision analysis
    if (imageFile) {
      console.log('Analyzing blood report image...');

      // Convert image buffer to base64
      const base64Image = imageFile.buffer.toString('base64');
      const mimeType = imageFile.mimetype;

      // Initialize Gemini with vision capabilities
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // First: Check if this is a blood glucose report
      const validationPrompt = `Analyze this image and determine if it contains a blood test report with glucose/sugar levels.

Respond with ONLY "YES" if:
- This is a medical/lab blood test report
- Contains glucose, blood sugar, or HbA1c values

Respond with ONLY "NO" if:
- Not a medical report
- Any other type of image
- No glucose-related values present

Response (YES or NO):`;

      const validationParts = [
        { text: validationPrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        }
      ];

      const validationResult = await visionModel.generateContent(validationParts);
      const validationResponse = validationResult.response.text().trim().toUpperCase();

      // If not a blood glucose report, reject it
      if (!validationResponse.includes('YES')) {
        return res.json({
          success: true,
          message: `I can only analyze blood glucose/sugar reports. This image doesn't appear to be a blood test report with glucose levels.

If you have questions about diabetes management, symptoms, or general diabetes information, feel free to ask!`
        });
      }

      // Second: Analyze the blood report with RAG context
      console.log('Valid blood report detected. Performing detailed analysis...');

      // Get relevant context from the diabetes document
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: googleApiKey,
        modelName: "text-embedding-004",
      });

      const queryEmbedding = await embeddings.embedQuery(
        "blood glucose levels diabetes diagnosis normal range fasting random HbA1c symptoms complications"
      );

      const relevantDocs = await vectorStore.similaritySearch(
        "blood glucose levels diabetes diagnosis normal range fasting random HbA1c",
        4
      );

      const contextText = relevantDocs.map(doc => doc.pageContent).join('\n\n');

      // Detailed analysis prompt
      const analysisPrompt = `You are a medical AI assistant analyzing a blood test report for diabetes indicators.

**Context from diabetes medical document:**
${contextText}

**Your task:**
1. Extract all visible test parameters and their values from the image
2. Identify blood glucose, blood sugar, HbA1c, or related diabetes markers
3. Compare values against normal ranges (if visible or use standard medical ranges)
4. Provide assessment based on the medical document context above
5. Give actionable recommendations from the document

**Response format:**

## 📊 Blood Report Analysis

**Test Results:**
- [Parameter name]: [Value] [Unit] (Normal range: [range])
- [Continue for all visible parameters]

**Assessment:**
[Based on the values and the medical document, explain what the results indicate about diabetes risk/status]

**Key Findings:**
- [Finding 1]
- [Finding 2]
- [Continue as needed]

**Recommendations:**
[Provide recommendations from the diabetes document based on the results]

**⚠️ Important Disclaimer:**
This is an AI-generated analysis for informational purposes only. Please consult your doctor or healthcare provider for proper medical interpretation and treatment decisions.

${message ? '\n**Your question:** ' + message + '\n\n[Answer the question based on the report and document]' : ''}`;

      const analysisParts = [
        { text: analysisPrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        }
      ];

      const analysisResult = await visionModel.generateContent(analysisParts);
      const analysis = analysisResult.response.text();

      return res.json({
        success: true,
        message: analysis
      });

    } else if (message) {
      // No image, just text chat - use RAG
      if (!vectorStore) {
        return res.status(400).json({ success: false, message: 'PDF not loaded yet.' });
      }

      const model = new ChatGoogleGenerativeAI({
        apiKey: googleApiKey,
        modelName: "gemini-2.5-flash",
      });

      const promptTemplate = `You are a helpful diabetes health assistant with access to a comprehensive diabetes medical document.

Guidelines:
- For greetings: Respond warmly and explain you can help with diabetes questions or analyze blood glucose reports
- For diabetes questions: Provide clear answers using the context below
- For symptoms/medical concerns: Answer based on context, then add: "Please consult your doctor for personalized advice"
- Keep responses concise and well-formatted with markdown
- For off-topic questions: Politely redirect to diabetes-related topics

Context:
{context}

Question: {question}

Answer:`;

      const prompt = PromptTemplate.fromTemplate(promptTemplate);
      const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), { prompt });
      const response = await chain.call({ query: message });

      return res.json({ success: true, message: response.text });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a message or upload a blood report.'
      });
    }

  } catch (error) {
    console.error('Error in /analyze endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again.'
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log(`✅ Diabetes Health Assistant ready!`);
});
