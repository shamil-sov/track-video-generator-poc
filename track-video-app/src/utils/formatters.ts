export function formatDuration(milliseconds: number | null, empty = '—'): string {
  if (milliseconds === null || Number.isNaN(milliseconds)) {
    return empty
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)} ms`
  }

  const seconds = milliseconds / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`
}

export function formatTrackDuration(seconds: number | null | undefined): string {
  if (seconds == null) {
    return '—'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatRelativeDate(value: string): string {
  const differenceMs = new Date(value).getTime() - Date.now()
  const absoluteSeconds = Math.abs(differenceMs) / 1000
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absoluteSeconds < 60) {
    return formatter.format(Math.round(differenceMs / 1000), 'second')
  }
  if (absoluteSeconds < 3600) {
    return formatter.format(Math.round(differenceMs / 60000), 'minute')
  }
  if (absoluteSeconds < 86400) {
    return formatter.format(Math.round(differenceMs / 3600000), 'hour')
  }

  return formatter.format(Math.round(differenceMs / 86400000), 'day')
}
