import React, { useState, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  List,
  Tag,
  Space,
  message,
  Divider,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import './DailyLog.css';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 每日学习记录数据结构
 */
interface LogEntry {
  // 记录唯一ID
  id: string;
  // 学习日期
  date: string;
  // 学习科目
  subject: string;
  // 学习时长（小时）
  duration: number;
  // 学习内容描述
  content: string;
  // 标签列表
  tags: string[];
  // 创建时间戳
  createdAt: number;
}

/**
 * 表单数据结构
 */
interface LogFormValues {
  // 学习日期（Dayjs 对象）
  date: Dayjs;
  // 学习科目
  subject: string;
  // 学习时长（小时）
  duration: number;
  // 学习内容
  content: string;
  // 标签
  tags: string[];
}

/**
 * DailyLog 每日记录页面组件
 * 用于添加、查看和管理每日学习记录
 */
const DailyLog: React.FC = () => {
  // 表单实例
  const [form] = Form.useForm<LogFormValues>();

  // 学习记录列表状态（模拟数据，实际应从后端或本地存储获取）
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      date: '2026-06-11',
      subject: '前端开发',
      duration: 2.5,
      content: '学习 React Hooks，完成自定义 Hook 练习',
      tags: ['React', 'Hooks'],
      createdAt: Date.now() - 86400000,
    },
    {
      id: '2',
      date: '2026-06-10',
      subject: '算法',
      duration: 1.5,
      content: '刷 LeetCode 动态规划题目 3 道',
      tags: ['算法', '动态规划'],
      createdAt: Date.now() - 172800000,
    },
  ]);

  // 编辑模式状态：当前正在编辑的记录ID，null 表示新增模式
  const [editingId, setEditingId] = useState<string | null>(null);

  // 学科选项（可根据实际需求扩展）
  const subjectOptions = ['前端开发', '后端开发', '算法', '系统设计', '英语', '其他'];

  // 常用标签选项
  const tagOptions = [
    'React',
    'Vue',
    'TypeScript',
    'Node.js',
    '算法',
    '数据结构',
    '设计模式',
    '阅读',
    '实战',
  ];

  /**
   * 按日期降序排序记录列表
   */
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.createdAt - a.createdAt);
  }, [logs]);

  /**
   * 提交表单处理函数
   * @param values - 表单数据
   */
  const handleSubmit = (values: LogFormValues) => {
    const logEntry: LogEntry = {
      id: editingId || `log-${Date.now()}`,
      date: values.date.format('YYYY-MM-DD'),
      subject: values.subject,
      duration: values.duration,
      content: values.content,
      tags: values.tags || [],
      createdAt: editingId
        ? logs.find((log) => log.id === editingId)?.createdAt || Date.now()
        : Date.now(),
    };

    if (editingId) {
      // 编辑模式：更新现有记录
      setLogs((prev) => prev.map((log) => (log.id === editingId ? logEntry : log)));
      message.success('记录更新成功');
      setEditingId(null);
    } else {
      // 新增模式：添加新记录
      setLogs((prev) => [logEntry, ...prev]);
      message.success('记录添加成功');
    }

    // 重置表单
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      duration: 1,
    });
  };

  /**
   * 删除记录
   * @param id - 记录ID
   */
  const handleDelete = (id: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== id));
    message.success('记录已删除');

    // 如果正在编辑该记录，取消编辑模式
    if (editingId === id) {
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
        duration: 1,
      });
    }
  };

  /**
   * 编辑记录：加载记录数据到表单
   * @param log - 要编辑的记录
   */
  const handleEdit = (log: LogEntry) => {
    setEditingId(log.id);
    form.setFieldsValue({
      date: dayjs(log.date),
      subject: log.subject,
      duration: log.duration,
      content: log.content,
      tags: log.tags,
    });
    // 滚动到表单顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * 取消编辑
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      duration: 1,
    });
  };

  /**
   * 根据科目返回对应颜色
   * @param subject - 学科名称
   */
  const getSubjectColor = (subject: string): string => {
    const colorMap: Record<string, string> = {
      前端开发: 'blue',
      后端开发: 'green',
      算法: 'orange',
      系统设计: 'purple',
      英语: 'cyan',
      其他: 'default',
    };
    return colorMap[subject] || 'default';
  };

  return (
    <div className="daily-log-container">
      <h1 className="page-title">每日学习记录</h1>

      {/* 添加/编辑记录表单 */}
      <Card
        className="log-form-card"
        title={editingId ? '编辑记录' : '添加新记录'}
        extra={
          editingId && (
            <Button type="link" onClick={handleCancelEdit}>
              取消编辑
            </Button>
          )
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
            duration: 1,
          }}
        >
          <Form.Item
            label="学习日期"
            name="date"
            rules={[{ required: true, message: '请选择学习日期' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            label="学习科目"
            name="subject"
            rules={[{ required: true, message: '请选择学习科目' }]}
          >
            <Select placeholder="选择学习科目">
              {subjectOptions.map((subject) => (
                <Option key={subject} value={subject}>
                  {subject}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="学习时长（小时）"
            name="duration"
            rules={[
              { required: true, message: '请输入学习时长' },
              { type: 'number', min: 0.1, message: '时长必须大于 0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.1}
              max={24}
              step={0.5}
              precision={1}
            />
          </Form.Item>

          <Form.Item
            label="学习内容"
            name="content"
            rules={[{ required: true, message: '请输入学习内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="描述今天学习的具体内容、收获和心得"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="选择或输入标签" maxTagCount={5}>
              {tagOptions.map((tag) => (
                <Option key={tag} value={tag}>
                  {tag}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              size="large"
              block
            >
              {editingId ? '更新记录' : '添加记录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      {/* 历史记录列表 */}
      <Card className="log-list-card" title="历史记录">
        {sortedLogs.length === 0 ? (
          <Empty description="暂无学习记录" />
        ) : (
          <List
            dataSource={sortedLogs}
            renderItem={(log) => (
              <List.Item
                key={log.id}
                className="log-list-item"
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(log)}
                  >
                    编辑
                  </Button>,
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(log.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={getSubjectColor(log.subject)} icon={<BookOutlined />}>
                        {log.subject}
                      </Tag>
                      <Tag icon={<ClockCircleOutlined />}>{log.duration} 小时</Tag>
                      <span className="log-date">{log.date}</span>
                    </Space>
                  }
                  description={
                    <>
                      <p className="log-content">{log.content}</p>
                      {log.tags.length > 0 && (
                        <Space wrap size="small" className="log-tags">
                          {log.tags.map((tag, index) => (
                            <Tag key={index} color="default">
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default DailyLog;
