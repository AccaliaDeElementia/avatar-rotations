'use strict'

const express = require('express')

const { getImages, sendFile, stripValidExtensions } = require('./image')
const { sendTemplate } = require('./templates')

const hour = 60 * 60 * 1000
const day = 24 * hour
const choosers = {
  first: (choices) => choices[0],
  latest: (choices) => choices[choices.length - 1],
  random: (choices) => choices[Math.floor(Math.random() * choices.length)],
  sequence: (choices) => choices[Math.floor(Date.now() / hour) % choices.length],
  daily: (choices) => choices[Math.floor(Date.now() / day) % choices.length]
}
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
  const expires = new Date(Date.now() + context.maxage)
  context.res.append('Cache-Control', `public max-age=${context.maxage}`)
  context.res.append('Expires', expires.toUTCString())
  return sendFile(context.filePath, context.size, context.res)
}

module.exports = serverOpts => {
  const getSizeAndPath = context => Promise.resolve(context)
    .then(setContext('size', (context) => Number.parseInt(context.req.params.size || context.req.query.size, 10), (value) => value >= 10 && value <= 1000))
    .then(setContext('path', (context) => context.req.params['0']))
    .then(setContext('directory', (context) => stripValidExtensions(`${serverOpts.baseDir}/${context.path}`)))

  const avatarWithChooser = (chooser, maxAge = () => 0) => (req, res) => {
    Promise.resolve({ req, res, app })
      .then(getSizeAndPath)
      .then(setContext('directory', (context) => stripValidExtensions(`${serverOpts.baseDir}/${context.path}`)))
      .then(setContext('images', (context) => getImages(context.directory)))
      .then(setContext('chooser', () => chooser))
      .then(setContext('file', context => context.chooser(context.images)))
      .then(setContext('webPath', context => `${context.path}/${context.file}`))
      .then(setContext('filePath', context => `${context.directory}/${context.file}`))
      .then(setContext('maxage', maxAge))
      .then(sendResponse)
      .catch((e) => {
        console.error(e)
        res.sendStatus(e.statusCode || 404)
      })
  }
  const staticAvatar = (req, res) => Promise.resolve({ req, res, app })
    .then(getSizeAndPath)
    .then(setContext('webPath', context => context.path))
    .then(setContext('filePath', (context) => `${serverOpts.baseDir}/${context.path}`))
    .then(setContext('maxage', () => day * 365))
    .then(sendResponse)
    .catch((e) => {
      console.error(e)
      res.sendStatus(e.statusCode || 404)
    })

  const listAvatars = (req, res) => Promise.resolve({ req, res, app })
    .then(getSizeAndPath)
    .then(setContext('webDirectory', (context) => stripValidExtensions(context.path)))
    .then(setContext('images', (context) => getImages(context.directory)))
    .then(setContext('template', (context) => 'templates/list.hbs'))
    .then((context) => {
      const makelink = (prefix, path) => `${context.app.path()}/${prefix}/${context.size?`size-${context.size}/`:''}${path}`
      context.data = {
        size: context.size,
        directory: {
          name: context.webDirectory,
          links: [{
            name: 'random',
            link: makelink('random', context.webDirectory),
            linkPrefix: `${context.app.path()}/random`,
            linkSuffix: context.webDirectory
          }, {
            name: 'sequence',
            link: makelink('sequence', context.webDirectory),
            linkPrefix: `${context.app.path()}/sequence`,
            linkSuffix: context.webDirectory
          }, {
            name: 'daily',
            link: makelink('daily', context.webDirectory),
            linkPrefix: `${context.app.path()}/daily`,
            linkSuffix: context.webDirectory
          }],
          linkPrefix: context.app.path()
        },
        images: context.images.map(img => {
          return {
            name: img,
            link: makelink('static', `${context.webDirectory}/${img}`),
            linkPrefix: `${context.app.path()}/static`,
            linkSuffix: `${context.webDirectory}/${img}`
          }
        })
      }
      return context
    })
    .then(context => {
      res.format({
        'text/html': () => {
          sendTemplate(context)
        },
        default: () => {
          res.json(context.data)
        }
      })
    })
    .catch((e) => {
      console.error(e)
      res.sendStatus(e.statusCode || 404)
    })

  const app = express()
  const randomChooser = avatarWithChooser((choices) => choices[Math.floor(Math.random() * choices.length)])
  const sequenceChooser = avatarWithChooser((choices) => choices[Math.floor(Date.now() / hour) % choices.length])
  const dailyChooser = avatarWithChooser((choices) => choices[Math.floor(Date.now() / day) % choices.length])
  app.get('/random/size-:size/*', randomChooser)
  app.get('/random/*', randomChooser)
  app.get('/sequence/size-:size/*', sequenceChooser)
  app.get('/sequence/*', sequenceChooser)
  app.get('/daily/size-:size/*', dailyChooser)
  app.get('/daily/*', dailyChooser)
  app.get('/static/size-:size/*', staticAvatar)
  app.get('/static/*', staticAvatar)
  app.get('/list/size-:size/*', listAvatars)
  app.get('/list/*', (req, res) => {
    let newPath = `/avatars/list/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  return app
}
