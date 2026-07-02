// IPC 通道名常量：主进程、preload 与测试共享，避免字符串漂移。
export const IPC = {
  // 获取学习目录配置。
  GET_STUDY_PATH: 'visual-learn:get-study-path',
  // 保存学习目录配置。
  SET_STUDY_PATH: 'visual-learn:set-study-path',
  // 获取 VSCode 打开目录配置。
  GET_VSCODE_PATH: 'visual-learn:get-vscode-path',
  // 保存 VSCode 打开目录配置。
  SET_VSCODE_PATH: 'visual-learn:set-vscode-path',
  // 扫描学习资料。
  SCAN_STUDY_NOTES: 'visual-learn:scan-study-notes',
  // 读取 Markdown 内容。
  READ_MD_CONTENT: 'visual-learn:read-md-content',
  // 获取学习进度。
  GET_PROGRESS: 'visual-learn:get-progress',
  // 设置学习进度。
  SET_PROGRESS: 'visual-learn:set-progress',
  // 获取轻量偏好。
  GET_PREFERENCE: 'visual-learn:get-preference',
  // 设置轻量偏好。
  SET_PREFERENCE: 'visual-learn:set-preference',
  // 用 VSCode 打开路径。
  OPEN_IN_VSCODE: 'visual-learn:open-in-vscode',
  // 打开系统目录选择器。
  SELECT_DIRECTORY: 'visual-learn:select-directory',
};
