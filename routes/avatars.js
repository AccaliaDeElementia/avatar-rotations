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

  const app = express()
  const randomChooser = avatarWithChooser((choices) => choices[Math.floor(Math.random() * choices.length)], now => 0)
  const sequenceChooser = avatarWithChooser((choices) => choices[Math.floor(Date.now() / hour) % choices.length], now => hour - now % hour)
  const dailyChooser = avatarWithChooser((choices) => choices[Math.floor(Date.now() / day) % choices.length], now => day - now % day)
  const error404 = (req, res) => {
    const err = new Error(404)
    err.statusCode = 404
    handleError(serverOpts, res, err)
  }
  app.get('/', error404)
  app.get('/random/size-:size/*', randomChooser)
  app.get('/random/*', randomChooser)
  app.get('/random/*', randomChooser)
  app.get('/sequence/size-:size/*', sequenceChooser)
  app.get('/sequence/*', sequenceChooser)
  app.get('/daily/size-:size/*', dailyChooser)
  app.get('/daily/*', dailyChooser)
  app.get('/static/size-:size/*', staticAvatar)
  app.get('/static/*', staticAvatar)
  app.get('/list/size-:size/*', (req, res) => {
    let newPath = `/listing/size-${req.params.size}/${req.params[0]}`
    res.redirect(302, newPath)
  })
  app.get('/list/size-/*', (req, res) => {
    let newPath = `/listing/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  app.get('/list/*', (req, res) => {
    let newPath = `/listing/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  return app
}
