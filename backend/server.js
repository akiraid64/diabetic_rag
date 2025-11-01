
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pdf = require('pdf-parse');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { RetrievalQAChain } = require('langchain/chains');
const { PromptTemplate } = require('langchain/prompts');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

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

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
