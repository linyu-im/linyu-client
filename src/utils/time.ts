const pad = (n: number) => String(n).padStart(2, '0')

/** 解析后端时间字符串（兼容 ISO 8601） */
export function parseBackendTime(timeStr: string): Date {
  if (!timeStr) return new Date(Number.NaN)
  if (timeStr.includes('T')) return new Date(timeStr)
  return new Date(timeStr.replace(/-/g, '/'))
}

export function nowBackendDatetime(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function formatTime(timeStr: string): string {
  const inputDate = parseBackendTime(timeStr)
  if (Number.isNaN(inputDate.getTime())) return ''

  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfInputDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate())

  const diffDays = Math.floor((startOfToday.getTime() - startOfInputDay.getTime()) / (24 * 60 * 60 * 1000))

  const time = `${pad(inputDate.getHours())}:${pad(inputDate.getMinutes())}`

  const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const week = weekMap[inputDate.getDay()]

  if (diffDays === 0) {
    return time
  }

  if (diffDays === 1) {
    return `昨天 ${time}`
  }

  if (diffDays > 1 && diffDays <= 6) {
    return `${week} ${time}`
  }

  const y = inputDate.getFullYear()
  const m = pad(inputDate.getMonth() + 1)
  const d = pad(inputDate.getDate())

  return `${y}/${m}/${d}`
}
