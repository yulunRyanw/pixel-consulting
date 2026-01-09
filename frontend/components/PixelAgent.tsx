// frontend/app/components/PixelAgent.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Agent } from './types';

// ================= 配置区 =================

// 1. 资源映射
const SPRITE_SOURCES: Record<Agent['role'], string> = {
  PARTNER: '/sprites/partner.png',
  MANAGER: '/sprites/manager.png',
  TECH_BA: '/sprites/tech_ba.png',
  FINANCE_BA: '/sprites/finance_ba.png',
  NEW_GRAD_BA: '/sprites/new_grad_ba.png',
};

// 2. 标准化网格配置 (5行 x 4列)
const GRID_LAYOUT = {
  columns: 4,
  rows: 5,
  rowsMap: {
    WALK_DOWN: 0, WALK_UP: 1, WALK_RIGHT: 2, SITTING: 3, ACTIONS: 4,
  }
};

// 3. 【关键修改】定义小人在屏幕上的标准基础宽度
// 不管原图多大，我们强制把它缩放到这个宽度（例如 40px）
const BASE_CHAR_WIDTH_PX = 220; 

interface Props {
  agent: Agent;
  scale?: number; // 这个是外部传入的额外缩放，保持默认 1.5 即可
}

const PixelAgent: React.FC<Props> = ({ agent, scale = 1.5 }) => {
  const src = SPRITE_SOURCES[agent.role];
  
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  
  // 存储计算后的渲染尺寸和缩放比例
  const [renderConfig, setRenderConfig] = useState({
    frameWidth: 0,  // 单帧在屏幕上的实际宽度
    frameHeight: 0, // 单帧在屏幕上的实际高度
    bgWidth: 0,     // 背景图整体需要缩放到的宽度
    bgHeight: 0,    // 背景图整体需要缩放到的高度
  });

  // --- A. 核心逻辑：图片加载与强制缩放计算 ---
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      // 1. 计算原图单帧尺寸（可能是巨大的数值）
      const naturalFrameW = img.naturalWidth / GRID_LAYOUT.columns;
      const naturalFrameH = img.naturalHeight / GRID_LAYOUT.rows;
      
      // 2. 计算缩放比例：目标宽度 / 原图单帧宽度
      // 例如：目标40px / 原图500px = 0.08
      const scaleFactor = BASE_CHAR_WIDTH_PX / naturalFrameW;
      
      // 3. 计算在屏幕上应该渲染的尺寸
      const targetFrameH = naturalFrameH * scaleFactor;
      const targetBgW = img.naturalWidth * scaleFactor;
      const targetBgH = img.naturalHeight * scaleFactor;

      setRenderConfig({
        frameWidth: BASE_CHAR_WIDTH_PX,
        frameHeight: targetFrameH,
        bgWidth: targetBgW,
        bgHeight: targetBgH,
      });
      setIsLoaded(true);
      // console.log(`[${agent.role}] 原尺寸: ${img.naturalWidth}x${img.naturalHeight} -> 缩放比: ${scaleFactor.toFixed(2)} -> 最终单帧: ${BASE_CHAR_WIDTH_PX}x${targetFrameH.toFixed(0)}`);
    };
  }, [src, agent.role]);

  // --- B. 动画循环 (不变) ---
  useEffect(() => {
    let animationSpeed = 200;
    const isAnimating = agent.status === 'WALKING' || agent.status.startsWith('ACTION');
    if (!isAnimating) { setCurrentFrame(0); return; }
    if (agent.status === 'WALKING') animationSpeed = 150;
    const timer = setInterval(() => { setCurrentFrame((prev) => prev + 1); }, animationSpeed);
    return () => clearInterval(timer);
  }, [agent.status]);

  // --- C. 点击交互 (不变) ---
  const handleClick = async () => {
    if (isInteracting) return;
    setIsInteracting(true);
    try {
      const res = await fetch('http://localhost:8000/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, role: agent.role, action: 'CLICK' }),
      });
      const data = await res.json();
      console.log('Backend response:', data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInteracting(false);
    }
  };

  if (!isLoaded || renderConfig.frameWidth === 0) return null;

  // --- D. 计算切片索引 (不变) ---
  const getSpriteInfo = () => {
    let rowIndex = 0; let frameIndex = 0; let isFlipped = false;
    const { rowsMap } = GRID_LAYOUT;
    switch (agent.status) {
      case 'WALKING': case 'IDLE':
        if (agent.direction === 'DOWN') rowIndex = rowsMap.WALK_DOWN;
        else if (agent.direction === 'UP') rowIndex = rowsMap.WALK_UP;
        else { rowIndex = rowsMap.WALK_RIGHT; if (agent.direction === 'LEFT') isFlipped = true; }
        frameIndex = agent.status === 'IDLE' ? 0 : currentFrame % 4; break;
      case 'SITTING':
        rowIndex = rowsMap.SITTING;
        if (agent.direction === 'DOWN') frameIndex = 0;
        else if (agent.direction === 'UP') frameIndex = 1;
        else { frameIndex = 2; if (agent.direction === 'LEFT') isFlipped = true; } break;
      case 'ACTION_1': rowIndex = rowsMap.ACTIONS; frameIndex = 0 + (currentFrame % 2); break;
      case 'ACTION_2': rowIndex = rowsMap.ACTIONS; frameIndex = 2 + (currentFrame % 2); break;
      default: rowIndex = 0;
    }
    return { rowIndex, frameIndex, isFlipped };
  };

  const { rowIndex, frameIndex, isFlipped } = getSpriteInfo();
  
  // --- E. 计算样式 (核心修改：使用缩放后的尺寸) ---
  // 背景偏移量也要用缩放后的单帧尺寸来计算
  const bgPosX = -(frameIndex * renderConfig.frameWidth);
  const bgPosY = -(rowIndex * renderConfig.frameHeight);

  const spriteStyle: React.CSSProperties = {
    backgroundImage: `url(${src})`,
    // 关键：使用缩放后的背景总尺寸
    backgroundSize: `${renderConfig.bgWidth}px ${renderConfig.bgHeight}px`,
    backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    // 容器大小等于缩放后的单帧大小
    width: `${renderConfig.frameWidth}px`,
    height: `${renderConfig.frameHeight}px`,
    imageRendering: 'pixelated',
    transform: isFlipped ? 'scaleX(-1)' : 'none',
    transformOrigin: 'center',
  };

  // 容器样式，应用外部的 scale (1.5倍)
  const containerStyle: React.CSSProperties = {
    left: `${agent.position.x}%`,
    top: `${agent.position.y}%`,
    transform: `translate(-50%, -50%) scale(${scale})`, // 这里会把 40px 的基础再放大 1.5 倍
    cursor: isInteracting ? 'wait' : 'pointer',
    filter: isInteracting ? 'brightness(0.7)' : 'none',
    zIndex: agent.status === 'SITTING' && agent.direction === 'UP' ? 25 : 35, 
  };

  // --- F. 渲染 HTML (基本不变，只是使用了新的尺寸变量) ---
  if (agent.status === 'SITTING' && agent.direction === 'DOWN') {
    return (
      <div onClick={handleClick} className="absolute transition-all duration-300 ease-linear hover:scale-105" style={{ ...containerStyle, zIndex: 15 }}>
        <div style={{
            height: `${renderConfig.frameHeight * 0.6}px`,
            width: `${renderConfig.frameWidth}px`,
            overflow: 'hidden', position: 'relative'
        }}>
            <div style={{ ...spriteStyle, position: 'absolute', top: 0 }} />
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className="absolute transition-all duration-300 ease-linear hover:scale-105" style={containerStyle}>
      <div style={spriteStyle} />
    </div>
  );
};

export default PixelAgent;