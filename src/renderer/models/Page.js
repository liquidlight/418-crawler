/**
 * Page data model representing a crawled page
 */
export class Page {
  constructor(url, options = {}) {
    this.url = url
    this.normalizedUrl = options.normalizedUrl || url
    this.domain = options.domain || ''
    this.statusCode = options.statusCode || null
    this.errorMessage = options.errorMessage || null
    this.title = options.title || ''
    this.metaDescription = options.metaDescription || ''
    this.h1 = options.h1 || ''
    this.fileType = options.fileType || 'other'
    this.contentType = options.contentType || ''
    this.responseTime = options.responseTime || 0
    this.size = options.size || 0
    this.outLinks = options.outLinks || []
    this.inLinks = options.inLinks || []
    this.externalLinks = options.externalLinks || []
    this.assets = options.assets || []
    this.isCrawled = options.isCrawled !== undefined ? options.isCrawled : false
    this.isExternal = options.isExternal !== undefined ? options.isExternal : false
    this.depth = options.depth || 0
    this.crawledAt = options.crawledAt || null
  }

  /**
   * Creates a page instance from a database object
   */
  static fromDB(obj) {
    return new Page(obj.url, obj)
  }

  /**
   * Converts to a database-storable object
   */
  toJSON() {
    return {
      url: this.url,
      normalizedUrl: this.normalizedUrl,
      domain: this.domain,
      statusCode: this.statusCode,
      errorMessage: this.errorMessage,
      title: this.title,
      metaDescription: this.metaDescription,
      h1: this.h1,
      fileType: this.fileType,
      contentType: this.contentType,
      responseTime: this.responseTime,
      size: this.size,
      outLinks: this.outLinks,
      inLinks: this.inLinks,
      externalLinks: this.externalLinks,
      assets: this.assets,
      isCrawled: this.isCrawled,
      isExternal: this.isExternal,
      depth: this.depth,
      crawledAt: this.crawledAt
    }
  }
}
