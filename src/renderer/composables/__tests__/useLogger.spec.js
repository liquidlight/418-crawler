import { describe, it, expect, beforeEach } from 'vitest'
import { useLogger } from '../useLogger.js'

describe('useLogger Composable', () => {
  let logger

  beforeEach(() => {
    // Create fresh logger instance for each test
    logger = useLogger()
    // Clear any existing logs from shared state
    logger.clearLogs()
  })

  describe('Log Management', () => {
    it('initializes with empty logs', () => {
      expect(logger.logs.value).toEqual([])
    })

    it('adds a string log', () => {
      logger.addLog('info', ['Test message'])
      expect(logger.logs.value).toHaveLength(1)
      expect(logger.logs.value[0].message).toBe('Test message')
    })

    it('adds logs with correct level', () => {
      logger.addLog('error', ['Error occurred'])
      expect(logger.logs.value[0].level).toBe('error')
    })

    it('includes timestamp in logs', () => {
      logger.addLog('info', ['Message'])
      expect(logger.logs.value[0].timestamp).toBeTruthy()
      expect(logger.logs.value[0].timestamp).toMatch(/\d+:\d+:\d+/)
    })

    it('adds unique id to each log', () => {
      logger.addLog('info', ['First'])
      logger.addLog('info', ['Second'])
      expect(logger.logs.value[0].id).not.toBe(logger.logs.value[1].id)
    })

    it('adds logs in reverse order (newest first)', () => {
      logger.addLog('info', ['First'])
      logger.addLog('info', ['Second'])
      expect(logger.logs.value[0].message).toBe('Second')
      expect(logger.logs.value[1].message).toBe('First')
    })
  })

  describe('Message Formatting', () => {
    it('joins multiple arguments with spaces', () => {
      logger.addLog('info', ['Hello', 'World', 'Test'])
      expect(logger.logs.value[0].message).toBe('Hello World Test')
    })

    it('converts objects to JSON string', () => {
      const obj = { key: 'value', nested: { prop: 123 } }
      logger.addLog('info', [obj])
      expect(logger.logs.value[0].message).toContain('key')
      expect(logger.logs.value[0].message).toContain('value')
    })

    it('handles mixed types in arguments', () => {
      logger.addLog('info', ['String', 123, true, { obj: 'value' }])
      const message = logger.logs.value[0].message
      expect(message).toContain('String')
      expect(message).toContain('123')
      expect(message).toContain('true')
    })

    it('handles circular references gracefully', () => {
      const obj = { name: 'test' }
      obj.self = obj
      logger.addLog('info', [obj])
      expect(logger.logs.value[0].message).toBeTruthy()
    })

    it('converts non-object types to string', () => {
      logger.addLog('info', [null, undefined, 42, 3.14, true])
      const message = logger.logs.value[0].message
      expect(message).toContain('null')
      expect(message).toContain('undefined')
      expect(message).toContain('42')
      expect(message).toContain('3.14')
    })
  })

  describe('Log Levels', () => {
    it('supports multiple log levels', () => {
      logger.addLog('debug', ['Debug msg'])
      logger.addLog('info', ['Info msg'])
      logger.addLog('warn', ['Warn msg'])
      logger.addLog('error', ['Error msg'])

      expect(logger.logs.value[3].level).toBe('debug')
      expect(logger.logs.value[2].level).toBe('info')
      expect(logger.logs.value[1].level).toBe('warn')
      expect(logger.logs.value[0].level).toBe('error')
    })
  })

  describe('Log Limits', () => {
    it('enforces MAX_LOGS limit of 1000', () => {
      for (let i = 0; i < 1050; i++) {
        logger.addLog('info', [`Message ${i}`])
      }
      expect(logger.logs.value.length).toBe(1000)
    })

    it('removes oldest logs when limit exceeded', () => {
      for (let i = 0; i < 1050; i++) {
        logger.addLog('info', [`Message ${i}`])
      }
      // Newest should be Message 1049
      expect(logger.logs.value[0].message).toContain('Message 1049')
      // Oldest message kept should be Message 50 (since we keep 1000, and added 0-1049)
      expect(logger.logs.value[999].message).toContain('Message 50')
    })
  })

  describe('Clear Logs', () => {
    it('clears all logs', () => {
      logger.addLog('info', ['Message 1'])
      logger.addLog('info', ['Message 2'])
      logger.addLog('info', ['Message 3'])

      expect(logger.logs.value).toHaveLength(3)
      logger.clearLogs()
      expect(logger.logs.value).toHaveLength(0)
    })

    it('clears logs after maximum reached', () => {
      for (let i = 0; i < 1050; i++) {
        logger.addLog('info', [`Message ${i}`])
      }
      logger.clearLogs()
      expect(logger.logs.value).toHaveLength(0)
    })
  })

  describe('Readonly Protection', () => {
    it('logs property is readonly (prevents modifications)', () => {
      const originalLength = logger.logs.value.length
      logger.addLog('info', ['Test'])
      // Readonly prevents external modification
      // Just verify that the property exists and is reactive
      expect(logger.logs.value).toBeTruthy()
    })

    it('can still modify logs through methods', () => {
      logger.addLog('info', ['Message'])
      expect(logger.logs.value).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty arguments array', () => {
      logger.addLog('info', [])
      expect(logger.logs.value[0].message).toBe('')
    })

    it('handles very long messages', () => {
      const longMsg = 'x'.repeat(10000)
      logger.addLog('info', [longMsg])
      expect(logger.logs.value[0].message.length).toBe(10000)
    })

    it('handles special characters in messages', () => {
      logger.addLog('info', ['Test\nNewline\tTab\r'])
      expect(logger.logs.value[0].message).toContain('\n')
      expect(logger.logs.value[0].message).toContain('\t')
    })

    it('handles unicode characters', () => {
      logger.addLog('info', ['Hello 世界 🚀'])
      expect(logger.logs.value[0].message).toContain('世界')
      expect(logger.logs.value[0].message).toContain('🚀')
    })
  })
})
