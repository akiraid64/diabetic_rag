# Diabetes RAG Chatbot

A production-grade **Retrieval Augmented Generation (RAG)** chatbot built with **Google Gemini 2.5 Flash**, **FAISS vector store**, and **LangChain** for answering diabetes-related questions from an authoritative medical document.

---

## Table of Contents

- [Overview](#overview)
- [How RAG Works](#how-rag-works)
- [Architecture](#architecture)
- [Dataset](#dataset)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [API Endpoints](#api-endpoints)

---

## Overview

This project demonstrates a complete **Retrieval Augmented Generation (RAG)** system that combines semantic search with large language models to provide accurate, context-aware answers about diabetes. Unlike traditional chatbots that rely solely on pre-trained knowledge, our RAG system retrieves relevant information from a verified medical document before generating responses.

---

## How RAG Works

RAG (Retrieval Augmented Generation) is a technique that enhances LLM responses by retrieving relevant context from a knowledge base before generating answers.

### The RAG Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    INDEXING PHASE (One-time)                │
└─────────────────────────────────────────────────────────────┘

  PDF Document (Diabetes FAQ)
          ↓
  [1] Text Extraction (pdf-parse)
          ↓
  [2] Text Chunking (RecursiveCharacterTextSplitter)
      - Splits document into 1000-character chunks
      - Maintains semantic coherence
          ↓
  [3] Generate Embeddings (Google Gemini text-embedding-004)
      - Converts text chunks into 768-dim vectors
      - Captures semantic meaning
          ↓
  [4] Store in FAISS Vector Database
      - Persistent local storage in ./faiss_vector_store/
      - Enables fast similarity search


┌─────────────────────────────────────────────────────────────┐
│                    QUERY PHASE (Per request)                │
└─────────────────────────────────────────────────────────────┘

  User Question: "What are symptoms of diabetes?"
          ↓
  [5] Convert Question to Embedding Vector
      - Uses same embedding model (text-embedding-004)
          ↓
  [6] Semantic Similarity Search in FAISS
      - Finds top-K most relevant document chunks
      - Uses cosine similarity in vector space
          ↓
  [7] Retrieve Relevant Context
      - Returns matching text chunks from document
          ↓
  [8] Augmented Prompt Construction
      - Combines: System Instructions + Retrieved Context + User Question
          ↓
  [9] Generate Response (Gemini 2.5 Flash)
      - LLM generates answer grounded in retrieved context
      - Reduces hallucinations
          ↓
  Accurate, Context-Aware Response
```

### Why RAG?

| Traditional LLM | RAG System |
|----------------|------------|
| Limited to training data cutoff | Uses up-to-date documents |
| May hallucinate facts | Grounded in retrieved evidence |
| No source attribution | Answers based on specific documents |
| Cannot access private/domain data | Works with custom knowledge bases |

---

## Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (Client)                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  HTML/CSS/JavaScript + Marked.js (Markdown Parser)     │  │
│  │  - User Interface                                      │  │
│  │  - Chat Input/Output                                   │  │
│  │  - Markdown Rendering                                  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ↕ HTTP REST API
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                         │  │
│  │  • POST /load-pdf - Initialize vector store            │  │
│  │  • POST /chat - Query processing                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ↓                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  LangChain Orchestration Layer                         │  │
│  │  • Document Loading & Splitting                        │  │
│  │  • RetrievalQAChain                                    │  │
│  │  • Prompt Engineering                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ↓                                  │
│  ┌─────────────────────┐         ┌──────────────────────┐   │
│  │  FAISS Vector Store │         │  Google Gemini API   │   │
│  │  • Local Storage    │         │  • 2.5 Flash (Chat)  │   │
│  │  • Semantic Search  │         │  • text-embedding-004│   │
│  │  • Persistence      │         │  • API Key Auth      │   │
│  └─────────────────────┘         └──────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Frontend Layer
- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Libraries**: Marked.js for markdown rendering
- **Responsibilities**:
  - User interface for chat interactions
  - Markdown parsing and display
  - Real-time message rendering
  - API communication with backend

#### 2. Backend Layer
- **Technology**: Node.js, Express.js
- **Framework**: LangChain (v0.0.143)
- **Responsibilities**:
  - RESTful API endpoints
  - Document processing pipeline
  - Vector store management
  - Query orchestration

#### 3. Vector Database
- **Technology**: FAISS (Facebook AI Similarity Search)
- **Storage**: Local filesystem (`./backend/faiss_vector_store/`)
- **Capabilities**:
  - Fast similarity search (< 100ms for 1000s of vectors)
  - Persistent storage between sessions
  - Efficient memory usage

#### 4. LLM & Embeddings
- **Chat Model**: Google Gemini 2.5 Flash
- **Embedding Model**: text-embedding-004 (768 dimensions)
- **Provider**: Google AI Studio

---

## Dataset

### Source
**Official Government Document**
[Bhabha Atomic Research Centre (BARC) - Department of Atomic Energy, Government of India](https://barc.gov.in/bmg/md/web/html/faq/diabetes.pdf)

### Document Details
- **Title**: Frequently Asked Questions on Diabetes
- **Publisher**: BARC Hospital Medical Division
- **Authority**: Government of India - Department of Atomic Energy
- **Legitimacy**: Official government healthcare publication
- **Content**: Comprehensive diabetes information including:
  - Types of diabetes
  - Symptoms and diagnosis
  - Treatment and management
  - Lifestyle recommendations
  - Complications and prevention
  - Dietary guidelines
  - Exercise recommendations

### Why This Dataset?
- **Authoritative**: Published by a government medical institution
- **Comprehensive**: Covers all aspects of diabetes care
- **Verified**: Medically reviewed content
- **Public Domain**: Accessible for educational purposes
- **Structured**: FAQ format ideal for RAG systems

---

## Tech Stack

### Backend
- **Runtime**: Node.js v22+
- **Framework**: Express.js v4.18.2
- **AI/ML**:
  - LangChain v0.0.143
  - @langchain/google-genai v0.0.10
  - @langchain/community v0.0.25
  - faiss-node v0.5.1
- **Document Processing**: pdf-parse v1.1.1
- **Utilities**: cors, body-parser

### Frontend
- **Core**: HTML5, CSS3, ES6+ JavaScript
- **Libraries**: Marked.js (markdown parser)
- **Styling**: Custom CSS with responsive design

### AI Services
- **LLM**: Google Gemini 2.5 Flash
- **Embeddings**: Google text-embedding-004
- **Provider**: Google AI Studio

---

## Project Structure

```
RAg/
├── backend/
│   ├── node_modules/           # Dependencies
│   ├── faiss_vector_store/     # FAISS database (created on first run)
│   ├── server.js               # Main backend server
│   ├── test-api-key.js         # API key validation script
│   ├── package.json            # Backend dependencies
│   └── package-lock.json
│
├── frontend/
│   ├── index.html              # Main HTML file
│   ├── script.js               # Frontend JavaScript
│   └── style.css               # Styling
│
├── diabetes (1).pdf            # Source document (BARC diabetes FAQ)
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

---

## Installation

### Prerequisites
- Node.js v18+ and npm
- Google AI Studio API key ([Get one here](https://makersuite.google.com/app/apikey))

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/akiraid64/diabetic_rag.git
   cd diabetic_rag
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables**

   Create a `.env` file in the `backend/` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

   Edit the `.env` file and add your Google API key:
   ```env
   GOOGLE_API_KEY=your_actual_google_api_key_here
   PORT=3000
   ```

   **Important**: Never commit the `.env` file to Git! It's already protected by `.gitignore`.

4. **Test API key (Optional)**
   ```bash
   node test-api-key.js
   ```

---

## Usage

### Starting the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   # or
   node server.js
   ```

   Expected output:
   ```
   Backend server listening at http://localhost:3000
   ```

2. **Open the frontend**
   - Open `frontend/index.html` in a web browser
   - Or use a local server:
     ```bash
     cd frontend
     npx http-server -p 8080
     ```
   - Navigate to `http://localhost:8080`

3. **First-time setup**
   - The app automatically loads the PDF on startup
   - Wait for "Document loaded" message
   - FAISS vector store is created in `backend/faiss_vector_store/`
   - Subsequent loads use the cached vector store

4. **Start chatting!**
   - Ask diabetes-related questions
   - Try: "What are the symptoms of diabetes?"
   - Try: "What foods should diabetics avoid?"
   - Try: "How is diabetes diagnosed?"

---

## Features

### Core Capabilities
- **Semantic Search**: Uses vector embeddings for intelligent context retrieval
- **Persistent Storage**: FAISS database saves to disk (no re-indexing needed)
- **Conversational**: Handles greetings and casual conversation naturally
- **Domain-Focused**: Stays on-topic with diabetes information
- **Medical Disclaimers**: Includes appropriate "consult your doctor" guidance
- **Markdown Formatting**: Rich text responses with bold, lists, etc.
- **Fast Responses**: < 3 seconds typical response time

### Smart Behavior
- ✅ Greetings: "Hi" → Friendly welcome
- ✅ Capabilities: "What do you do?" → Explains its purpose
- ✅ Context-aware: Answers only from the document
- ✅ Medical safety: Advises consulting doctors for symptoms
- ✅ Off-topic handling: Politely redirects to diabetes topics

---

## API Endpoints

### POST `/load-pdf`
**Description**: Loads the diabetes PDF and creates/loads FAISS vector store

**Request**:
```http
POST http://localhost:3000/load-pdf
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "message": "PDF loaded and vector store created on disk."
}
```

---

### POST `/chat`
**Description**: Sends a user query and receives a RAG-powered response

**Request**:
```http
POST http://localhost:3000/chat
Content-Type: application/json

{
  "message": "What are the symptoms of diabetes?"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Common symptoms of diabetes include:\n\n- Frequent urination\n- Excessive thirst\n- Unexplained weight loss\n- Increased hunger\n- Fatigue\n\nPlease consult your doctor for personalized advice."
}
```

---

## Demo Queries

Try these example questions:

1. **Diagnosis**: "How is diabetes diagnosed?"
2. **Symptoms**: "What are early signs of diabetes?"
3. **Diet**: "What foods should diabetics eat?"
4. **Exercise**: "How much exercise do diabetics need?"
5. **Complications**: "What are long-term complications of diabetes?"
6. **Management**: "How can I manage my blood sugar?"

---

## Future Enhancements

- [ ] Multi-document support
- [ ] Chat history with context memory
- [ ] Source attribution (show which PDF section was used)
- [ ] Deploy to cloud (Vercel/Railway)
- [ ] Add authentication
- [ ] Support for image-based diabetes resources
- [ ] Mobile-responsive PWA
- [ ] Multi-language support

---

## License

This project is for educational purposes. The diabetes dataset is sourced from BARC (Government of India) and is used under fair use for educational demonstrations.

---

## Contributors

Developed as a demonstration of production-grade RAG architecture for medical information retrieval.

---

## Acknowledgments

- **BARC Medical Division** for the authoritative diabetes FAQ document
- **Google AI** for Gemini API access
- **LangChain** for the RAG framework
- **Facebook AI Research** for FAISS vector search

---

## Contact

For questions or improvements, please open an issue or submit a pull request.

---

**Built with ❤️ using RAG, LangChain, and Google Gemini**
