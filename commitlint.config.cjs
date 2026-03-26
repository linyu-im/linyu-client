/** @type {import('cz-git').UserConfig} */

const fs = require('fs')
const path = require('path')

function getScopes() {
    const srcPath = path.resolve(__dirname, 'src')

    let dirs = []
    if (fs.existsSync(srcPath)) {
        dirs = fs
            .readdirSync(srcPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name.replace(/s$/, ''))
    }

    return [...dirs]
}

const scopes = getScopes()

module.exports = {
    extends: ['@commitlint/config-conventional'],

    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'perf',
                'test',
                'build',
                'ci',
                'revert',
                'chore'
            ]
        ],
        'scope-empty': [1, 'never'],
        'subject-empty': [2, 'never'],
        'header-max-length': [2, 'always', 120],
        'subject-case': [0]
    },

    prompt: {
        messages: {
            type: '选择提交类型:',
            scope: '选择影响范围（可选）:',
            customScope: '输入自定义 scope:',
            subject: '填写简短描述:\n',
            body: '详细描述（可选，使用 "|" 换行）:\n',
            breaking: '破坏性变更（可选）:\n',
            footer: '关联 issue（可选，例如: #123）:\n',
            confirmCommit: '确认提交？'
        },

        types: [
            { value: 'feat', name: 'feat: 新功能' },
            { value: 'fix', name: 'fix: 修复问题' },
            { value: 'docs', name: 'docs: 文档' },
            { value: 'style', name: 'style: 格式调整' },
            { value: 'refactor', name: 'refactor: 重构' },
            { value: 'perf', name: 'perf: 性能优化' },
            { value: 'test', name: 'test: 测试' },
            { value: 'build', name: 'build: 构建/依赖' },
            { value: 'ci', name: 'ci: CI/CD' },
            { value: 'revert', name: 'revert: 回退' },
            { value: 'chore', name: 'chore: 杂项' }
        ],

        scopes,

        allowCustomScopes: true,
        allowEmptyScopes: true,

        useEmoji: false,

        useAI: false,
        breaklineNumber: 100,
        breaklineChar: '|',
        maxHeaderLength: 120,
        allowBreakingChanges: ['feat', 'fix'],

        issuePrefixes: [
            { value: 'close', name: 'close: 关闭 issue' },
            { value: 'fix', name: 'fix: 修复 issue' }
        ],

        defaultSubject: '',
        defaultBody: '',
        defaultIssues: ''
    }
}