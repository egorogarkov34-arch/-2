import type { DashboardData } from '../model/types'

type PdfDocument = Record<string, unknown>

interface PdfDocumentHandle {
  getBlob(callback: (blob: Blob) => void): void
}

interface PdfMakeRuntime {
  vfs?: Record<string, string>
  createPdf(document: PdfDocument): PdfDocumentHandle
}

const number = new Intl.NumberFormat('ru-RU')
const formatMl = (value: number) => `${number.format(Math.round(value))} мл`
const formatDate = (value: number) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(value)

async function loadPdfMake() {
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as PdfMakeRuntime
  const fonts = (fontsModule.default ?? fontsModule) as { pdfMake?: { vfs?: Record<string, string> }; vfs?: Record<string, string> }
  pdfMake.vfs = fonts.pdfMake?.vfs ?? fonts.vfs
  return pdfMake
}

async function downloadPdf(pdfDocument: PdfDocument, filename: string) {
  const pdfMake = await loadPdfMake()
  const blob = await new Promise<Blob>((resolve) => pdfMake.createPdf(pdfDocument).getBlob(resolve))
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename.replace('.pdf', '') })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

const baseDocument = (title: string, generatedAt: number, content: unknown[]): PdfDocument => ({
  pageSize: 'A4',
  pageMargins: [34, 34, 34, 38],
  defaultStyle: { font: 'Roboto', fontSize: 9, color: '#17212b' },
  footer: (currentPage: number, pageCount: number) => ({ text: `Aquora Water · ${currentPage} / ${pageCount}`, alignment: 'center', color: '#7a8794', fontSize: 8, margin: [0, 8, 0, 0] }),
  content: [
    { text: 'AQUORA WATER', color: '#237fea', bold: true, characterSpacing: 1.4, fontSize: 10 },
    { text: title, bold: true, fontSize: 21, margin: [0, 6, 0, 5] },
    { text: `Сформировано: ${formatDate(generatedAt)}`, color: '#687582', margin: [0, 0, 0, 18] },
    ...content,
  ],
})

const tableLayout = { hLineColor: () => '#dce4eb', vLineColor: () => '#dce4eb', paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 5, paddingBottom: () => 5 }

export async function exportAdminStatisticsPdf(data: DashboardData) {
  const { metrics } = data
  const content = [
    { text: 'Сводные показатели', bold: true, fontSize: 13, margin: [0, 0, 0, 8] },
    {
      table: {
        widths: ['*', '*'],
        body: [
          ['Пользователи', number.format(metrics.totalUsers)], ['Активны сегодня', number.format(metrics.activeToday)],
          ['Активны за 7 дней', number.format(metrics.activeWeek)], ['Заблокированы', number.format(metrics.blockedUsers)],
          ['Выпито сегодня', formatMl(metrics.totalTodayAmount)], ['Среднее за сегодня', formatMl(metrics.averageTodayAmount)],
          ['Средняя цель', formatMl(metrics.averageGoal)], ['Всего за историю', formatMl(metrics.trackedTotalAmount)],
          ['Дней с записями', number.format(metrics.trackedDays)], ['Выполнено целей', `${metrics.goalCompletionRate}%`],
          ['Напоминания включены', number.format(metrics.remindersEnabled)], ['Целей достигнуто сегодня', number.format(metrics.goalsReachedToday)],
        ],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 18],
    },
    { text: 'Краткая таблица пользователей', bold: true, fontSize: 13, margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 56, 55, 45, 49],
        body: [
          [{ text: 'Пользователь', bold: true }, { text: 'Сегодня', bold: true }, { text: 'Цель', bold: true }, { text: 'Прогресс', bold: true }, { text: 'Статус', bold: true }],
          ...data.users.map((user) => [user.name, formatMl(user.todayAmount), formatMl(user.goal), `${user.progress}%`, user.blocked ? 'Заблокирован' : 'Активен']),
        ],
      },
      layout: tableLayout,
    },
  ]
  await downloadPdf(baseDocument('Отчёт по пользователям', data.generatedAt, content), `aquora-analytics-${new Date(data.generatedAt).toISOString().slice(0, 10)}.pdf`)
}

export async function exportUserListPdf(data: DashboardData) {
  const content = [
    { text: `Всего пользователей: ${number.format(data.users.length)}`, fontSize: 11, margin: [0, 0, 0, 10] },
    {
      table: {
        headerRows: 1,
        widths: [28, '*', 58, 54, 45, 54],
        body: [
          [{ text: 'ID', bold: true }, { text: 'Пользователь', bold: true }, { text: 'Цель', bold: true }, { text: 'Сегодня', bold: true }, { text: 'Язык', bold: true }, { text: 'Статус', bold: true }],
          ...data.users.map((user) => [String(user.id), user.name, formatMl(user.goal), formatMl(user.todayAmount), user.language.toUpperCase(), user.blocked ? 'Заблокирован' : 'Активен']),
        ],
      },
      layout: tableLayout,
    },
  ]
  await downloadPdf(baseDocument('Список пользователей', data.generatedAt, content), `aquora-users-${new Date(data.generatedAt).toISOString().slice(0, 10)}.pdf`)
}
