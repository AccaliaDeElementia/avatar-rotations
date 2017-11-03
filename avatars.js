'use strict'

const express = require('express')
const {getImages, sendFile, stripValidExtensions} = require('./image')

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
    .then(setContext('size', (context) => Number.parseInt(context.req.query.size), (value) => value >= 10 && value <= 1000))
    .then(setContext('path', (context) => context.req.params['0']))
    .then(setContext('directory', (context) => stripValidExtensions(`${serverOpts.baseDir}/${context.path}`)))

  const avatarWithChooser = (chooser, maxAge = () => 0) => (req, res) => {
    Promise.resolve({req, res, app})
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
  const staticAvatar = (req, res) => Promise.resolve({req, res, app})
    .then(getSizeAndPath)
    .then(setContext('webPath', context => context.path))
    .then(setContext('filePath', (context) => `${serverOpts.baseDir}/${context.path}`))
    .then(setContext('maxage', () => day * 365))
    .then(sendResponse)
    .catch((e) => {
      console.error(e)
      res.sendStatus(e.statusCode || 404)
    })

  const listAvatars = (req, res) => Promise.resolve({req, res, app})
    .then(getSizeAndPath)
    .then(setContext('webDirectory', (context) => stripValidExtensions(context.directory)))
    .then(setContext('images', (context) => getImages(context.directory)))
    .then((context) => {
      context.data = {
        directory: {
          links: {
            random: `${context.app.path()}/random/${context.webDirectory}`,
            sequence: `${context.app.path()}/sequence/${context.webDirectory}`,
            daily: `${context.app.path()}/daily/${context.webDirectory}`
          }
        },
        images: context.images.map(img => {
          return {
            name: img,
            link: `${context.app.path()}/static/${context.webDirectory}/${img}`
          }
        })
      }

      return context
    })
    .then(context => {
      res.format({
        default: () => {
          res.json(context.data)
        }
      })
    })

  const app = express()
  app.get('/random/*', avatarWithChooser((choices) => choices[Math.floor(Math.random() * choices.length)]))
  app.get('/sequence/*', avatarWithChooser((choices) => choices[Math.floor(Date.now() / hour) % choices.length]))
  app.get('/daily/*', avatarWithChooser((choices) => choices[Math.floor(Date.now() / day) % choices.length]))
  app.get('/static/*', staticAvatar)
  app.get('/list/*', listAvatars)
  return app
}
