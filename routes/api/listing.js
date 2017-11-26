'use strict'

const { getImages } = require('../../utils/image')

const serializeImage = (image, directory, basePath, type = 'static') => {
  const resizeable = image.split('.').pop().toLowerCase() !== 'gif'
  // TODO: this really should be route driven not hard coded
  const staticLink = `${basePath}/${type}/${directory}/${image}`
  const sizeableLink = resizeable ? `${basePath}/${type}/size-%SIZE%/${directory}/${image}` : staticLink
  return {
    name: image || type,
    resizeable,
    staticLink,
    sizeableLink
  }
}

const findPaginationRange = (page, totalPages) => {
  let pageStart = Math.max(1, page - 5)
  let pageEnd = Math.min(page + 5, totalPages)
  if (pageStart === 1) {
    pageEnd = Math.min(pageStart + 11, totalPages)
  }
  if (pageEnd === totalPages) {
    pageStart = Math.max(1, pageEnd - 11)
  }
  return [pageStart, pageEnd]
}

const createPaginationPre = pageStart => {
  const pages = []
  if (pageStart > 1) {
    pages.push({
      page: 1,
      css: ''
    })
  }
  if (pageStart > 2) {
    pages.push({
      page: '...',
      css: 'disabled'
    })
  }
  return pages
}

const createPagination = (page, totalPages) => {
  const [pageStart, pageEnd] = findPaginationRange(page, totalPages)
  const pages = createPaginationPre(pageStart)
  for (let i = pageStart; i <= pageEnd; i++) {
    pages.push({
      page: i,
      css: (page === i) ? 'active' : ''
    })
  }
  if (pageEnd < totalPages - 1) {
    pages.push({
      page: '...',
      css: 'disabled'
    })
  }
  if (pageEnd < totalPages) {
    pages.push({
      page: totalPages,
      css: ''
    })
  }
  return pages
}

const pagifyImages = (images, page, pageSize) => {
  if (pageSize < 1) {
    return [images, 1, 1]
  }
  const pages = Math.ceil(images.length / pageSize)
  switch (true) {
    case (page > pages):
      page = pages
      break
    case (page < 1):
      page = 1
      break
    default:
      page = page || 1
  }
  const pageStart = (page - 1) * pageSize
  const pageEnd = page * pageSize
  return [images.slice(pageStart, pageEnd), page, pages]
}

const getPageLinks = (webRoot, directory, page, pages) => {
  return {
    first: `${webRoot}/list/${directory}?page=1`,
    prev: pages > 1 ? `${webRoot}/list/${directory}?page=${pages - 1}` : null,
    current: `${webRoot}/list/${directory}?page=${pages}`,
    next: pages < pages ? `${webRoot}/list/${directory}?page=${pages + 1}` : null,
    last: `${webRoot}/list/${directory}?page=${pages}`
  }
}

exports.getListing = ({ webRoot, basePath, directory, page = 1, pageSize = 0 }) =>
  getImages(`${basePath}/${directory}`)
  .then(images => {
    const [pagifiedImages, myPage, myPages] = pagifyImages(images, page, pageSize)
    return {
      pages: getPageLinks(webRoot, directory, myPage, myPages),
      pagination: createPagination(myPage, myPages),
      name: directory,
      dynamic: [
        serializeImage('', directory, '/avatars', 'random'),
        serializeImage('', directory, '/avatars', 'sequence'),
        serializeImage('', directory, '/avatars', 'daily')
      ],
      images: pagifiedImages.map(img => serializeImage(img, directory, '/avatars'))
    }
  })
