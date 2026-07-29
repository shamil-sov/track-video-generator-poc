import type { TrackVideoJob, TrackVideoTemplate } from '@/types/trackVideo'
import { VIDEO_TEMPLATES } from '@/types/trackVideo'

export interface TimingSummary {
  average: number | null
  median: number | null
  p95: number | null
  minimum: number | null
  maximum: number | null
}

export interface TemplateSummary {
  template: TrackVideoTemplate
  label: string
  total: number
  completed: number
  failed: number
  averageTotalMs: number | null
  medianTotalMs: number | null
  p95TotalMs: number | null
  averageProcessingMs: number | null
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
      median: null,
      p95: null,
      minimum: null,
      maximum: null,
    }
  }

  return {
    average: available.reduce((sum, value) => sum + value, 0) / available.length,
    median: percentile(available, 50),
    p95: percentile(available, 95),
    minimum: Math.min(...available),
    maximum: Math.max(...available),
  }
}

export function summarizeByTemplate(jobs: TrackVideoJob[]): TemplateSummary[] {
  return VIDEO_TEMPLATES.map(template => {
    const matchingJobs = jobs.filter(job => job.template === template.value)
    const completedJobs = matchingJobs.filter(job => job.status === 'completed')
    const total = summarizeTimings(completedJobs.map(job => job.totalDurationMs))
    const processing = summarizeTimings(completedJobs.map(job => job.processingDurationMs))

    return {
      template: template.value,
      label: template.label,
      total: matchingJobs.length,
      completed: completedJobs.length,
      failed: matchingJobs.filter(job => job.status === 'failed').length,
      averageTotalMs: total.average,
      medianTotalMs: total.median,
      p95TotalMs: total.p95,
      averageProcessingMs: processing.average,
    }
  })
}
