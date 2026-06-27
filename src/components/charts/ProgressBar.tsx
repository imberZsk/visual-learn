import React from 'react';

/**
 * 进度条组件的属性接口
 */
interface ProgressBarProps {
  // 当前进度值
  current: number;
  // 目标值
  target: number;
  // 进度条标签
  label?: string;
  // 显示颜色 (Tailwind 颜色类)
  color?: string;
  // 是否显示百分比
  showPercentage?: boolean;
  // 是否显示数值
  showValues?: boolean;
}

/**
 * 进度条组件
 * 用于可视化展示学习进度和目标完成情况
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  label,
  color = 'bg-blue-500',
  showPercentage = true,
  showValues = true
}) => {
  /**
   * 计算完成百分比
   * @returns 百分比数值 (0-100)
   */
  const calculatePercentage = (): number => {
    // 避免除以零的情况
    if (target === 0) return 0;

    // 计算百分比,最大不超过 100%
    const percentage = (current / target) * 100;
    return Math.min(Math.round(percentage), 100);
  };

  // 完成百分比
  const percentage = calculatePercentage();

  /**
   * 根据完成度返回状态文本和颜色
   * @returns 状态对象
   */
  const getStatus = (): { text: string; color: string } => {
    if (percentage >= 100) {
      return { text: '已完成', color: 'text-green-600' };
    } else if (percentage >= 75) {
      return { text: '接近完成', color: 'text-blue-600' };
    } else if (percentage >= 50) {
      return { text: '进行中', color: 'text-yellow-600' };
    } else {
      return { text: '刚开始', color: 'text-gray-600' };
    }
  };

  const status = getStatus();

  return (
    <div className="w-full">
      {/* 顶部信息行 */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          {/* 进度条标签 */}
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {/* 状态标签 */}
          <span className={`text-xs ${status.color}`}>
            {status.text}
          </span>
        </div>

        {/* 数值显示 */}
        <div className="flex items-center space-x-3">
          {showValues && (
            <span className="text-sm text-gray-600">
              {current} / {target}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-semibold text-gray-800">
              {percentage}%
            </span>
          )}
        </div>
      </div>

      {/* 进度条容器 */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        {/* 进度条填充 */}
        <div
          className={`h-full ${color} rounded-full transition-all duration-500 ease-out relative`}
          style={{ width: `${percentage}%` }}
        >
          {/* 进度条光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
        </div>
      </div>

      {/* 里程碑标记 (可选) */}
      {target > 0 && (
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs text-gray-400">0</span>
          <span className="text-xs text-gray-400">{target / 2}</span>
          <span className="text-xs text-gray-400">{target}</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
