import { describe, it, expect } from 'bun:test'
import { throwIfNull, throwIf, throwIfNot } from '../../lib/exception'
import { ErrorType } from '../../lib/errors'

describe('Exception Utils', () => {
  describe('throwIfNull', () => {
    it('should throw when value is null', () => {
      expect(() => {
        throwIfNull(null, ErrorType.USER_NOT_FOUND)
      }).toThrow('用户不存在')
    })

    it('should throw when value is undefined', () => {
      expect(() => {
        throwIfNull(undefined, ErrorType.USER_NOT_FOUND)
      }).toThrow('用户不存在')
    })

    it('should not throw when value is not null', () => {
      expect(() => {
        throwIfNull('valid value', ErrorType.USER_NOT_FOUND)
      }).not.toThrow()
    })

    it('should not throw when value is not undefined', () => {
      expect(() => {
        throwIfNull(0, ErrorType.USER_NOT_FOUND)
      }).not.toThrow()
    })

    it('should throw with custom message', () => {
      expect(() => {
        throwIfNull(null, ErrorType.USER_NOT_FOUND, 'Custom error message')
      }).toThrow('Custom error message')
    })
  })

  describe('throwIf', () => {
    it('should throw when condition is true', () => {
      expect(() => {
        throwIf(true, ErrorType.USER_ALREADY_EXISTS)
      }).toThrow('用户已存在')
    })

    it('should not throw when condition is false', () => {
      expect(() => {
        throwIf(false, ErrorType.USER_ALREADY_EXISTS)
      }).not.toThrow()
    })

    it('should throw with custom message', () => {
      expect(() => {
        throwIf(true, ErrorType.USER_ALREADY_EXISTS, 'Custom error message')
      }).toThrow('Custom error message')
    })
  })

  describe('throwIfNot', () => {
    it('should throw when condition is false', () => {
      expect(() => {
        throwIfNot(false, ErrorType.FORBIDDEN)
      }).toThrow('无权限访问')
    })

    it('should not throw when condition is true', () => {
      expect(() => {
        throwIfNot(true, ErrorType.FORBIDDEN)
      }).not.toThrow()
    })

    it('should throw with custom message', () => {
      expect(() => {
        throwIfNot(false, ErrorType.FORBIDDEN, 'Custom error message')
      }).toThrow('Custom error message')
    })
  })
})