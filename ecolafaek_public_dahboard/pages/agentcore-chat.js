import { useState, useRef, useEffect } from "react";
import {
  Send,
  Trash2,
  Download,
  Sparkles,
  TrendingUp,
  MapPin,
  BarChart3,
  Clock,
  Database,
  Zap,
  Home,
  Bot,
  Shield,
} from "lucide-react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import Script from "next/script";
import { jsPDF } from "jspdf";

export default function AgentCoreChat() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`web_${Date.now()}`);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [tokenUsed, setTokenUsed] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if user is already verified (within 2 minutes - reCAPTCHA token lifetime)
  useEffect(() => {
    const verificationData = localStorage.getItem("recaptcha_verification");
    if (verificationData) {
      try {
        const { token, timestamp, used } = JSON.parse(verificationData);
        const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds (reCAPTCHA token lifetime)
        const now = Date.now();

        // Check if verification is still valid (within 2 minutes and not used)
        if (now - timestamp < twoMinutes && !used) {
          setRecaptchaToken(token);
          setIsVerified(true);
          setTokenUsed(false);
        } else {
          // Expired or already used, remove old verification
          localStorage.removeItem("recaptcha_verification");
        }
      } catch (error) {
        localStorage.removeItem("recaptcha_verification");
      }
    }
  }, []);

  // Set up reCAPTCHA callback function
  useEffect(() => {
    window.onRecaptchaSuccess = (token) => {
      setRecaptchaToken(token);
      setIsVerified(true);

      // Store verification in localStorage with timestamp
      const verificationData = {
        token: token,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        "recaptcha_verification",
        JSON.stringify(verificationData)
      );
    };

    return () => {
      delete window.onRecaptchaSuccess;
    };
  }, []);

  // Sample queries for quick access
  const sampleQueries = [
    {
      icon: TrendingUp,
      text: "Show waste report trends over time",
      gradient: "from-blue-500 via-blue-600 to-indigo-600",
      hoverGradient:
        "hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700",
    },
    {
      icon: MapPin,
      text: "Create an interactive map of hotspots",
      gradient: "from-purple-500 via-purple-600 to-pink-600",
      hoverGradient:
        "hover:from-purple-600 hover:via-purple-700 hover:to-pink-700",
    },
    {
      icon: BarChart3,
      text: "Generate charts for waste categories",
      gradient: "from-green-500 via-green-600 to-emerald-600",
      hoverGradient:
        "hover:from-green-600 hover:via-green-700 hover:to-emerald-700",
    },
    {
      icon: Database,
      text: "How many reports in the last month?",
      gradient: "from-orange-500 via-orange-600 to-red-600",
      hoverGradient:
        "hover:from-orange-600 hover:via-orange-700 hover:to-red-700",
    },
    {
      icon: Clock,
      text: "Show top contributors this week",
      gradient: "from-cyan-500 via-cyan-600 to-blue-600",
      hoverGradient: "hover:from-cyan-600 hover:via-cyan-700 hover:to-blue-700",
    },
    {
      icon: Zap,
      text: "What are the most urgent issues?",
      gradient: "from-yellow-500 via-amber-600 to-orange-600",
      hoverGradient:
        "hover:from-yellow-600 hover:via-amber-700 hover:to-orange-700",
    },
  ];

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Only send reCAPTCHA token on first message
      const requestBody = {
        messages: [...messages, userMessage],
        session_id: sessionId,
      };

      // Only include token if it hasn't been used yet
      if (!tokenUsed && recaptchaToken) {
        requestBody.recaptcha_token = recaptchaToken;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Mark token as used after first successful request
      if (!tokenUsed && recaptchaToken) {
        setTokenUsed(true);

        // Update localStorage with used flag
        const verificationData = {
          token: recaptchaToken,
          timestamp: Date.now(),
          used: true
        };
        localStorage.setItem('recaptcha_verification', JSON.stringify(verificationData));
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "No response received",
        },
      ]);
    } catch (error) {
      let errorMessage =
        "❌ Error: Could not connect to AgentCore. Please try again.";
      let shouldRefresh = false;

      if (error.message === "reCAPTCHA not loaded") {
        errorMessage =
          "❌ Security verification not loaded. Please refresh the page.";
        shouldRefresh = true;
      } else if (error.message.includes("reCAPTCHA verification failed")) {
        errorMessage =
          "🔒 Security verification failed. Your session may have expired. Please refresh the page to continue.";
        shouldRefresh = true;
        // Clear expired token
        localStorage.removeItem("recaptcha_verification");
        setIsVerified(false);
        setRecaptchaToken(null);
        setTokenUsed(false);
      } else if (error.message.includes("Missing reCAPTCHA token")) {
        errorMessage =
          "❌ Security verification missing. Please refresh the page.";
        shouldRefresh = true;
      } else if (error.message.includes("403")) {
        errorMessage =
          "🔒 Your security verification has expired. Please refresh the page to continue chatting.";
        shouldRefresh = true;
        // Clear expired token
        localStorage.removeItem("recaptcha_verification");
        setIsVerified(false);
        setRecaptchaToken(null);
        setTokenUsed(false);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage + (shouldRefresh ? "\n\n**Click the refresh button or press F5 to reload the page.**" : ""),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const exportChat = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Export Chat to PDF?\n\n` +
      `This will download your conversation with ${messages.length} messages.\n` +
      `${messages.filter(m => m.content.includes('![')).length > 0 ? 'Charts and images will be included.\n' : ''}` +
      `\nDo you want to continue?`
    );

    if (!confirmed) {
      return; // User clicked "No" or "Cancel"
    }

    // Show loading state
    const exportButton = document.querySelector('[aria-label="Export chat"]');
    if (exportButton) {
      exportButton.disabled = true;
      exportButton.textContent = 'Exporting...';
    }

    try {
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = 20;

    // Add header with logo and title
    doc.setFillColor(16, 185, 129); // Emerald color
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("EcoLafaek AI Assistant", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Chat Export", pageWidth / 2, 30, { align: "center" });

    yPosition = 50;

    // Add metadata
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    const exportDate = new Date().toLocaleString();
    doc.text(`Exported: ${exportDate}`, margin, yPosition);
    doc.text(`Session: ${sessionId}`, margin, yPosition + 5);

    yPosition += 20;

    // Helper function to load image via proxy (to avoid CORS issues)
    const loadImage = async (url) => {
      return new Promise(async (resolve, reject) => {
        try {
          // Use our proxy API to fetch the image
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status}`);
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
          };
          img.src = objectUrl;
        } catch (error) {
          reject(error);
        }
      });
    };

    // Add messages
    for (let index = 0; index < messages.length; index++) {
      const msg = messages[index];

      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Message header (User/Assistant)
      if (msg.role === "user") {
        doc.setFillColor(239, 246, 255); // Light blue
        doc.setTextColor(37, 99, 235); // Blue
      } else {
        doc.setFillColor(236, 253, 245); // Light green
        doc.setTextColor(16, 185, 129); // Emerald
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const roleText = msg.role === "user" ? "You" : "AI Assistant";
      doc.text(roleText, margin, yPosition);

      yPosition += 7;

      // Process content: extract images and text
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let content = msg.content;
      const images = [];
      let match;

      while ((match = imageRegex.exec(msg.content)) !== null) {
        images.push({
          alt: match[1],
          url: match[2],
          fullMatch: match[0],
        });
      }

      // Remove image markdown from content
      content = content.replace(imageRegex, "[Image: $1]");

      // Format markdown text
      const formattedContent = content
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
        .replace(/`([^`]+)`/g, "$1") // Code
        .replace(/^#{1,6}\s+(.+)$/gm, "$1") // Headers
        .replace(/\n{3,}/g, "\n\n"); // Reduce multiple newlines

      // Split into lines and process bullets
      const contentLines = formattedContent.split("\n");
      const processedLines = [];

      contentLines.forEach((line) => {
        if (line.trim().startsWith("- ")) {
          processedLines.push("  • " + line.substring(2));
        } else if (/^\d+\.\s/.test(line.trim())) {
          processedLines.push("  " + line.trim());
        } else {
          processedLines.push(line);
        }
      });

      const finalContent = processedLines.join("\n");

      // Add text content
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(finalContent, maxWidth - 10);
      const boxHeight = lines.length * 5 + 10;

      // Add background box for text
      doc.setFillColor(msg.role === "user" ? 239 : 236, msg.role === "user" ? 246 : 253, msg.role === "user" ? 255 : 245);
      doc.roundedRect(margin, yPosition - 3, maxWidth, boxHeight, 3, 3, "F");

      doc.text(lines, margin + 5, yPosition + 2);
      yPosition += boxHeight + 5;

      // Add images if any
      for (const img of images) {
        try {
          // Check if we need a new page for image
          if (yPosition > pageHeight - 80) {
            doc.addPage();
            yPosition = 20;
          }

          // Add image label
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "italic");
          doc.text(`[Chart] ${img.alt || "Visualization"}`, margin + 5, yPosition);
          yPosition += 7;

          // Try to load and add the image
          const loadedImg = await loadImage(img.url);

          const imgWidth = maxWidth - 10;
          const imgHeight = (loadedImg.height / loadedImg.width) * imgWidth;

          // Check if image fits on page
          if (yPosition + imgHeight > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }

          // Convert image to base64 and add to PDF
          const canvas = document.createElement('canvas');
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(loadedImg, 0, 0);
          const imgData = canvas.toDataURL('image/png');

          doc.addImage(imgData, "PNG", margin + 5, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (error) {
          // If image fails to load, add a placeholder
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(`[Image unavailable: ${img.url}]`, margin + 5, yPosition);
          yPosition += 7;
        }
      }

      yPosition += 5;

      // Add separator line
      if (index < messages.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
      }
    }

    // Add footer on last page
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Powered by AWS Bedrock AgentCore",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

      // Save the PDF
      const fileName = `ecolafaek-chat-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      // Show success notification
      alert('PDF exported successfully!');

    } catch (error) {
      // Show error notification
      alert('Failed to export PDF. Please try again.');
    } finally {
      // Reset button state
      const exportButton = document.querySelector('[aria-label="Export chat"]');
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = 'Export';
      }
    }
  };

  const formatMessage = (text) => {
    if (!text) return "";

    try {
      let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      let formatted = escaped
        .replace(
          /!\[([^\]]*)\]\(([^)]+)\)/g,
          '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-3 shadow-md" />'
        )
        .replace(
          /\*\*([^*]+)\*\*/g,
          '<strong class="font-bold text-gray-900">$1</strong>'
        )
        .replace(
          /^- (.+)$/gm,
          '<div class="flex items-start mb-2"><span class="mr-2 text-green-600">•</span><span>$1</span></div>'
        )
        .replace(
          /^(\d+)\. (.+)$/gm,
          '<div class="flex items-start mb-2"><span class="mr-2 font-semibold text-green-600">$1.</span><span>$2</span></div>'
        )
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-blue-600 underline hover:text-blue-800 font-medium" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(
          /`([^`]+)`/g,
          '<code class="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>'
        )
        .replace(/\n\n/g, "<br/><br/>")
        .replace(/\n/g, "<br/>");

      return formatted;
    } catch (error) {
      return text;
    }
  };

  return (
    <>
      {/* Load reCAPTCHA v2 - Following https://developers.google.com/recaptcha/docs/display */}
      <Script src="https://www.google.com/recaptcha/api.js" async defer />

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        {/* Show reCAPTCHA verification screen if not verified */}
        {!isVerified ? (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-6 shadow-lg">
                    <Shield size={48} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Security Verification
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    Please complete the verification below to access the
                    EcoLafaek AI Assistant
                  </p>
                </div>

                {/* reCAPTCHA Widget */}
                <div className="flex justify-center mb-6">
                  <div
                    className="g-recaptcha"
                    data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                    data-callback="onRecaptchaSuccess"
                  ></div>
                </div>

                <div className="text-center text-sm text-gray-500">
                  <p className="flex items-center justify-center gap-2">
                    <Shield size={14} className="text-emerald-600" />
                    Protected by reCAPTCHA
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push("/")}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all border border-gray-200 font-medium"
              >
                <Home size={18} />
                Back to Home
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
              <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                  <div className="flex items-center gap-2 md:gap-6">
                    <button
                      onClick={() => router.push("/")}
                      className="p-2 md:p-2.5 hover:bg-gray-100 rounded-lg md:rounded-xl transition-colors group"
                      aria-label="Go home"
                    >
                      <Home
                        size={18}
                        className="md:w-5.5 md:h-5.5 text-gray-600 group-hover:text-gray-900"
                      />
                    </button>

                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="relative w-10 h-10 md:w-14 md:h-14">
                        <NextImage
                          src="/app_logo.png"
                          alt="EcoLafaek Logo"
                          width={56}
                          height={56}
                          className="rounded-xl md:rounded-2xl shadow-md object-cover"
                          style={{ width: "auto", height: "auto" }}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 bg-emerald-500 rounded-full p-1 md:p-1.5 shadow-lg">
                          <Bot size={10} className="md:w-3.5 md:h-3.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-base md:text-2xl font-bold text-gray-900">
                          EcoLafaek AI
                        </h1>
                        <p className="text-[10px] md:text-sm text-gray-600 font-medium hidden sm:block">
                          Powered by Amazon Bedrock
                        </p>
                      </div>
                    </div>
                  </div>

                  {messages.length > 0 && (
                    <div className="flex gap-2 md:gap-3">
                      <button
                        onClick={exportChat}
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all flex items-center gap-1 md:gap-2 font-semibold text-xs md:text-sm"
                        aria-label="Export chat"
                      >
                        <Download size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                      <button
                        onClick={clearChat}
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all flex items-center gap-1 md:gap-2 font-semibold text-xs md:text-sm"
                      >
                        <Trash2 size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-12">
              {messages.length === 0 ? (
                /* Welcome Screen */
                <div className="py-4 md:py-8">
                  <div className="text-center mb-8 md:mb-16">
                    <div className="inline-flex items-center justify-center p-2 md:p-3 bg-emerald-100 rounded-2xl mb-4 md:mb-6">
                      <Sparkles size={24} className="md:w-8 md:h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4 px-2">
                      How can I help you today?
                    </h2>
                    <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-2">
                      Ask me anything about waste reports, statistics, trends,
                      or visualizations. I can generate charts, maps, and
                      detailed insights from your data.
                    </p>
                  </div>

                  {/* Sample Queries - Better Sized */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-16">
                    {sampleQueries.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(query.text)}
                        disabled={loading}
                        className={`group relative p-4 md:p-6 bg-gradient-to-br ${query.gradient} ${query.hoverGradient} text-white rounded-xl md:rounded-2xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 overflow-hidden text-left`}
                      >
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                            <div className="p-1.5 md:p-2 bg-white bg-opacity-20 rounded-lg">
                              <query.icon
                                size={20}
                                className="md:w-6 md:h-6 drop-shadow-lg"
                              />
                            </div>
                          </div>
                          <p className="font-semibold text-sm md:text-base leading-relaxed">
                            {query.text}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Capabilities */}
                  <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg p-6 md:p-10 border border-gray-200">
                    <div className="text-center mb-6 md:mb-10">
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
                        AI-Powered Capabilities
                      </h3>
                      <p className="text-sm md:text-base text-gray-600">
                        Advanced features to help you analyze and visualize
                        waste data
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                      <div className="flex gap-4 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 transition-all group border border-transparent hover:border-emerald-200">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <BarChart3 size={26} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 mb-2 text-lg">
                            Smart Visualizations
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Create interactive bar charts, line graphs, and pie
                            charts from your live data
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all group border border-transparent hover:border-purple-200">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <MapPin size={26} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 mb-2 text-lg">
                            Interactive Maps
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Visualize waste hotspots and locations on
                            interactive geographic maps
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group border border-transparent hover:border-blue-200">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <TrendingUp size={26} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 mb-2 text-lg">
                            Trend Analysis
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Track patterns, statistics, and changes in waste
                            data over time
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 transition-all group border border-transparent hover:border-amber-200">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <Sparkles size={26} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 mb-2 text-lg">
                            Natural Language
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Ask questions in plain English and get intelligent,
                            context-aware answers
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <div className="space-y-6 pb-32">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      } animate-fade-in`}
                    >
                      <div
                        className={`flex gap-2 md:gap-3 max-w-[95%] md:max-w-[85%] ${
                          msg.role === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                              <Bot size={16} className="md:w-5 md:h-5 text-white" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl md:rounded-3xl rounded-br-md shadow-lg"
                              : "bg-white text-gray-800 rounded-2xl md:rounded-3xl rounded-bl-md shadow-lg border border-gray-200"
                          } px-4 py-3 md:px-6 md:py-4`}
                        >
                          {msg.role === "assistant" ? (
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: formatMessage(msg.content),
                              }}
                            />
                          ) : (
                            <p className="text-base whitespace-pre-wrap font-medium">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="flex gap-2 md:gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                            <Bot size={16} className="md:w-5 md:h-5 text-white" />
                          </div>
                        </div>
                        <div className="bg-white px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl rounded-bl-md shadow-lg border border-gray-200">
                          <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full animate-bounce"></div>
                            <div
                              className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl backdrop-blur-md bg-opacity-98 z-50">
              <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
                <div className="flex gap-2 md:gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything about waste data..."
                      className="w-full px-4 py-3 md:px-6 md:py-4 border-2 border-gray-300 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm md:text-base shadow-sm hover:border-gray-400 transition-all"
                      rows={1}
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="px-4 py-3 md:px-6 md:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl md:rounded-2xl transition-all duration-200 flex items-center gap-1.5 md:gap-2 shadow-md hover:shadow-lg font-semibold text-sm md:text-base"
                    aria-label="Send message"
                  >
                    <Send size={18} className="md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-2 md:mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-[10px] md:text-xs text-gray-600 font-medium">
                      Powered by Amazon Bedrock AgentCore
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield size={10} className="md:w-3 md:h-3 text-emerald-600" />
                    <p className="text-[10px] md:text-xs text-gray-600 font-medium">
                      Verified Session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
