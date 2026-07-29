import type { TrackVideoJob, TrackVideoTemplate } from '@/types/trackVideo'
import { VIDEO_TEMPLATES } from '@/types/trackVideo'

export interface TimingSummary {
  average: number | null
  p95: number | null
}

export interface TemplateSummary {
  template: TrackVideoTemplate
  label: string
  total: number
  completed: number
  averageTotalMs: number | null
  p95TotalMs: number | null
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

export function summarizeTimings(values: Array<number | null>): TimingSummary {
  const available = values.filter((value): value is number => value !== null)

  if (available.length === 0) {
    return {
      average: null,
      p95: null,
    }
  }

  return {
    average: available.reduce((sum, value) => sum + value, 0) / available.length,
    p95: percentile(available, 95),
  }
}

export function summarizeByTemplate(jobs: TrackVideoJob[]): TemplateSummary[] {
  return VIDEO_TEMPLATES.map(template => {
    const matchingJobs = jobs.filter(job => job.template === template.value)
    const completedJobs = matchingJobs.filter(job => job.status === 'completed')
    const total = summarizeTimings(completedJobs.map(job => job.totalDurationMs))

    return {
      template: template.value,
      label: template.label,
      total: matchingJobs.length,
      completed: completedJobs.length,
      averageTotalMs: total.average,
      p95TotalMs: total.p95,
    }
  })
}
