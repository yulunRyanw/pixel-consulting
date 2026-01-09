"use client";
import React, { useState } from 'react';
import PixelCharacter from './PixelCharacter';
import ChatModal from './ChatModal'; // 引入刚才写的弹窗

export default function OfficeFloor() {
  // 定义所有员工的状态
  // frontend/components/OfficeFloor.tsx

const [team, setTeam] = useState([
  // Partner 还是 Partner，但他得听你的
  { id: 1, name: "Boss", role: "Partner", status: "idle", x: 0, y: 0 },
  
  // 🔴 关键修改：把你变成 VIP Client
  { id: 2, name: "You", role: "Client", status: "idle", x: 1, y: 0 }, 
  
  // 干活的小弟们
  { id: 3, name: "Alice", role: "Associate", status: "working", x: 1, y: 3 },
  { id: 4, name: "Bob", role: "BA", status: "arguing", x: 5, y: 3 },
]);

  // 新增：当前正在和谁聊天
  const [activeChar, setActiveChar] = useState<{name: string, role: string} | null>(null);

  // frontend/components/OfficeFloor.tsx

const handleInteract = (char: any) => {
  // 只有点击非自己的角色才弹出聊天
  if (char.role !== "Client") { // 👈 这里改成 Client
    setActiveChar({ name: char.name, role: char.role });
  } else {
    alert("这是你自己 (Client)。去指挥他们干活！");
  }
};

  return (
    <div className="relative w-[800px] h-[600px] bg-gray-800 border-4 border-gray-600 shadow-2xl overflow-hidden rounded-xl">
      {/* 装饰层 */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#fff 2px, transparent 2px), linear-gradient(90deg, #fff 2px, transparent 2px)', backgroundSize: '100px 100px' }}>
      </div>
      <div className="absolute top-20 left-20 w-32 h-20 bg-amber-900 opacity-50 border-4 border-amber-950">
        <div className="text-white text-xs p-2">Partner Desk</div>
      </div>
      <div className="absolute bottom-20 right-20 w-64 h-32 bg-slate-700 opacity-50 border-4 border-slate-900">
         <div className="text-white text-xs p-2">The Bullpen (BA/Assoc)</div>
      </div>

      {/* 渲染小人 */}
      {team.map((char) => (
        <PixelCharacter
          key={char.id}
          // @ts-ignore
          role={char.role}
          // @ts-ignore
          status={char.status}
          name={char.name}
          x={char.x}
          y={char.y}
          onClick={() => handleInteract(char)}
        />
      ))}

      {/* 渲染聊天弹窗 */}
      <ChatModal 
        isOpen={!!activeChar} 
        onClose={() => setActiveChar(null)} 
        character={activeChar} 
      />
    </div>
  );
}