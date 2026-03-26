// lint-staged.config.js
import path from 'node:path'

export default {
  // JS/TS/JSON 文件（排除不需要的目录和 .d.ts 文件）
  '*.{js,jsx,ts,tsx,json}': (filenames) => {
    const filteredFiles = filenames.filter(
        (f) =>
            !f.includes('src-tauri/') &&
            !f.includes('public/') &&
            !f.endsWith('.d.ts') &&
            !f.includes('.vscode/')
    )
    return filteredFiles.length > 0
        ? `biome check --write --unsafe ${filteredFiles
            .map((f) => path.relative(process.cwd(), f))
            .join(' ')}`
        : 'echo "No JS/TS/JSON files to check"'
  },

  // Vue 文件：先用 Biome 修复，再用 Prettier 格式化
  '*.vue': (filenames) => {
    if (filenames.length === 0) return 'echo "No Vue files to check"'

    const relativeFiles = filenames.map((f) => path.relative(process.cwd(), f)).join(' ')
    return [
      `biome check --write --unsafe ${relativeFiles}`,
      `prettier --write ${relativeFiles}`
    ]
  },

  // Rust 文件：使用 cargo fmt
  'src-tauri/**/*.rs': () => 'cargo fmt --manifest-path src-tauri/Cargo.toml'
}