import { describe, it, expect } from 'bun:test';
import { headersFromRequest } from '../../lib/cookie-utils';

describe('Cookie Utils', () => {
  describe('headersFromRequest', () => {
    it('should convert Fastify request headers to standard Headers', () => {
      const mockRequest = {
        headers: {
          'content-type': 'application/json',
          cookie: 'session=abc123',
          authorization: 'Bearer token123',
        },
        method: 'GET',
        url: '/test',
      };

      const headers = headersFromRequest(mockRequest);

      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('cookie')).toBe('session=abc123');
      expect(headers.get('authorization')).toBe('Bearer token123');
    });

    it('should handle empty headers', () => {
      const mockRequest = {
        headers: {},
        method: 'GET',
        url: '/test',
      };

      const headers = headersFromRequest(mockRequest);

      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get('content-type')).toBeNull();
    });

    it('should handle multiple cookie values', () => {
      const mockRequest = {
        headers: {
          cookie: 'session=abc123; user_id=456; theme=dark',
        },
        method: 'GET',
        url: '/test',
      };

      const headers = headersFromRequest(mockRequest);

      expect(headers.get('cookie')).toBe('session=abc123; user_id=456; theme=dark');
    });
  });
});
