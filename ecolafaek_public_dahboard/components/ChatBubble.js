import { useRouter } from 'next/router';
import { MessageCircle, Sparkles } from 'lucide-react';

const ChatBubble = () => {
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => router.push('/agentcore-chat')}
        className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-3 px-6 py-4 border-2 border-green-500"
        aria-label="Chat with AgentCore"
      >
        <div className="relative">
          <MessageCircle size={24} className="animate-pulse" />
          <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300 animate-bounce" />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-bold text-sm">Chat with</span>
          <span className="font-extrabold text-xs bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
            AgentCore AI
          </span>
        </div>
      </button>
    </div>
  );
};

export default ChatBubble;