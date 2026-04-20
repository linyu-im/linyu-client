export function formatTime(timeStr: string): string {
  const inputDate = new Date(timeStr.replace(/-/g, '/'))
  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfInputDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate())

  const diffDays = Math.floor((startOfToday.getTime() - startOfInputDay.getTime()) / (24 * 60 * 60 * 1000))

  const pad = (n: number) => String(n).padStart(2, '0')
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
