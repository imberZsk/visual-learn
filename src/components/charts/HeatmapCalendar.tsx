import React from 'react'
import { Card, Space, Tooltip, Typography } from 'antd'
import './Charts.css'

/** antd Typography.Text 和 Title 的别名。 */
const { Text, Title } = Typography

/**
 * 每日学习数据接口
 */
interface DayData {
  // 日期字符串 (YYYY-MM-DD)
  date: string
  // 学习次数/强度 (0-4)
  count: number
}

/**
 * 热力图日历组件的属性接口
 */
interface HeatmapCalendarProps {
  // 学习数据数组
  data: DayData[]
  // 显示的月份数量
  months?: number
}

/**
 * 热力图日历组件
 * 使用色块展示学习活跃度,类似 GitHub 贡献图
 */
const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  months = 12,
}) => {
  /**
   * 根据学习次数返回对应的语义强度 class
   * @param count - 学习次数 (0-4)
   * @returns 热力格语义 class 名
   */
  const getIntensityClassName = (count: number): string => {
    if (count < 0) return 'heatmap-cell--empty'
    if (count === 0) return 'heatmap-cell--level-0'
    if (count === 1) return 'heatmap-cell--level-1'
    if (count === 2) return 'heatmap-cell--level-2'
    if (count === 3) return 'heatmap-cell--level-3'
    return 'heatmap-cell--level-4'
  }

  /**
   * 生成指定月份数的日期网格数据
   * @returns 日期数据数组
   */
  const generateCalendarData = (): DayData[] => {
    // 生成的天数 (近 N 个月)
    const days = months * 30
    // 结果数组
    const result: DayData[] = []
    // 今天的日期对象
    const today = new Date()

    // 从今天往前推算生成日期
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // 格式化日期字符串
      const dateString = date.toISOString().split('T')[0]

      // 查找该日期的学习数据
      const dayData = data.find((d) => d.date === dateString)

      result.push({
        date: dateString,
        count: dayData?.count || 0,
      })
    }

    return result
  }

  // 生成日历数据
  const calendarData = generateCalendarData()

  // 星期标签
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

  /**
   * 将日期数据按周分组
   * @returns 二维数组,每个子数组代表一周
   */
  const groupByWeeks = (): DayData[][] => {
    const weeks: DayData[][] = []
    // 当前周的数据
    let currentWeek: DayData[] = []

    calendarData.forEach((day, index) => {
      const date = new Date(day.date)
      // 获取星期几 (0-6)
      const dayOfWeek = date.getDay()

      // 如果是第一天且不是周日,前面填充空白
      if (index === 0 && dayOfWeek !== 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: '', count: -1 })
        }
      }

      currentWeek.push(day)

      // 如果是周六或最后一天,结束当前周
      if (dayOfWeek === 6 || index === calendarData.length - 1) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    return weeks
  }

  // weeks 存储按周分组后的热力图数据。
  const weeks = groupByWeeks()
  // legendLevels 存储图例从少到多的学习强度级别。
  const legendLevels = [0, 1, 2, 3, 4]

  return (
    <Card className="heatmap-card">
      <Title level={5} className="heatmap-card__title">
        学习热力图
      </Title>
      {/* 日历网格容器 */}
      <div className="heatmap-scroll">
        <div className="heatmap-canvas">
          {/* 星期标签行 */}
          <div className="heatmap-months">
            <div className="heatmap-months__spacer" />
            {weeks.map((_, weekIndex) => (
              <div key={weekIndex} className="heatmap-month">
                {weekIndex % 4 === 0 && (
                  <Text type="secondary">
                    {/* 显示每月第一周的月份标签 */}
                    {new Date(
                      calendarData[weekIndex * 7]?.date || ''
                    ).toLocaleDateString('zh-CN', { month: 'short' })}
                  </Text>
                )}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className="heatmap-grid">
            {/* 左侧星期标签 */}
            <div className="heatmap-week-labels">
              {weekLabels.map((label) => (
                <Text key={label} type="secondary">
                  {label}
                </Text>
              ))}
            </div>

            {/* 日期色块网格 */}
            <div className="heatmap-weeks">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="heatmap-week">
                  {week.map((day, dayIndex) => (
                    <Tooltip
                      key={dayIndex}
                      title={day.date ? `${day.date}: ${day.count} 次学习` : ''}
                    >
                      <span
                        className={`heatmap-cell ${getIntensityClassName(day.count)}`}
                      />
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 图例 */}
          <Space size={8} className="heatmap-legend">
            <Text type="secondary">少</Text>
            {legendLevels.map((level) => (
              <span
                key={level}
                className={`heatmap-cell ${getIntensityClassName(level)}`}
              />
            ))}
            <Text type="secondary">多</Text>
          </Space>
        </div>
      </div>
    </Card>
  )
}

export default HeatmapCalendar
