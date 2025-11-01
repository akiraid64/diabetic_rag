const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

const API_KEY = "AIzaSyCf95O5ssbRUdZV9vPq0uRxzNtCTcWGdjs";

async function testAPIKey() {
  console.log("🔑 Testing Google Gemini API Key...\n");

  try {
    // Test 1: Chat/Text Generation
    console.log("Test 1: Testing Chat/Text Generation API...");
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = "Say hello in one sentence.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Chat API Works!");
    console.log(`   Response: ${text}\n`);

    // Test 2: Embeddings Generation
    console.log("Test 2: Testing Embeddings API...");
    try {
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: API_KEY,
        modelName: "text-embedding-004",
      });

      const testText = "This is a test document for embedding generation.";
      const embeddingResult = await embeddings.embedQuery(testText);

      console.log("✅ Embeddings API Works!");
      console.log(`   Generated embedding vector of length: ${embeddingResult.length}`);
      console.log(`   First 5 values: [${embeddingResult.slice(0, 5).join(', ')}...]\n`);
    } catch (embeddingError) {
      console.log("⚠️  Embeddings API Failed - trying alternative model...");
      console.log(`   Error: ${embeddingError.message}\n`);

      // Try alternative embedding model
      try {
        const embeddings2 = new GoogleGenerativeAIEmbeddings({
          apiKey: API_KEY,
          modelName: "embedding-001",
        });
        const testText = "This is a test document for embedding generation.";
        const embeddingResult = await embeddings2.embedQuery(testText);

        console.log("✅ Embeddings API Works (embedding-001)!");
        console.log(`   Generated embedding vector of length: ${embeddingResult.length}`);
        console.log(`   First 5 values: [${embeddingResult.slice(0, 5).join(', ')}...]\n`);
      } catch (err2) {
        console.log("❌ Both embedding models failed!");
        console.log(`   Error: ${err2.message}`);
        console.log("\n⚠️  Note: Same API key works for both chat and embeddings.");
        console.log("   You may need to enable the Embeddings API in Google AI Studio.\n");
        throw err2;
      }
    }

    // Summary
    console.log("═══════════════════════════════════════");
    console.log("✅ API KEY IS VALID AND WORKING!");
    console.log("═══════════════════════════════════════");
    console.log("Both chat and embeddings APIs are functional.");
    console.log("You can proceed with FAISS implementation.\n");

  } catch (error) {
    console.log("❌ API KEY TEST FAILED!");
    console.log("═══════════════════════════════════════");
    console.error("Error:", error.message);

    if (error.message.includes("API key")) {
      console.log("\n⚠️  The API key appears to be invalid or expired.");
      console.log("   Please check your Google AI Studio dashboard.");
    } else if (error.message.includes("quota")) {
      console.log("\n⚠️  API quota exceeded. The key works but needs quota.");
    } else {
      console.log("\n⚠️  Unexpected error occurred.");
    }
  }
}

testAPIKey();
