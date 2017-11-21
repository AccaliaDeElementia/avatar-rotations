'use strict'

const { getImages } = require('../../utils/image')

const serializeDynamicImage = (type, directory, basePath) => {
  const resizeable = true
  // TODO: this really should be route driven not hard coded
  const staticLink = `${basePath}/${type}/${directory}`
  const sizeableLink = resizeable ? `${basePath}/${type}/size=%SIZE%/${directory}` : staticLink
  return {
    name: type,
    resizeable,
    staticLink,
    sizeableLink
  }
}

const serializeImage = (image, directory, basePath) => {
  const resizeable = image.split('.').pop().toLowerCase() !== 'gif'
  // TODO: this really should be route driven not hard coded
  const staticLink = `${basePath}/static/${directory}/${image}`
  const sizeableLink = resizeable ? `${basePath}/static/size-%SIZE%/${directory}/${image}` : staticLink
  return {
    name: image,
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

exports.getListing = ({ webRoot, basePath, directory, page = 1, pageSize = 50 }) =>
  getImages(`${basePath}/${directory}`)
  .then(images => {
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
    return {
      pages: {
        first: `${webRoot}/list/${directory}?page=1`,
        prev: page > 1 ? `${webRoot}/list/${directory}?page=${page - 1}` : null,
        current: `${webRoot}/list/${directory}?page=${page}`,
        next: page < pages ? `${webRoot}/list/${directory}?page=${page + 1}` : null,
        last: `${webRoot}/list/${directory}?page=${pages}`
      },
      pagination: createPagination(page, pages),
      directory: {
        random: serializeDynamicImage('random', directory, '/avatars'),
        sequence: serializeDynamicImage('sequence', directory, '/avatars'),
        daily: serializeDynamicImage('daily', directory, '/avatars')
      },
      images: images.slice(pageStart, pageEnd).map(img => serializeImage(img, directory, '/avatars'))
    }
  })
