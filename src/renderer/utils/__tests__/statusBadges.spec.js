import { describe, it, expect } from 'vitest'
import { getStatusBadgeClass, getStatusGroup, groupStatusCodesByHundreds } from '../statusBadges.js'

describe('statusBadges utilities', () => {
  describe('getStatusBadgeClass', () => {
    it('should return s2xx for 2xx status codes', () => {
      expect(getStatusBadgeClass(200)).toBe('s2xx')
      expect(getStatusBadgeClass(201)).toBe('s2xx')
      expect(getStatusBadgeClass(299)).toBe('s2xx')
    })

    it('should return s3xx for 3xx status codes', () => {
      expect(getStatusBadgeClass(300)).toBe('s3xx')
      expect(getStatusBadgeClass(301)).toBe('s3xx')
      expect(getStatusBadgeClass(399)).toBe('s3xx')
    })

    it('should return s4xx for 4xx status codes', () => {
      expect(getStatusBadgeClass(400)).toBe('s4xx')
      expect(getStatusBadgeClass(404)).toBe('s4xx')
      expect(getStatusBadgeClass(499)).toBe('s4xx')
    })

    it('should return s5xx for 5xx status codes', () => {
      expect(getStatusBadgeClass(500)).toBe('s5xx')
      expect(getStatusBadgeClass(503)).toBe('s5xx')
      expect(getStatusBadgeClass(599)).toBe('s5xx')
    })

    it('should return s1xx for 1xx status codes', () => {
      expect(getStatusBadgeClass(100)).toBe('s1xx')
      expect(getStatusBadgeClass(101)).toBe('s1xx')
      expect(getStatusBadgeClass(199)).toBe('s1xx')
    })

    it('should return s1xx for invalid/unknown codes', () => {
      expect(getStatusBadgeClass(0)).toBe('s1xx')
      expect(getStatusBadgeClass(-1)).toBe('s1xx')
    })
  })

  describe('getStatusGroup', () => {
    it('should convert status codes to grouped form', () => {
      expect(getStatusGroup(200)).toBe('2XX')
      expect(getStatusGroup(301)).toBe('3XX')
      expect(getStatusGroup(404)).toBe('4XX')
      expect(getStatusGroup(500)).toBe('5XX')
    })

    it('should handle null and undefined', () => {
      expect(getStatusGroup(null)).toBeNull()
      expect(getStatusGroup(undefined)).toBeNull()
    })

    it('should consistently group codes in same hundred', () => {
      expect(getStatusGroup(200)).toBe(getStatusGroup(204))
      expect(getStatusGroup(404)).toBe(getStatusGroup(400))
    })
  })

  describe('groupStatusCodesByHundreds', () => {
    it('should group status codes by hundreds', () => {
      const result = groupStatusCodesByHundreds([200, 201, 300, 404, 500])

      expect(result).toHaveLength(4)
      expect(result[0].group).toBe('2XX')
      expect(result[0].codes).toContain(200)
      expect(result[0].codes).toContain(201)
    })

    it('should count occurrences correctly', () => {
      const result = groupStatusCodesByHundreds([200, 200, 404, 404, 404])

      const twoxx = result.find(r => r.group === '2XX')
      const fourxx = result.find(r => r.group === '4XX')

      expect(twoxx.count).toBe(2)
      expect(fourxx.count).toBe(3)
    })

    it('should sort groups by hundreds ascending', () => {
      const result = groupStatusCodesByHundreds([500, 200, 404, 301])

      expect(result[0].group).toBe('2XX')
      expect(result[1].group).toBe('3XX')
      expect(result[2].group).toBe('4XX')
      expect(result[3].group).toBe('5XX')
    })

    it('should sort codes within group ascending', () => {
      const result = groupStatusCodesByHundreds([204, 200, 201])

      const twoxx = result.find(r => r.group === '2XX')
      expect(twoxx.codes).toEqual([200, 201, 204])
    })

    it('should filter out null and undefined', () => {
      const result = groupStatusCodesByHundreds([200, null, 404, undefined, 301])

      const groups = result.map(r => r.group)
      expect(groups).toEqual(['2XX', '3XX', '4XX'])
    })

    it('should return empty array for empty input', () => {
      expect(groupStatusCodesByHundreds([])).toEqual([])
    })

    it('should handle single group', () => {
      const result = groupStatusCodesByHundreds([200, 201, 204])

      expect(result).toHaveLength(1)
      expect(result[0].group).toBe('2XX')
      expect(result[0].count).toBe(3)
    })

    it('should deduplicate codes within group', () => {
      const result = groupStatusCodesByHundreds([200, 200, 200, 201])

      const twoxx = result.find(r => r.group === '2XX')
      expect(twoxx.codes).toEqual([200, 201])
    })
  })
})
