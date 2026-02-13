import { describe, it, expect } from 'vitest'

/**
 * Match a cookie to a request URL based on domain and path
 * Extracted from proxy.cjs for testing
 */
function matchCookieToRequest(cookie, requestUrl) {
  try {
    const url = new URL(requestUrl)
    const requestHost = url.hostname
    const requestPath = url.pathname

    // Domain matching
    const cookieDomain = cookie.domain.startsWith('.')
      ? cookie.domain.substring(1)
      : cookie.domain
    const domainMatch = requestHost === cookieDomain || requestHost.endsWith('.' + cookieDomain)

    // Path matching
    const cookiePath = cookie.path || '/'
    const pathMatch = requestPath.startsWith(cookiePath)

    return domainMatch && pathMatch
  } catch (error) {
    console.error('Error matching cookie:', error)
    return false
  }
}

describe('Cookie Matching Logic', () => {
  describe('Domain Matching', () => {
    it('matches exact domain', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'https://example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches domain with leading dot to exact domain', () => {
      const cookie = { domain: '.example.com', path: '/' }
      const url = 'https://example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches domain with leading dot to subdomain', () => {
      const cookie = { domain: '.example.com', path: '/' }
      const url = 'https://staging.example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches domain with leading dot to deep subdomain', () => {
      const cookie = { domain: '.example.com', path: '/' }
      const url = 'https://api.staging.example.com/endpoint'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches exact subdomain', () => {
      const cookie = { domain: 'staging.example.com', path: '/' }
      const url = 'https://staging.example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('does not match different domain', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'https://other.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('does not match partial domain name', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'https://notexample.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('does not match when cookie domain is more specific than request', () => {
      const cookie = { domain: 'staging.example.com', path: '/' }
      const url = 'https://example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('matches localhost', () => {
      const cookie = { domain: 'localhost', path: '/' }
      const url = 'http://localhost:3000/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches IP addresses', () => {
      const cookie = { domain: '192.168.1.1', path: '/' }
      const url = 'http://192.168.1.1/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('does not match different subdomains', () => {
      const cookie = { domain: 'staging.example.com', path: '/' }
      const url = 'https://production.example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })
  })

  describe('Path Matching', () => {
    it('matches exact path', () => {
      const cookie = { domain: 'example.com', path: '/app' }
      const url = 'https://example.com/app'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches path prefix', () => {
      const cookie = { domain: 'example.com', path: '/app' }
      const url = 'https://example.com/app/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches deep nested path', () => {
      const cookie = { domain: 'example.com', path: '/app' }
      const url = 'https://example.com/app/admin/settings'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('defaults to root path when not specified', () => {
      const cookie = { domain: 'example.com' }
      const url = 'https://example.com/any/path'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('does not match different path', () => {
      const cookie = { domain: 'example.com', path: '/app' }
      const url = 'https://example.com/other'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('does not match partial path component', () => {
      const cookie = { domain: 'example.com', path: '/app/' }
      const url = 'https://example.com/application'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('matches root path to all paths', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'https://example.com/any/nested/path'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches path with query parameters', () => {
      const cookie = { domain: 'example.com', path: '/app' }
      const url = 'https://example.com/app/page?id=123'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('matches path with hash fragment', () => {
      const cookie = { domain: 'example.com', path: '/app' }
      const url = 'https://example.com/app/page#section'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })
  })

  describe('Combined Domain and Path Matching', () => {
    it('matches when both domain and path match', () => {
      const cookie = { domain: 'staging.example.com', path: '/admin' }
      const url = 'https://staging.example.com/admin/users'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('does not match when domain matches but path does not', () => {
      const cookie = { domain: 'example.com', path: '/admin' }
      const url = 'https://example.com/public'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('does not match when path matches but domain does not', () => {
      const cookie = { domain: 'example.com', path: '/admin' }
      const url = 'https://other.com/admin'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('handles complex real-world scenario', () => {
      const cookie = { domain: '.example.com', path: '/api/v2' }
      const url = 'https://api.staging.example.com/api/v2/users'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles invalid URL gracefully', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'not a valid url'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('handles empty cookie domain', () => {
      const cookie = { domain: '', path: '/' }
      const url = 'https://example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('handles empty path', () => {
      const cookie = { domain: 'example.com', path: '' }
      const url = 'https://example.com/page'

      // Empty path defaults to '/' in the || operator, so it matches
      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('handles missing path property (defaults to /)', () => {
      const cookie = { domain: 'example.com' }
      const url = 'https://example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('handles URL with port number', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'https://example.com:8080/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('handles URL with authentication', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const url = 'https://user:pass@example.com/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })

    it('is case-sensitive for domain', () => {
      const cookie = { domain: 'Example.com', path: '/' }
      const url = 'https://example.com/page'

      // URLs normalize domains to lowercase, so this should not match
      expect(matchCookieToRequest(cookie, url)).toBe(false)
    })

    it('handles trailing slash in path', () => {
      const cookie = { domain: 'example.com', path: '/app/' }
      const url = 'https://example.com/app/page'

      expect(matchCookieToRequest(cookie, url)).toBe(true)
    })
  })

  describe('Security Considerations', () => {
    it('prevents cookie leakage to external domain', () => {
      const cookie = { domain: 'staging.example.com', path: '/' }
      const externalUrl = 'https://evil.com/page'

      expect(matchCookieToRequest(cookie, externalUrl)).toBe(false)
    })

    it('prevents cookie leakage to similar domain name', () => {
      const cookie = { domain: 'example.com', path: '/' }
      const similarUrl = 'https://fake-example.com/page'

      expect(matchCookieToRequest(cookie, similarUrl)).toBe(false)
    })

    it('prevents cookie leakage between different subdomains', () => {
      const cookie = { domain: 'staging.example.com', path: '/' }
      const productionUrl = 'https://production.example.com/page'

      expect(matchCookieToRequest(cookie, productionUrl)).toBe(false)
    })

    it('allows wildcard domain cookie to all subdomains', () => {
      const cookie = { domain: '.example.com', path: '/' }
      const urls = [
        'https://example.com/page',
        'https://staging.example.com/page',
        'https://api.staging.example.com/page',
        'https://www.example.com/page'
      ]

      urls.forEach(url => {
        expect(matchCookieToRequest(cookie, url)).toBe(true)
      })
    })

    it('restricts path-specific cookies correctly', () => {
      const cookie = { domain: 'example.com', path: '/admin' }
      const publicUrl = 'https://example.com/public/page'

      expect(matchCookieToRequest(cookie, publicUrl)).toBe(false)
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles typical session cookie', () => {
      const sessionCookie = {
        domain: '.example.com',
        path: '/',
        name: 'sessionid',
        value: 'abc123'
      }

      const urls = [
        'https://example.com/',
        'https://www.example.com/login',
        'https://staging.example.com/dashboard',
        'https://api.example.com/users'
      ]

      urls.forEach(url => {
        expect(matchCookieToRequest(sessionCookie, url)).toBe(true)
      })
    })

    it('handles auth token for specific subdomain', () => {
      const authCookie = {
        domain: 'staging.example.com',
        path: '/api',
        name: 'auth_token',
        value: 'token123'
      }

      expect(matchCookieToRequest(authCookie, 'https://staging.example.com/api/users')).toBe(true)
      expect(matchCookieToRequest(authCookie, 'https://staging.example.com/public')).toBe(false)
      expect(matchCookieToRequest(authCookie, 'https://production.example.com/api/users')).toBe(false)
    })

    it('handles CSRF token on specific path', () => {
      const csrfCookie = {
        domain: 'example.com',
        path: '/admin',
        name: 'csrf_token',
        value: 'csrf123'
      }

      expect(matchCookieToRequest(csrfCookie, 'https://example.com/admin/settings')).toBe(true)
      expect(matchCookieToRequest(csrfCookie, 'https://example.com/admin')).toBe(true)
      expect(matchCookieToRequest(csrfCookie, 'https://example.com/')).toBe(false)
    })
  })
})
