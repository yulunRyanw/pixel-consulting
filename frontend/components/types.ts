// frontend/app/types.ts

export type Role = 'PARTNER' | 'MANAGER' | 'TECH_BA' | 'FINANCE_BA' | 'NEW_GRAD_BA';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// 定义小人可能处在的所有状态
export type AgentStatus =
  | 'IDLE'        // 站立不动
  | 'WALKING'     // 正在走动
  | 'SITTING'     // 坐着状态
  | 'ACTION_1'    // 特殊动作1 (如打电话/指点/打字)
  | 'ACTION_2';   // 特殊动作2 (如双手交叉/抓狂)

export interface Position {
  x: number; // 百分比坐标 (0-100)
  y: number; // 百分比坐标 (0-100)
}

export interface Agent {
  id: string;
  role: Role;
  name: string;
  position: Position;
  direction: Direction;
  status: AgentStatus;
  targetPosition?: Position; // 移动的目标点
}

// --- Sprite Sheet 配置接口 ---

export interface SpriteRowConfig {
  rowIndex: number; // 在图片中的第几行 (从0开始)
  frameCount: number; // 这一行有多少帧动画
}

export interface RoleSpriteConfig {
  src: string; // 图片路径
  frameSize: { width: number; height: number }; // 单帧尺寸
  rows: {
    WALK_DOWN: SpriteRowConfig;
    WALK_UP: SpriteRowConfig;
    WALK_RIGHT: SpriteRowConfig; // 向左走通过翻转向右走实现
    SITTING: SpriteRowConfig;    // 坐姿行
    ACTIONS: SpriteRowConfig;    // 特殊动作行
  };
}