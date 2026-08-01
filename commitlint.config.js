module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档变更
        'style',    // 代码格式（不影响代码运行）
        'refactor', // 重构（既不是新功能也不是修复）
        'perf',     // 性能优化
        'test',     // 测试
        'chore',    // 构建过程或辅助工具变更
        'ci',       // CI/CD 变更
        'build',    // 构建系统或外部依赖变更
      ],
    ],
    'subject-case': [0], // 不强制 subject 大小写
  },
};
