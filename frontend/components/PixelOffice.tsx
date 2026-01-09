// frontend/app/components/PixelOffice.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Agent, AgentStatus, Direction } from './types';
import PixelAgent from './PixelAgent';

// ================= 1. 兴趣点精准坐标 (基于原图测算) =================
// 坐标系：左上角 (0,0) -> 右下角 (100,100)

interface PointOfInterest {
  x: number;
  y: number;
  type: 'SEAT' | 'STAND' | 'LOITER';
  direction: Direction; // 到达该点时应该朝向哪里
  id: string; // 用于调试识别
}

const POINTS: PointOfInterest[] = [
  // --- A. 会议桌核心区 (Table) ---
  
  // 1. 上排椅子 (面朝下，位于桌子后方，会触发遮挡逻辑)
  // X轴分布：左(36), 中(50), 右(64) | Y轴统一：42 (桌子边缘上方)
  { id: 'seat_top_1', x: 36, y: 42, type: 'SEAT', direction: 'DOWN' },
  { id: 'seat_top_2', x: 50, y: 42, type: 'SEAT', direction: 'DOWN' },
  { id: 'seat_top_3', x: 64, y: 42, type: 'SEAT', direction: 'DOWN' },

  // 2. 下排椅子 (面朝上，位于桌子前方)
  // X轴同上 | Y轴统一：68 (桌子边缘下方)
  { id: 'seat_bottom_1', x: 36, y: 68, type: 'SEAT', direction: 'UP' },
  { id: 'seat_bottom_2', x: 50, y: 68, type: 'SEAT', direction: 'UP' },
  { id: 'seat_bottom_3', x: 64, y: 68, type: 'SEAT', direction: 'UP' },

  // 3. 两端椅子
  // 左端 (面朝右): X=27, Y=55 (桌子垂直中心)
  { id: 'seat_left', x: 27, y: 55, type: 'SEAT', direction: 'RIGHT' },
  // 右端 (面朝左): X=73, Y=55
  { id: 'seat_right', x: 73, y: 55, type: 'SEAT', direction: 'LEFT' },

  // --- B. 老板房 (Boss Room) ---
  // 右侧玻璃房内的办公桌，靠右墙
  { id: 'boss_seat', x: 91, y: 58, type: 'SEAT', direction: 'LEFT' },

  // --- C. 互动区域 (Action Zones) ---
  
  // 白板前 (站立讲解)
  { id: 'whiteboard', x: 16, y: 45, type: 'STAND', direction: 'RIGHT' },

  // 玻璃房门口 (站立/闲聊)
  { id: 'glass_door', x: 78, y: 75, type: 'LOITER', direction: 'UP' },

  // 盆栽旁 (摸鱼点)
  { id: 'plant', x: 12, y: 75, type: 'LOITER', direction: 'RIGHT' },
];

// 初始化小人位置 (开局就坐在正确的位置上)
const INITIAL_AGENTS: Agent[] = [
  { id: '1', role: 'PARTNER', name: 'Boss', position: { x: 91, y: 58 }, direction: 'LEFT', status: 'SITTING' }, // 老板在老板房
  { id: '2', role: 'MANAGER', name: 'Alice', position: { x: 16, y: 45 }, direction: 'RIGHT', status: 'ACTION_1' }, // 经理在讲PPT
  { id: '3', role: 'TECH_BA', name: 'Bob', position: { x: 36, y: 42 }, direction: 'DOWN', status: 'SITTING' }, // 坐在上排左
  { id: '4', role: 'FINANCE_BA', name: 'Charlie', position: { x: 50, y: 68 }, direction: 'UP', status: 'SITTING' }, // 坐在下排中
  { id: '5', role: 'NEW_GRAD_BA', name: 'David', position: { x: 12, y: 75 }, direction: 'RIGHT', status: 'IDLE' }, // 在盆栽旁发呆
];

const PixelOffice = () => {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  // 调试模式开关：设为 true 可以看到所有坐标红点
  const DEBUG_MODE = false; 

  // --- 游戏循环 ---
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prevAgents) => prevAgents.map(updateAgentBehavior));
    }, 100); // 100ms 刷新率保证移动平滑
    return () => clearInterval(interval);
  }, []);

  // --- 智能决策逻辑 ---
  const updateAgentBehavior = (agent: Agent): Agent => {
    // 1. 正在移动中 -> 继续走
    if (agent.status === 'WALKING' && agent.targetPosition) {
      return moveAgent(agent);
    }

    // 2. 状态切换逻辑 (0.5% 概率触发新动作)
    if (Math.random() < 0.005) {
      // 随机选一个没人的空位或者闲逛点 (这里简化为随机选任意点)
      const targetPoint = POINTS[Math.floor(Math.random() * POINTS.length)];
      
      return {
        ...agent,
        status: 'WALKING',
        targetPosition: { x: targetPoint.x, y: targetPoint.y },
      };
    }

    return agent;
  };

  // --- 移动与状态机逻辑 ---
  const moveAgent = (agent: Agent): Agent => {
    if (!agent.targetPosition) return { ...agent, status: 'IDLE' };

    const speed = 1.0; // 移动速度
    const dx = agent.targetPosition.x - agent.position.x;
    const dy = agent.targetPosition.y - agent.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // [判定到达] 距离目标小于 1%
    if (distance < 1.0) {
      // 1. 寻找当前坐标对应的兴趣点定义
      const poi = POINTS.find(p => 
        Math.abs(p.x - agent.targetPosition!.x) < 1 && 
        Math.abs(p.y - agent.targetPosition!.y) < 1
      );
      
      let newStatus: AgentStatus = 'IDLE';
      let newDirection = agent.direction;

      if (poi) {
        newDirection = poi.direction; // 强制转身
        if (poi.type === 'SEAT') newStatus = 'SITTING';
        else if (poi.type === 'STAND') newStatus = 'ACTION_1'; // 演讲/动作
        else newStatus = 'IDLE';
      }

      return {
        ...agent,
        position: agent.targetPosition, // 强制吸附
        targetPosition: undefined, // 清除目标
        status: newStatus,
        direction: newDirection,
      };
    }

    // [移动计算] 
    // 使用简单的直线移动
    const moveX = (dx / distance) * speed;
    const moveY = (dy / distance) * speed;

    // [方向判定]
    let faceDir = agent.direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      faceDir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      faceDir = dy > 0 ? 'DOWN' : 'UP';
    }

    return {
      ...agent,
      position: { x: agent.position.x + moveX, y: agent.position.y + moveY },
      direction: faceDir,
    };
  };

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden flex justify-center items-center">
      <div className="relative w-full max-w-7xl aspect-video bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-gray-800">
        
        {/* 1. 背景层 */}
        <div 
            className="absolute inset-0 w-full h-full"
            style={{
                backgroundImage: "url('/background/office_map.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated'
            }}
        />

        {/* 2. 调试层 (如果 DEBUG_MODE 开关打开，显示红点) */}
        {DEBUG_MODE && POINTS.map((p) => (
          <div 
            key={p.id} 
            className="absolute w-2 h-2 bg-red-500 rounded-full z-50 border border-white" 
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
            title={p.id}
          />
        ))}

        {/* 3. 角色层 */}
        {agents.map((agent) => (
          <PixelAgent key={agent.id} agent={agent} />
        ))}

      </div>
    </div>
  );
};

export default PixelOffice;