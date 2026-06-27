/**
 * 学习路线图接口
 * 用于定义学习计划和里程碑
 */
export interface Roadmap {
  /** 路线图唯一标识符 */
  id: string;

  /** 路线图标题 */
  title: string;

  /** 路线图描述 */
  description: string;

  /** 目标完成日期（格式：YYYY-MM-DD） */
  targetDate: string;

  /** 学习阶段列表 */
  phases: RoadmapPhase[];

  /** 当前进度（0-100） */
  progress: number;

  /** 路线图状态 */
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';

  /** 创建时间戳 */
  createdAt: number;

  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * 学习阶段接口
 * 表示路线图中的一个学习阶段或里程碑
 */
export interface RoadmapPhase {
  /** 阶段唯一标识符 */
  id: string;

  /** 阶段名称 */
  name: string;

  /** 阶段描述 */
  description: string;

  /** 该阶段的任务列表 */
  tasks: RoadmapTask[];

  /** 阶段完成状态 */
  completed: boolean;
}

/**
 * 学习任务接口
 * 表示某个学习阶段中的具体任务
 */
export interface RoadmapTask {
  /** 任务唯一标识符 */
  id: string;

  /** 任务名称 */
  name: string;

  /** 任务完成状态 */
  completed: boolean;

  /** 完成时间戳（任务完成时记录） */
  completedAt?: number;
}
