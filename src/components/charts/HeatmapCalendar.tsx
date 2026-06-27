import React from 'react';

/**
 * 每日学习数据接口
 */
interface DayData {
  // 日期字符串 (YYYY-MM-DD)
  date: string;
  // 学习次数/强度 (0-4)
  count: number;
}

/**
 * 热力图日历组件的属性接口
 */
interface HeatmapCalendarProps {
  // 学习数据数组
  data: DayData[];
  // 显示的月份数量
  months?: number;
}

/**
 * 热力图日历组件
 * 使用色块展示学习活跃度,类似 GitHub 贡献图
 */
const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  months = 12
}) => {
  /**
   * 根据学习次数返回对应的颜色类名
   * @param count - 学习次数 (0-4)
   * @returns Tailwind CSS 类名
   */
  const getColorClass = (count: number): string => {
    // 根据不同的学习强度返回不同深度的蓝色
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-blue-200';
    if (count === 2) return 'bg-blue-400';
    if (count === 3) return 'bg-blue-600';
    return 'bg-blue-800'; // count >= 4
  };

  /**
   * 生成指定月份数的日期网格数据
   * @returns 日期数据数组
   */
  const generateCalendarData = (): DayData[] => {
    // 生成的天数 (近 N 个月)
    const days = months * 30;
    // 结果数组
    const result: DayData[] = [];
    // 今天的日期对象
    const today = new Date();

    // 从今天往前推算生成日期
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // 格式化日期字符串
      const dateString = date.toISOString().split('T')[0];

      // 查找该日期的学习数据
      const dayData = data.find(d => d.date === dateString);

      result.push({
        date: dateString,
        count: dayData?.count || 0
      });
    }

    return result;
  };

  // 生成日历数据
  const calendarData = generateCalendarData();

  // 星期标签
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

  /**
   * 将日期数据按周分组
   * @returns 二维数组,每个子数组代表一周
   */
  const groupByWeeks = (): DayData[][] => {
    const weeks: DayData[][] = [];
    // 当前周的数据
    let currentWeek: DayData[] = [];

    calendarData.forEach((day, index) => {
      const date = new Date(day.date);
      // 获取星期几 (0-6)
      const dayOfWeek = date.getDay();

      // 如果是第一天且不是周日,前面填充空白
      if (index === 0 && dayOfWeek !== 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: '', count: -1 });
        }
      }

      currentWeek.push(day);

      // 如果是周六或最后一天,结束当前周
      if (dayOfWeek === 6 || index === calendarData.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  };

  const weeks = groupByWeeks();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* 标题 */}
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        学习热力图
      </h3>

      {/* 日历网格容器 */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* 星期标签行 */}
          <div className="flex mb-2">
            <div className="w-8"></div>
            {weeks.map((_, weekIndex) => (
              <div key={weekIndex} className="flex flex-col ml-1">
                {weekIndex % 4 === 0 && (
                  <span className="text-xs text-gray-500 mb-1">
                    {/* 显示每月第一周的月份标签 */}
                    {new Date(calendarData[weekIndex * 7]?.date || '').toLocaleDateString('zh-CN', { month: 'short' })}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className="flex">
            {/* 左侧星期标签 */}
            <div className="flex flex-col mr-2">
              {weekLabels.map(label => (
                <div key={label} className="h-3 text-xs text-gray-500 flex items-center mb-1">
                  {label}
                </div>
              ))}
            </div>

            {/* 日期色块网格 */}
            <div className="flex space-x-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col space-y-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${
                        day.count === -1 ? 'bg-transparent' : getColorClass(day.count)
                      }`}
                      title={day.date ? `${day.date}: ${day.count} 次学习` : ''}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 图例 */}
          <div className="flex items-center justify-end mt-4 space-x-2">
            <span className="text-xs text-gray-500">少</span>
            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-800 rounded-sm"></div>
            <span className="text-xs text-gray-500">多</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
