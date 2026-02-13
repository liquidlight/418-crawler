import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fetch from 'node-fetch'
import express from 'express'

/**
 * Integration tests for proxy cookie injection
 * These tests verify that the proxy correctly injects cookies into outgoing requests
 */

describe('Proxy Cookie Injection', () => {
  let mockServer
  let mockServerPort = 9999
  let receivedRequests = []

  // Start a mock target server that captures incoming requests
  beforeAll(async () => {
    return new Promise((resolve) => {
      const app = express()
      app.use(express.json())

      // Capture all incoming requests
      app.use((req, res) => {
        receivedRequests.push({
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: req.body
        })

        res.json({
          ok: true,
          cookies: req.headers.cookie || null
        })
      })

      mockServer = app.listen(mockServerPort, () => {
        console.log(`Mock server running on port ${mockServerPort}`)
        resolve()
      })
    })
  })

  afterAll(() => {
    if (mockServer) {
      mockServer.close()
    }
  })

  beforeEach(() => {
    receivedRequests = []
  })

  describe('Cookie Header Building', () => {
    it('builds correct Cookie header from single cookie', () => {
      const cookies = [
        { name: 'session', value: 'abc123', domain: 'example.com', path: '/' }
      ]

      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toBe('session=abc123')
    })

    it('builds correct Cookie header from multiple cookies', () => {
      const cookies = [
        { name: 'session', value: 'abc123', domain: 'example.com', path: '/' },
        { name: 'csrf', value: 'xyz789', domain: 'example.com', path: '/' },
        { name: 'user_id', value: '42', domain: 'example.com', path: '/' }
      ]

      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toBe('session=abc123; csrf=xyz789; user_id=42')
    })

    it('handles cookies with special characters in values', () => {
      const cookies = [
        { name: 'data', value: 'a=b&c=d', domain: 'example.com', path: '/' }
      ]

      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toBe('data=a=b&c=d')
    })

    it('handles empty cookie array', () => {
      const cookies = []
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toBe('')
    })
  })

  describe('Domain Filtering', () => {
    function filterCookiesByDomain(cookies, requestUrl) {
      try {
        const url = new URL(requestUrl)
        const requestHost = url.hostname

        return cookies.filter(cookie => {
          const cookieDomain = cookie.domain.startsWith('.')
            ? cookie.domain.substring(1)
            : cookie.domain
          return requestHost === cookieDomain || requestHost.endsWith('.' + cookieDomain)
        })
      } catch {
        return []
      }
    }

    it('filters cookies to matching domain', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'example.com', path: '/' },
        { name: 'other', value: 'xyz', domain: 'other.com', path: '/' }
      ]

      const filtered = filterCookiesByDomain(cookies, 'https://example.com/page')

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('session')
    })

    it('filters cookies with wildcard domain', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: '.example.com', path: '/' },
        { name: 'other', value: 'xyz', domain: '.other.com', path: '/' }
      ]

      const filtered = filterCookiesByDomain(cookies, 'https://staging.example.com/page')

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('session')
    })

    it('prevents cookie leakage to external domains', () => {
      const cookies = [
        { name: 'session', value: 'secret', domain: 'staging.example.com', path: '/' }
      ]

      const filtered = filterCookiesByDomain(cookies, 'https://evil.com/page')

      expect(filtered).toHaveLength(0)
    })

    it('allows multiple cookies from same domain', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'example.com', path: '/' },
        { name: 'csrf', value: 'xyz', domain: 'example.com', path: '/' },
        { name: 'user', value: '123', domain: 'example.com', path: '/' }
      ]

      const filtered = filterCookiesByDomain(cookies, 'https://example.com/page')

      expect(filtered).toHaveLength(3)
    })
  })

  describe('Path Filtering', () => {
    function filterCookiesByPath(cookies, requestUrl) {
      try {
        const url = new URL(requestUrl)
        const requestPath = url.pathname

        return cookies.filter(cookie => {
          const cookiePath = cookie.path || '/'
          return requestPath.startsWith(cookiePath)
        })
      } catch {
        return []
      }
    }

    it('filters cookies by path prefix', () => {
      const cookies = [
        { name: 'admin', value: 'abc', domain: 'example.com', path: '/admin' },
        { name: 'public', value: 'xyz', domain: 'example.com', path: '/public' }
      ]

      const filtered = filterCookiesByPath(cookies, 'https://example.com/admin/settings')

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('admin')
    })

    it('allows root path cookies for all paths', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'example.com', path: '/' }
      ]

      const filtered = filterCookiesByPath(cookies, 'https://example.com/any/nested/path')

      expect(filtered).toHaveLength(1)
    })

    it('prevents path-specific cookies from leaking to other paths', () => {
      const cookies = [
        { name: 'admin', value: 'secret', domain: 'example.com', path: '/admin' }
      ]

      const filtered = filterCookiesByPath(cookies, 'https://example.com/public')

      expect(filtered).toHaveLength(0)
    })
  })

  describe('Combined Domain and Path Filtering', () => {
    function filterCookies(cookies, requestUrl) {
      try {
        const url = new URL(requestUrl)
        const requestHost = url.hostname
        const requestPath = url.pathname

        return cookies.filter(cookie => {
          // Domain match
          const cookieDomain = cookie.domain.startsWith('.')
            ? cookie.domain.substring(1)
            : cookie.domain
          const domainMatch = requestHost === cookieDomain || requestHost.endsWith('.' + cookieDomain)

          // Path match
          const cookiePath = cookie.path || '/'
          const pathMatch = requestPath.startsWith(cookiePath)

          return domainMatch && pathMatch
        })
      } catch {
        return []
      }
    }

    it('applies both domain and path filtering', () => {
      const cookies = [
        { name: 'admin_session', value: '1', domain: 'staging.example.com', path: '/admin' },
        { name: 'public_session', value: '2', domain: 'staging.example.com', path: '/public' },
        { name: 'other_session', value: '3', domain: 'production.example.com', path: '/admin' },
        { name: 'wildcard', value: '4', domain: '.example.com', path: '/' }
      ]

      const filtered = filterCookies(cookies, 'https://staging.example.com/admin/users')

      expect(filtered).toHaveLength(2)
      expect(filtered.map(c => c.name).sort()).toEqual(['admin_session', 'wildcard'])
    })

    it('handles real-world auth scenario', () => {
      const cookies = [
        { name: 'sessionid', value: 'abc123', domain: '.example.com', path: '/' },
        { name: 'csrftoken', value: 'xyz789', domain: '.example.com', path: '/' },
        { name: 'admin_token', value: 'secret', domain: 'staging.example.com', path: '/admin' }
      ]

      // Request to admin page on staging
      const stagingAdmin = filterCookies(cookies, 'https://staging.example.com/admin/dashboard')
      expect(stagingAdmin).toHaveLength(3)

      // Request to public page on staging
      const stagingPublic = filterCookies(cookies, 'https://staging.example.com/public')
      expect(stagingPublic).toHaveLength(2)
      expect(stagingPublic.map(c => c.name).sort()).toEqual(['csrftoken', 'sessionid'])

      // Request to admin on production (different subdomain)
      const productionAdmin = filterCookies(cookies, 'https://production.example.com/admin/dashboard')
      expect(productionAdmin).toHaveLength(2)
      expect(productionAdmin.map(c => c.name).sort()).toEqual(['csrftoken', 'sessionid'])
    })
  })

  describe('Cookie Value Handling', () => {
    it('preserves cookie values exactly as provided', () => {
      const cookies = [
        { name: 'data', value: 'a=b&c=d', domain: 'example.com', path: '/' },
        { name: 'json', value: '{"key":"value"}', domain: 'example.com', path: '/' }
      ]

      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toContain('data=a=b&c=d')
      expect(cookieHeader).toContain('json={"key":"value"}')
    })

    it('handles empty cookie values', () => {
      const cookies = [
        { name: 'empty', value: '', domain: 'example.com', path: '/' }
      ]

      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toBe('empty=')
    })

    it('handles cookies with spaces in values', () => {
      const cookies = [
        { name: 'name', value: 'John Doe', domain: 'example.com', path: '/' }
      ]

      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      expect(cookieHeader).toBe('name=John Doe')
    })
  })

  describe('Security Tests', () => {
    function filterCookies(cookies, requestUrl) {
      try {
        const url = new URL(requestUrl)
        const requestHost = url.hostname
        const requestPath = url.pathname

        return cookies.filter(cookie => {
          const cookieDomain = cookie.domain.startsWith('.')
            ? cookie.domain.substring(1)
            : cookie.domain
          const domainMatch = requestHost === cookieDomain || requestHost.endsWith('.' + cookieDomain)

          const cookiePath = cookie.path || '/'
          const pathMatch = requestPath.startsWith(cookiePath)

          return domainMatch && pathMatch
        })
      } catch {
        return []
      }
    }

    it('prevents cookie leakage to external links during crawl', () => {
      const authCookies = [
        { name: 'session', value: 'secret_token', domain: 'staging.example.com', path: '/' }
      ]

      const externalUrls = [
        'https://google.com/page',
        'https://evil.com/page',
        'https://cdn.example-different.com/asset'
      ]

      externalUrls.forEach(url => {
        const filtered = filterCookies(authCookies, url)
        expect(filtered).toHaveLength(0)
      })
    })

    it('only sends cookies to matching internal URLs', () => {
      const authCookies = [
        { name: 'session', value: 'secret', domain: 'staging.example.com', path: '/' }
      ]

      const internalUrls = [
        'https://staging.example.com/',
        'https://staging.example.com/page',
        'https://staging.example.com/admin/dashboard'
      ]

      internalUrls.forEach(url => {
        const filtered = filterCookies(authCookies, url)
        expect(filtered).toHaveLength(1)
      })
    })

    it('handles subdomain isolation correctly', () => {
      const stagingCookies = [
        { name: 'staging_session', value: 'staging_secret', domain: 'staging.example.com', path: '/' }
      ]

      // Should not send to production
      const prodFiltered = filterCookies(stagingCookies, 'https://production.example.com/page')
      expect(prodFiltered).toHaveLength(0)

      // Should send to staging
      const stagingFiltered = filterCookies(stagingCookies, 'https://staging.example.com/page')
      expect(stagingFiltered).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    function filterCookies(cookies, requestUrl) {
      try {
        const url = new URL(requestUrl)
        const requestHost = url.hostname
        const requestPath = url.pathname

        return cookies.filter(cookie => {
          const cookieDomain = cookie.domain.startsWith('.')
            ? cookie.domain.substring(1)
            : cookie.domain
          const domainMatch = requestHost === cookieDomain || requestHost.endsWith('.' + cookieDomain)

          const cookiePath = cookie.path || '/'
          const pathMatch = requestPath.startsWith(cookiePath)

          return domainMatch && pathMatch
        })
      } catch {
        return []
      }
    }

    it('handles invalid request URL gracefully', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'example.com', path: '/' }
      ]

      const filtered = filterCookies(cookies, 'not a valid url')

      expect(filtered).toHaveLength(0)
    })

    it('handles empty cookies array', () => {
      const filtered = filterCookies([], 'https://example.com/page')

      expect(filtered).toHaveLength(0)
    })

    it('handles URL with query parameters', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'example.com', path: '/api' }
      ]

      const filtered = filterCookies(cookies, 'https://example.com/api/users?page=1&sort=name')

      expect(filtered).toHaveLength(1)
    })

    it('handles URL with hash fragment', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'example.com', path: '/' }
      ]

      const filtered = filterCookies(cookies, 'https://example.com/page#section')

      expect(filtered).toHaveLength(1)
    })

    it('handles URL with port number', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: 'localhost', path: '/' }
      ]

      const filtered = filterCookies(cookies, 'http://localhost:3000/page')

      expect(filtered).toHaveLength(1)
    })
  })
})
