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
} from "lucide-react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function AgentCoreChat() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`web_${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "No response received",
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "❌ Error: Could not connect to AgentCore. Please try again.",
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

  const exportChat = () => {
    const chatText = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecolafaek-chat-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/")}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
                aria-label="Go home"
              >
                <Home
                  size={22}
                  className="text-gray-600 group-hover:text-gray-900"
                />
              </button>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Image
                    src="/app_logo.png"
                    alt="EcoLafaek Logo"
                    width={56}
                    height={56}
                    className="rounded-2xl shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 shadow-lg">
                    <Bot size={14} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    EcoLafaek AI Assistant
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">
                    Powered by Amazon Bedrock AgentCore
                  </p>
                </div>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="hidden md:flex gap-3">
                <button
                  onClick={exportChat}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all flex items-center gap-2 font-semibold text-sm"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={clearChat}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all flex items-center gap-2 font-semibold text-sm"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="py-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-2xl mb-6">
                <Sparkles size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                How can I help you today?
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Ask me anything about waste reports, statistics, trends, or
                visualizations. I can generate charts, maps, and detailed
                insights from your data.
              </p>
            </div>

            {/* Sample Queries - Better Sized */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
              {sampleQueries.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(query.text)}
                  disabled={loading}
                  className={`group relative p-6 bg-gradient-to-br ${query.gradient} ${query.hoverGradient} text-white rounded-2xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 overflow-hidden text-left`}
                >
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <query.icon size={24} className="drop-shadow-lg" />
                      </div>
                    </div>
                    <p className="font-semibold text-base leading-relaxed">
                      {query.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Capabilities */}
            <div className="bg-white rounded-3xl shadow-lg p-10 border border-gray-200">
              <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  AI-Powered Capabilities
                </h3>
                <p className="text-gray-600">
                  Advanced features to help you analyze and visualize waste data
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4 p-5 rounded-2xl hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 transition-all group border border-transparent hover:border-emerald-200">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                    <BarChart3 size={26} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">
                      Smart Visualizations
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Create interactive bar charts, line graphs, and pie charts
                      from your live data
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
                      Visualize waste hotspots and locations on interactive
                      geographic maps
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
                      Track patterns, statistics, and changes in waste data over
                      time
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
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                        <Bot size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-3xl rounded-br-md shadow-lg"
                        : "bg-white text-gray-800 rounded-3xl rounded-bl-md shadow-lg border border-gray-200"
                    } px-6 py-4`}
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
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                      <Bot size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="bg-white px-6 py-4 rounded-3xl rounded-bl-md shadow-lg border border-gray-200">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about waste data, trends, statistics..."
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-base shadow-sm hover:border-gray-400 transition-all"
                rows={1}
                disabled={loading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg font-semibold"
              aria-label="Send message"
            >
              <Send size={20} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-600 font-medium">
                Powered by Amazon Bedrock AgentCore
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
