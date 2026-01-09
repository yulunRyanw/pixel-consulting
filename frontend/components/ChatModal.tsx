"use client";
import React, { useState, useEffect, useRef } from 'react';

// --- 类型定义 ---
interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: { name: string; role: string } | null;
}

interface Message {
  sender: "user" | "ai";
  text: string;
}

// --- 样式辅助：硬阴影和复古边框 ---
// 这种 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 是打造“像素/贴纸”感的关键
const retroCardStyle = "bg-[#FDFBF7] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
const retroButtonStyle = "bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all";

export default function ChatModal({ isOpen, onClose, character }: ChatModalProps) {
  // State
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // PPT State
  const [pptMarkdown, setPptMarkdown] = useState<string>("");
  const [gammaLink, setGammaLink] = useState<string>("");
  const [showPPTResult, setShowPPTResult] = useState(false);

  // 1. 初始化欢迎语 (保持逻辑不变)
  useEffect(() => {
    if (isOpen && character) {
      let welcomeMsg = "";
      switch(character.role) {
        case "Partner":
          welcomeMsg = "王总，您好。战略方向我们梳理了一下，正想听听您的意见。";
          break;
        case "Associate":
          welcomeMsg = "Boss，Deck 的 Storyline 已经搭好了，有些细节需要您确认。";
          break;
        case "BA":
          welcomeMsg = "数据模型跑完了。这里有几个异常值，我觉得很有意思。";
          break;
        default:
          welcomeMsg = "您好，请问有什么可以帮您？";
      }
      setMessages([{ sender: "ai", text: welcomeMsg }]);
    }
  }, [isOpen, character]);

  // 2. 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen || !character) return null;

  // --- Handlers (逻辑保持不变) ---
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: character.role, message: userMsg })
      });
      const data = await res.json();
      if (res.ok) setMessages(prev => [...prev, { sender: "ai", text: data.reply }]);
      else setMessages(prev => [...prev, { sender: "ai", text: "❌ Connection Lost" }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: "ai", text: "❌ Network Error" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePPT = async () => {
    if (!character) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { sender: "ai", text: "🫡 Copy that. Initiating slide generation sequence..." }]);

    try {
      const historyText = messages.map(m => `${m.sender}: ${m.text}`).join("\n");
      const promptTopic = `Based on conversation, analyze Work Order Backlog. Context: ${historyText.substring(0, 500)}...`;

      const res = await fetch("http://127.0.0.1:8000/api/generate_ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: promptTopic, role: character.name || "Associate" })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setPptMarkdown(data.markdown || "# Error");
        setGammaLink(data.gamma_link || "https://gamma.app/new?mode=text");
        setShowPPTResult(true);
        setMessages(prev => [...prev, { sender: "ai", text: "✅ Slide draft ready for review." }]);
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: "❌ Generation failed." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: "ai", text: "❌ System Error" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Render ---
  return (
    <div className="fixed inset-0 bg-[#E5E5E5] bg-opacity-90 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
      
      {/* 主面板：采用 McKinsey Digital + Retro Pixel 风格 */}
      <div className={`w-[900px] h-[650px] flex flex-col ${retroCardStyle} overflow-hidden relative`}>
        
        {/* 顶部装饰条：像旧式档案夹 */}
        <div className="h-3 bg-red-800 border-b-2 border-black w-full"></div>

        {/* Header 区 */}
        <div className="bg-[#FDFBF7] p-6 border-b-2 border-black flex justify-between items-end">
          <div className="flex items-end gap-6">
            
            {/* 像素头像框 (带呼吸动画) */}
            <div className="w-20 h-20 border-2 border-black bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
                {/* 👇 这里将来放你的 Sprite Sheet */}
                {/* <img src="/pixel-associate.png" className="w-full h-full object-cover animate-pulse" /> */}
                <div className="w-full h-full bg-blue-900 flex items-center justify-center text-white text-xs font-mono animate-pulse">
                  [PIXEL<br/>AVATAR]
                </div>
            </div>

            <div>
              {/* 核心改动：Times New Roman 字体 */}
              <h2 className="text-4xl font-serif font-bold text-black tracking-tight leading-none mb-1">
                {character.role}
              </h2>
              <div className="flex items-center gap-2 text-sm font-mono text-gray-500 uppercase tracking-widest">
                <span className="w-2 h-2 bg-green-500 rounded-full border border-black"></span>
                Online / {character.name}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {/* 生成按钮 */}
            {character.role === "Associate" && (
              <button 
                onClick={handleGeneratePPT}
                disabled={isLoading}
                className={`${retroButtonStyle} px-6 py-2 text-sm font-bold font-serif text-purple-900 hover:bg-purple-50`}
              >
                ✦ Generate Deck
              </button>
            )}
            
            <button onClick={onClose} className={`${retroButtonStyle} w-10 h-10 flex items-center justify-center text-xl font-bold hover:bg-red-50 text-red-600`}>
              ✕
            </button>
          </div>
        </div>

        {/* Chat 内容区 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* 消息气泡：改为更方正的样式，带硬阴影 */}
              <div className={`max-w-[70%] p-5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] ${
                msg.sender === 'user' 
                  ? 'bg-black text-white' 
                  : 'bg-white text-black'
              }`}>
                {/* 发送者标签 */}
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
                    msg.sender === 'user' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                    {msg.sender === 'user' ? 'Client (You)' : character.role}
                </div>
                
                {/* 消息内容：衬线体用于强调语气 */}
                <div className="text-base font-serif leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 ml-2">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce delay-100">●</span>
              <span className="animate-bounce delay-200">●</span>
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="p-6 bg-[#FDFBF7] border-t-2 border-black flex gap-4 items-center">
          <input
            type="text"
            className="flex-1 bg-white border-2 border-black p-4 font-serif text-lg focus:outline-none focus:ring-0 placeholder:text-gray-300 shadow-inner"
            placeholder="Type your directive here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className={`${retroButtonStyle} px-8 py-4 font-bold text-black uppercase tracking-widest hover:bg-green-50`}
          >
            Send
          </button>
        </div>
      </div>

      {/* --- PPT 结果弹窗 (嵌套) --- */}
      {showPPTResult && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-10 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className={`w-[600px] flex flex-col bg-white border-2 border-black shadow-[8px_8px_0px_0px_purple]`}>
            
            <div className="bg-purple-700 p-4 border-b-2 border-black flex justify-between items-center text-white">
              <h3 className="font-serif font-bold text-xl flex items-center gap-2">
                📂 Confidential: Draft Generated
              </h3>
              <button onClick={() => setShowPPTResult(false)} className="hover:text-gray-300">✕</button>
            </div>

            <div className="p-6 bg-gray-50 max-h-[70vh] overflow-y-auto">
              {/* 说明区域 */}
              <div className="mb-6 border-2 border-purple-200 bg-purple-50 p-4 text-sm text-purple-900 font-medium">
                 ℹ️ <strong>System Note:</strong> Content has been structured for Gamma AI "Paste Text" mode.
              </div>

              {/* Markdown 预览区 */}
              <div className="relative group">
                <textarea
                  readOnly
                  value={pptMarkdown}
                  className="w-full h-64 p-4 bg-white border-2 border-gray-300 font-mono text-xs text-gray-600 resize-none focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pptMarkdown);
                    alert("Copied to clipboard!");
                  }}
                  className="absolute top-2 right-2 bg-black text-white px-3 py-1 text-xs font-bold border border-transparent hover:bg-gray-800"
                >
                  COPY
                </button>
              </div>

              {/* Action 按钮 */}
              <a
                href={gammaLink || "https://gamma.app/new?mode=text"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block w-full bg-purple-600 hover:bg-purple-700 text-white text-center py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-lg transition-transform active:translate-y-1 active:shadow-none"
              >
                🚀 Launch Gamma AI
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}