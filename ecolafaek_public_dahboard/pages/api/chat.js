import fs from "fs";
import path from "path";

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

// Function to read FAQ data
const getFAQData = () => {
  try {
    const faqPath = path.join(process.cwd(), "public", "data_chat", "data.txt");
    const faqContent = fs.readFileSync(faqPath, "utf8");
    return faqContent;
  } catch (error) {
    console.error("Error reading FAQ data:", error);
    return "Error loading FAQ data";
  }
};

// Chat function using Moonshot API
async function chat(messages, userPrompt) {
  try {
    // Get FAQ data to provide context
    const faqData = getFAQData();

    // Create enhanced system message with FAQ context
    const enhancedMessages = [
      {
        role: "system",
        content: `You are EcoLafaek Helper, an AI assistant for the EcoLafaek waste monitoring system in Timor-Leste. You help users understand how to use the app, provide information about waste management, and answer questions about EcoLafaek features. Be helpful, concise, and friendly.

Here is detailed information about EcoLafaek to help you answer questions:

${faqData}

Use this information to provide accurate and helpful responses about EcoLafaek. If someone asks about features, how it works, partnerships, or anything related to the system, use the information provided above. Keep responses conversational and helpful.`,
      },
      ...messages.slice(1), // Remove the original system message and use enhanced one
    ];

    const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: "kimi-k2-turbo-preview",
        messages: enhancedMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Moonshot API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Moonshot API Error:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { messages, prompt } = req.body;

    if (!MOONSHOT_API_KEY) {
      return res.status(500).json({
        error: "Moonshot API key not configured",
      });
    }

    if (!messages || !prompt) {
      return res.status(400).json({
        error: "Missing required fields: messages and prompt",
      });
    }

    const reply = await chat(messages, prompt);

    res.status(200).json({
      reply: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({
      error: "Failed to process chat request",
      details: error.message,
    });
  }
}
