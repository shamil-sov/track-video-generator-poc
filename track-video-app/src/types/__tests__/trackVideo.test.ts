import { describe, expect, it } from 'vitest'
import { VIDEO_TEMPLATES } from '@/types/trackVideo'

describe('VIDEO_TEMPLATES', () => {
  it('places Vinyl Sleeve immediately after Vinyl', () => {
    const templateIds = VIDEO_TEMPLATES.map(template => template.value)
    const vinylIndex = templateIds.indexOf('vinyl-orbit')

    expect(templateIds.slice(vinylIndex, vinylIndex + 2)).toEqual([
      'vinyl-orbit',
      'vinyl-sleeve',
    ])
  })
})
