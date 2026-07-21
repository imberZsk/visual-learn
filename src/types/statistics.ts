/**
 * 学习统计数据接口
 * 用于展示用户的学习数据统计和分析
 */
export interface Statistics {
  /** 总学习天数 */
  totalDays: number;

  /** 总学习时长（单位：分钟） */
  totalDuration: number;

  /** 已完成的路线图数量 */
  completedRoadmaps: number;

  /** 进行中的路线图数量 */
  inProgressRoadmaps: number;

  /** 按主题分类的学习时长统计 */
  durationByTopic: TopicStatistics[];

  /** 最近7天的学习趋势 */
  recentTrend: DailyTrend[];

  /** 平均每日学习时长（单位：分钟） */
  averageDailyDuration: number;

  /** 最长连续学习天数 */
  longestStreak: number;

  /** 当前连续学习天数 */
  currentStreak: number;
}

/**
 * 主题统计接口
 * 记录某个学习主题的统计数据
 */
export interface TopicStatistics {
  /** 学习主题名称 */
  topic: string;

  /** 该主题的总学习时长（单位：分钟） */
  duration: number;

  /** 该主题的学习次数 */
  count: number;
}

/**
 * 每日趋势接口
 * 记录某一天的学习数据用于趋势分析
 */
export interface DailyTrend {
  /** 日期（格式：YYYY-MM-DD） */
  date: string;

  /** 当天学习时长（单位：分钟） */
  duration: number;

  /** 当天学习条目数 */
  logCount: number;
}
