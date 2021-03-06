'use strict'

const express = require('express')
const { getImages, sendFile, stripValidExtensions } = require('../../utils/image')
const { handleError, ExpressRedirectError } = require('../../utils/errors')

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

const standardizePath = context => Promise.resolve(context)
  .then(context => {
    const orig = context.app.path() + context.req.path
    const stripped = stripValidExtensions(orig)
    if (orig !== stripped) {
      throw new ExpressRedirectError(stripped, 301)
    }
    return context
  })

const isUnnormalizedSize = context => context.req.query.size !== undefined || (context.rawSize && context.rawSize !== `${context.size}`)
const getBasePath = context => [context.app.path(), context.req.route.path.split('/').slice(1, 2).pop()]

const normalizeSize = context => {
  if (isUnnormalizedSize(context)) {
    const dest = getBasePath(context)
    if (context.size) {
      dest.push(`size-${context.size}`)
    }
    dest.push(context.req.params['0'])
    throw new ExpressRedirectError(dest.join('/'), 301)
  }
  return context
}

const getSizeAndPath = context => Promise.resolve(context)
  .then(setContext('rawSize', (context) => (context.req.params.size || context.req.query.size)))
  .then(setContext('size', (context) => Number.parseInt(context.rawSize, 10), (value) => value >= 10 && value <= 1000))
  .then(normalizeSize)
  .then(setContext('path', (context) => context.req.params['0']))
  .then(setContext('directory', (context) => stripValidExtensions(`${context.baseDir}/${context.path}`)))

const sendWithChooser = context => Promise.resolve(context)
      .then(standardizePath)
      .then(getSizeAndPath)
      .then(setContext('directory', (context) => stripValidExtensions(`${context.baseDir}/${context.path}`)))
      .then(setContext('images', (context) => getImages(context.directory)))
      .then(setContext('chooser', () => context.chooser))
      .then(setContext('file', context => context.chooser(context.images)))
      .then(setContext('webPath', context => `${context.path}/${context.file}`))
      .then(setContext('filePath', context => `${context.directory}/${context.file}`))
      .then(setContext('maxage', () => context.maxAge))
      .then(sendResponse)

const sendStatic = context => Promise.resolve(context)
  .then(getSizeAndPath)
  .then(setContext('webPath', context => context.path))
  .then(context => {
    if (context.path.split('.').pop().toLowerCase() === 'gif' && context.size) {
      const dest = getBasePath(context)
      dest.push(context.req.params['0'])
      throw new ExpressRedirectError(dest.join('/'), 301)
    }
    return context
  })
  .then(setContext('filePath', (context) => `${context.baseDir}/${context.path}`))
  .then(setContext('maxage', () => (now) => day * 365))
  .then(sendResponse)

const redirectListing = (req, res) => {
  let newPath = `/listing/size-${req.params.size || 300}/${req.params[0]}`
  res.redirect(302, newPath)
}

module.exports = serverOpts => {
  const avatarWithChooser = (chooser, maxAge = () => 0) => (req, res, next) => {
    Promise.resolve({ req, res, app, baseDir: serverOpts.baseDir, chooser, maxAge })
      .then(sendWithChooser)
      .catch(e => handleError(serverOpts, res, e))
  }
  const staticAvatar = (req, res, next) => Promise.resolve({ req, res, app, baseDir: serverOpts.baseDir })
    .then(sendStatic)
    .catch(e => handleError(serverOpts, res, e))

  const chooseByTime = (period) => avatarWithChooser((choices) => choices[Math.floor(Date.now() / period) % choices.length], now => period - now % period)

  const app = express()
  const randomChooser = avatarWithChooser((choices) => choices[Math.floor(Math.random() * choices.length)], now => 0)

  const error404 = (req, res) => handleError(serverOpts, res, new ExpressRedirectError('Nobody here but is chickens.', 404))
  app.get(['/', '/random', '/random/size-:size', '/random/size-', 'sequence', '/sequence/size-:size', '/sequence/size-', '/daily', '/daily/size-:size', '/daily/size-', '/static', '/static/size-:size', '/static/size-'], error404)
  app.get(['/random/size-:size/*', '/random/*'], randomChooser)
  app.get(['/sequence/size-:size/*', '/sequence/*'], chooseByTime(hour))
  app.get(['/daily/size-:size/*', '/daily/*'], chooseByTime(day))
  app.get(['/static/size-:size/*', '/static/*'], staticAvatar)
  app.get(['/list/size-:size/*', '/list/size-/*', '/list/*'], redirectListing)
  return app
}
