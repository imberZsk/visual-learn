import React from 'react';
import { Card, Space, Tooltip, Typography } from 'antd';

/** antd Typography.Text 和 Title 的别名。 */
const { Text, Title } = Typography;

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
   * 根据学习次数返回对应的色块颜色
   * @param count - 学习次数 (0-4)
   * @returns CSS 颜色值
   */
  const getColor = (count: number): string => {
    // 根据不同的学习强度返回不同深度的蓝色
    if (count === 0) return '#f0f0f0';
    if (count === 1) return '#bae0ff';
    if (count === 2) return '#69b1ff';
    if (count === 3) return '#1677ff';
    return '#0958d9'; // count >= 4
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

  // weeks 存储按周分组后的热力图数据。
  const weeks = groupByWeeks();
  // legendLevels 存储图例从少到多的学习强度级别。
  const legendLevels = [0, 1, 2, 3, 4];

  return (
    <Card>
      <Title level={5} style={{ marginTop: 0 }}>
        学习热力图
      </Title>
      {/* 日历网格容器 */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', minWidth: '100%' }}>
          {/* 星期标签行 */}
          <div style={{ display: 'flex', marginBottom: 8 }}>
            <div style={{ width: 32 }}></div>
            {weeks.map((_, weekIndex) => (
              <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', marginLeft: 4 }}>
                {weekIndex % 4 === 0 && (
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                    {/* 显示每月第一周的月份标签 */}
                    {new Date(calendarData[weekIndex * 7]?.date || '').toLocaleDateString('zh-CN', { month: 'short' })}
                  </Text>
                )}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div style={{ display: 'flex' }}>
            {/* 左侧星期标签 */}
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 8 }}>
              {weekLabels.map(label => (
                <Text key={label} type="secondary" style={{ height: 12, fontSize: 12, lineHeight: '12px', marginBottom: 4 }}>
                  {label}
                </Text>
              ))}
            </div>

            {/* 日期色块网格 */}
            <div style={{ display: 'flex', gap: 4 }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {week.map((day, dayIndex) => (
                    <Tooltip key={dayIndex} title={day.date ? `${day.date}: ${day.count} 次学习` : ''}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          display: 'inline-block',
                          background: day.count === -1 ? 'transparent' : getColor(day.count),
                        }}
                      />
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 图例 */}
          <Space size={8} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>少</Text>
            {legendLevels.map((level) => (
              <span
                key={level}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  display: 'inline-block',
                  background: getColor(level),
                }}
              />
            ))}
            <Text type="secondary" style={{ fontSize: 12 }}>多</Text>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default HeatmapCalendar;
