import type {
  TrackVideoJob,
  TrackVideoTemplate,
  VideoTemplateCatalogueItem,
} from '@/types/trackVideo'
import { fallbackTemplateName } from '@/types/trackVideo'

export interface TimingSummary {
  average: number | null
  p95: number | null
}

export interface TemplateSummary {
  template: TrackVideoTemplate
  label: string
  exampleVideoUrl: string | null
  total: number
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

export function summarizeByTemplate(
  jobs: TrackVideoJob[],
  templates: VideoTemplateCatalogueItem[],
): TemplateSummary[] {
  const knownIds = new Set(templates.map(template => template.id))
  const historicTemplates = jobs
    .map(job => job.template)
    .filter((template, index, values) => (
      !knownIds.has(template) && values.indexOf(template) === index
    ))
    .map(template => ({
      id: template,
      name: fallbackTemplateName(template),
      exampleVideoUrls: [],
    }))

  return [...templates, ...historicTemplates].map(template => {
    const matchingJobs = jobs.filter(job => job.template === template.id)
    const completedJobs = matchingJobs.filter(job => job.status === 'completed')
    const total = summarizeTimings(completedJobs.map(job => job.totalDurationMs))

    return {
      template: template.id,
      label: template.name,
      exampleVideoUrl: template.exampleVideoUrls[0] || null,
      total: matchingJobs.length,
      averageTotalMs: total.average,
      p95TotalMs: total.p95,
    }
  })
}
