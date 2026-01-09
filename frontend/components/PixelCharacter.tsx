"use client";
import React from 'react';

// 定义角色的属性
interface CharacterProps {
  name: string;
  role: "Partner" | "EM" | "Associate" | "BA";
  status: "idle" | "working" | "arguing" | "waiting";
  x: number; // 简单的坐标系统
  y: number;
  onClick: () => void;
}

export default function PixelCharacter({ name, role, status, x, y, onClick }: CharacterProps) {
  
  // 根据角色分配颜色 (像素风配色)
  const colors = {
    Partner: "bg-red-600 border-red-800", // 红衣主教
    EM: "bg-blue-500 border-blue-700",    // 你的颜色
    Associate: "bg-purple-500 border-purple-700",
    BA: "bg-green-500 border-green-700",
  };

  // 状态气泡 (Status Bubbles)
  const getBubble = () => {
    if (status === "working") return "💬"; // 正在打字
    if (status === "arguing") return "❗️"; // 吵架中
    if (status === "waiting") return "⏳"; // 等指令
    return "";
  };

  return (
    <div 
      onClick={onClick}
      className={`absolute transition-all duration-500 cursor-pointer hover:scale-110`}
      style={{ 
        left: `${x * 100}px`, 
        top: `${y * 100}px`,
        width: '80px',
        height: '80px' 
      }}
    >
      {/* 状态气泡 (浮在头顶) */}
      {status !== "idle" && (
        <div className="absolute -top-10 left-4 text-3xl animate-bounce">
          {getBubble()}
        </div>
      )}

      {/* 像素小人本体 (简单的方块人) */}
      <div className={`w-full h-full border-b-8 border-r-8 rounded-sm shadow-xl ${colors[role]} relative`}>
        {/* 眼睛 (让你看起来有生命) */}
        <div className="absolute top-4 left-3 w-3 h-3 bg-black"></div>
        <div className="absolute top-4 right-3 w-3 h-3 bg-black"></div>
        
        {/* 名字标签 */}
        <div className="absolute -bottom-6 w-full text-center text-xs font-mono text-white bg-black bg-opacity-50 rounded">
          {role}
        </div>
      </div>
    </div>
  );
}