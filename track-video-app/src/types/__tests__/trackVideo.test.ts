import { describe, expect, it } from 'vitest'
import { fallbackTemplateName } from '@/types/trackVideo'

describe('fallbackTemplateName', () => {
  it('makes an unknown historic template ID readable', () => {
    expect(fallbackTemplateName('future-template')).toBe('Future Template')
    expect(fallbackTemplateName('3d-style')).toBe('3D Style')
  })
})
