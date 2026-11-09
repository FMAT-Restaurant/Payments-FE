import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob, filenameFromContentDisposition } from './download'

describe('filenameFromContentDisposition', () => {
  it('reads quoted, bare and UTF-8 names and falls back otherwise', () => {
    expect(filenameFromContentDisposition('attachment; filename="ventas.csv"', 'x.csv')).toBe('ventas.csv')
    expect(filenameFromContentDisposition('attachment; filename=ventas.csv', 'x.csv')).toBe('ventas.csv')
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''ventas%20sep.csv", 'x.csv')).toBe('ventas sep.csv')
    expect(filenameFromContentDisposition(null, 'x.csv')).toBe('x.csv')
    expect(filenameFromContentDisposition('attachment', 'x.csv')).toBe('x.csv')
  })
})

describe('downloadBlob', () => {
  afterEach(() => vi.restoreAllMocks())

  it('clicks a temporary link with the file name and releases the object URL', () => {
    const create = vi.fn(() => 'blob:fake')
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }))
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })

    downloadBlob(new Blob(['a']), 'ventas.csv')

    expect(names).toEqual(['ventas.csv'])
    expect(revoke).toHaveBeenCalledWith('blob:fake')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
