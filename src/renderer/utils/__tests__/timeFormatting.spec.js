import { describe, it, expect } from 'vitest'
import { formatTime } from '../timeFormatting.js'

describe('timeFormatting utilities', () => {
  describe('formatTime', () => {
    it('should format seconds only', () => {
      expect(formatTime(0)).toBe('0s')
      expect(formatTime(1000)).toBe('1s')
      expect(formatTime(45000)).toBe('45s')
      expect(formatTime(59999)).toBe('59s')
    })

    it('should format minutes and seconds', () => {
      expect(formatTime(60000)).toBe('1m 0s')
      expect(formatTime(90000)).toBe('1m 30s')
      expect(formatTime(125000)).toBe('2m 5s')
      expect(formatTime(600000)).toBe('10m 0s')
    })

    it('should handle large times', () => {
      expect(formatTime(3600000)).toBe('60m 0s')
      expect(formatTime(3665000)).toBe('61m 5s')
    })

    it('should round down to nearest second', () => {
      expect(formatTime(1500)).toBe('1s')
      expect(formatTime(1999)).toBe('1s')
      expect(formatTime(2000)).toBe('2s')
    })

    it('should handle zero', () => {
      expect(formatTime(0)).toBe('0s')
    })

    it('should format remainingSeconds correctly', () => {
      expect(formatTime(61000)).toBe('1m 1s')
      expect(formatTime(121000)).toBe('2m 1s')
      expect(formatTime(65000)).toBe('1m 5s')
    })
  })
})
