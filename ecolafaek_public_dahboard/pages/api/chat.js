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

// Verify reCAPTCHA token - Following https://developers.google.com/recaptcha/docs/verify
async function verifyRecaptcha(token, remoteIp) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY not found in environment variables");
    return { success: false, error: "Server configuration error" };
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: remoteIp || "",
    });

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await response.json();

    // Check success, score, and action
    if (data.success && data.score >= 0.5 && data.action === "submit") {
      return { success: true, score: data.score };
    }

    console.warn("reCAPTCHA verification failed:", {
      success: data.success,
      score: data.score,
      action: data.action,
      "error-codes": data["error-codes"],
    });

    return {
      success: false,
      error: "Verification failed",
      score: data.score,
    };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return { success: false, error: "Verification error" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { messages, session_id, recaptcha_token } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({
        error: "Missing required field: messages",
      });
    }

    // Verify reCAPTCHA token
    if (!recaptcha_token) {
      return res.status(400).json({
        error: "Missing reCAPTCHA token",
      });
    }

    // Get client IP address
    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.connection.remoteAddress;

    const recaptchaResult = await verifyRecaptcha(recaptcha_token, clientIp);
    if (!recaptchaResult.success) {
      console.warn("reCAPTCHA verification failed:", recaptchaResult);
      return res.status(403).json({
        error: "reCAPTCHA verification failed. Please try again.",
        details: recaptchaResult.error,
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
