import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  HelpCircle,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { FieldProfile, WeatherObservation } from '../types';
import { GeminiService } from '../services/geminiService';

interface AiAssistantViewProps {
  activeField: FieldProfile;
  weather: WeatherObservation;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ activeField, weather }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'ai',
      text: `Xin chào bác nông dân! Tôi là Trợ lý AI Canh tác AgriNASA. Tôi đang theo dõi thửa ruộng "${activeField.name}" (${activeField.crop.name}, ${activeField.crop.variety}) tại ${activeField.province}. Hôm nay ruộng của bác đang có nhiệt độ ${weather.temp}°C, ẩm độ rễ ${(weather.gwetroot * 100).toFixed(0)}%. Bác cần tôi giải đáp hoặc tính toán điều gì cho ruộng hôm nay?`,
      timestamp: '07:00',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    `Đất ruộng của tôi là ${activeField.soilType}, hôm nay có nên tưới thêm không?`,
    `Với nhiệt độ ${weather.temp}°C và ẩm ${weather.humidity}%, có nguy cơ nấm bệnh gì?`,
    `Khi nào là thời điểm thích hợp nhất để bón phân đợt tới?`,
    `Dữ liệu NASA 21 năm tại đây có hay gặp đợt rét/hạn vào thời điểm này không?`,
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        parts: m.text,
      }));

      const reply = await GeminiService.sendChatMessage(textToSend, activeField, history);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-emerald-600" />
            Hội thoại Trực tiếp với Gemini AI Chuyên gia Nông học
          </div>
          <h1 className="text-xl font-bold text-stone-900 mt-1">
            Trợ lý Canh tác Riêng cho Thửa ruộng: {activeField.name}
          </h1>
          <p className="text-xs text-stone-500">
            AI ghi nhớ lịch sử đất, giống cây và đối chiếu dữ liệu viễn thám NASA POWER để tư vấn sát thực tế nhất.
          </p>
        </div>

        <div className="text-xs bg-emerald-50 text-emerald-900 font-semibold px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
          Cây: {activeField.crop.name} • {activeField.crop.currentStage}
        </div>
      </div>

      {/* Chat Window */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {messages.map(msg => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {isAi && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl max-w-[85%] sm:max-w-[75%] space-y-1.5 leading-relaxed ${
                    isAi
                      ? 'bg-stone-100/90 text-stone-800 rounded-tl-xs border border-stone-200/80'
                      : 'bg-emerald-800 text-white rounded-tr-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div
                    className={`text-[10px] text-right font-mono ${
                      isAi ? 'text-stone-400' : 'text-emerald-200'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {!isAi && (
                  <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-stone-500 text-xs italic pl-11">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>AI đang phân tích dữ liệu đất & thời tiết NASA...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-stone-400 shrink-0 font-semibold">Gợi ý hỏi nhanh:</span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-lg text-stone-700 hover:text-emerald-800 whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Hỏi trợ lý AI về đất, nước, bón phân hay thời tiết hôm nay..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-4 py-2.5 border border-stone-300 rounded-xl text-stone-900 text-xs sm:text-sm focus:outline-emerald-600"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" /> Gửi
          </button>
        </div>
      </div>
    </div>
  );
};
