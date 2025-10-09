const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL;

// Chat function using FastAPI AgentCore backend
async function chat(messages, sessionId = null) {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.API_SECRET_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `FastAPI error: ${response.status}`);
    }

    const data = await response.json();
    return {
      reply: data.reply,
      sessionId: data.session_id,
    };
  } catch (error) {
    console.error("FastAPI Error:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { messages, session_id } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({
        error: "Missing required field: messages",
      });
    }

    const result = await chat(messages, session_id);

    res.status(200).json({
      reply: result.reply,
      session_id: result.sessionId,
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
