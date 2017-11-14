'use strict'

const express = require('express')
const { getImages, sendFile, stripValidExtensions } = require('../utils/image')
const handleError = require('../utils/errors')

const hour = 60 * 60 * 1000
const day = 24 * hour

const setContext = (name, valueSelector, filter = () => true) => context => Promise.resolve(valueSelector(context))
  .then((value) => {
    if (filter(value)) {
      context[name] = value
    }
    return context
  })

const sendResponse = context => {
  context.res.links({
    Permalink: `${context.app.path()}/static/${context.webPath}`
  })
  const now = Date.now()
  const maxage = context.maxage(now)
  const expires = new Date(now + maxage)
  context.res.append('Cache-Control', `public max-age=${Math.floor(maxage / 1000)}`)
  context.res.append('Expires', expires.toUTCString())
  return sendFile(context.filePath, context.size, context.res)
}

module.exports = serverOpts => {
  const standardizePath = context => Promise.resolve(context)
    .then(context => {
      const orig = context.app.path() + context.req.path
      const stripped = stripValidExtensions(orig)
      if (orig !== stripped) {
        const redir = new Error('redirect!')
        redir.destination = stripped
        redir.statusCode = 301
        throw redir
      }
      return context
    })

  const getSizeAndPath = context => Promise.resolve(context)
    .then(setContext('rawSize', (context) => (context.req.params.size || context.req.query.size)))
    .then(setContext('size', (context) => Number.parseInt(context.rawSize, 10), (value) => value >= 10 && value <= 1000))
    .then(context => new Promise((resolve, reject) => {
      if (context.req.query.size !== undefined || (context.rawSize && context.rawSize !== `${context.size}`)) {
        const dest = [context.app.path(), context.req.route.path.split('/').slice(1, 2).pop()]
        if (context.size) {
          dest.push(`size-${context.size}`)
        }
        dest.push(context.req.params['0'])
        const redir = new Error('redirect!')
        redir.destination = dest.join('/')
        redir.statusCode = 301
        return reject(redir)
      }
      resolve(context)
    }))
    .then(setContext('path', (context) => context.req.params['0']))
    .then(setContext('directory', (context) => stripValidExtensions(`${serverOpts.baseDir}/${context.path}`)))

  const avatarWithChooser = (chooser, maxAge = () => 0) => (req, res, next) => {
    Promise.resolve({ req, res, app })
      .then(standardizePath)
      .then(getSizeAndPath)
      .then(setContext('directory', (context) => stripValidExtensions(`${serverOpts.baseDir}/${context.path}`)))
      .then(setContext('images', (context) => getImages(context.directory)))
      .then(setContext('chooser', () => chooser))
      .then(setContext('file', context => context.chooser(context.images)))
      .then(setContext('webPath', context => `${context.path}/${context.file}`))
      .then(setContext('filePath', context => `${context.directory}/${context.file}`))
      .then(setContext('maxage', () => maxAge))
      .then(sendResponse)
      .catch(e => handleError(serverOpts, res, e))
  }
  const staticAvatar = (req, res, next) => Promise.resolve({ req, res, app })
    .then(getSizeAndPath)
    .then(setContext('webPath', context => context.path))
    .then(context => {
      if (context.path.split('.').pop().toLowerCase() === 'gif' && context.size) {
        const dest = [context.app.path(), context.req.route.path.split('/').slice(1, 2).pop()]
        dest.push(context.req.params['0'])
        const redir = new Error('redirect!')
        redir.destination = dest.join('/')
        redir.statusCode = 301
        throw redir
      }
      return context
    })
    .then(setContext('filePath', (context) => `${serverOpts.baseDir}/${context.path}`))
    .then(setContext('maxage', () => (now) => day * 365))
    .then(sendResponse)
    .catch(e => handleError(serverOpts, res, e))

  const makePagination = (currentPage, totalPages) => {
    const pageStart = Math.max(currentPage - 5, 1)
    const pageEnd = Math.min(currentPage + 5, totalPages)
    const pages = []
    if (pageStart > 1) {
      pages.push({
        title: '1',
        page: 1,
        css: (currentPage === 1) ? 'active' : ''
      })
    }
    if (pageStart > 2) {
      pages.push({
        title: '...',
        page: 0,
        css: 'disabled'
      })
    }
    for (let i = pageStart; i <= pageEnd; i++) {
      pages.push({
        title: i,
        page: i,
        css: (currentPage === i) ? 'active' : ''
      })
    }
    if (pageEnd < totalPages - 1) {
      pages.push({
        title: '...',
        page: 0,
        css: 'disabled'
      })
    }
    if (pageEnd < totalPages) {
      pages.push({
        title: totalPages,
        page: totalPages,
        css: (currentPage === totalPages) ? 'active' : ''
      })
    }
    return pages
  }

  const listAvatars = (req, res, next) => Promise.resolve({ req, res, app })
    .then(standardizePath)
    .then(getSizeAndPath)
    .then(setContext('webDirectory', (context) => stripValidExtensions(context.path)))
    .then(setContext('images', (context) => getImages(context.directory)))
    .then(context => {
      if (!context.images || !context.images.length) {
        const err = new Error('No images found!')
        err.status = 404
        throw err
      }
      return context
    })
    .then(setContext('template', (context) => 'templates/list.hbs'))
    .then(setContext('page', (context) => Number.parseInt(context.req.query.page, 10), (value) => value > 0))
    .then((context) => {
      const makeLink = (prefix, path) => `${context.app.path()}/${prefix}/${context.size ? `size-${context.size}/` : ''}${path}`
      const pages = Math.ceil(context.images.length / serverOpts.pageSize)
      const page = (context.page > pages) ? pages : context.page || 1
      const pageStart = (page - 1) * serverOpts.pageSize
      const pageEnd = page * serverOpts.pageSize
      context.data = {
        size: context.size,
        pagination: makePagination(page, pages),
        directory: {
          name: context.webDirectory,
          links: [{
            name: 'random',
            link: makeLink('random', context.webDirectory),
            linkPrefix: `${context.app.path()}/random`,
            linkSuffix: context.webDirectory
          }, {
            name: 'sequence',
            link: makeLink('sequence', context.webDirectory),
            linkPrefix: `${context.app.path()}/sequence`,
            linkSuffix: context.webDirectory
          }, {
            name: 'daily',
            link: makeLink('daily', context.webDirectory),
            linkPrefix: `${context.app.path()}/daily`,
            linkSuffix: context.webDirectory
          }],
          linkPrefix: context.app.path()
        },
        images: context.images.slice(pageStart, pageEnd).map(img => {
          return {
            name: img,
            link: makeLink('static', `${context.webDirectory}/${img}`),
            linkPrefix: `${context.app.path()}/static`,
            linkSuffix: `${context.webDirectory}/${img}`
          }
        })
      }
      return context
    })
    .then(context => {
      const fmt = req.accepts('html')
      switch (fmt) {
        case 'html':
          return res.render('avatars/list', context.data)
        default:
          return res.json(context.data)
      }
    })
    .catch(e => handleError(serverOpts, res, e))

  const app = express()
  const randomChooser = avatarWithChooser((choices) => choices[Math.floor(Math.random() * choices.length)], now => 0)
  const sequenceChooser = avatarWithChooser((choices) => choices[Math.floor(Date.now() / hour) % choices.length], now => hour - now % hour)
  const dailyChooser = avatarWithChooser((choices) => choices[Math.floor(Date.now() / day) % choices.length], now => day - now % day)
  app.get('/random/size-:size/*', randomChooser)
  app.get('/random/*', randomChooser)
  app.get('/random/*', randomChooser)
  app.get('/sequence/size-:size/*', sequenceChooser)
  app.get('/sequence/*', sequenceChooser)
  app.get('/daily/size-:size/*', dailyChooser)
  app.get('/daily/*', dailyChooser)
  app.get('/static/size-:size/*', staticAvatar)
  app.get('/static/*', staticAvatar)
  app.get('/list/size-:size/*', listAvatars)
  app.get('/list/size-/*', (req, res) => {
    let newPath = `/avatars/list/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  app.get('/list/*', (req, res) => {
    let newPath = `/avatars/list/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  return app
}
