/**
 * 每日学习日志接口
 * 用于记录用户每天的学习活动和内容
 */
export interface DailyLog {
  /** 日志唯一标识符 */
  id: string;

  /** 日志日期（格式：YYYY-MM-DD） */
  date: string;

  /** 学习内容描述 */
  content: string;

  /** 学习时长（单位：分钟） */
  duration: number;

  /** 学习主题或分类 */
  topic: string;

  /** 学习笔记 */
  notes?: string;

  /** 创建时间戳 */
  createdAt: number;

  /** 更新时间戳 */
  updatedAt: number;
}
