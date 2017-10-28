const express = require('express')
const app = express()

const { validExtensions, getImages, sendFile } = require('./image')

const serverOpts = {
  port: process.env.PORT || 8888,
  ip: process.env.IP || '127.0.0.1',
  baseDir: process.env.AVATARS_BASEDIR || 'Images'
}

const hour = 60 * 60 * 1000
const day = 24 * hour
const choosers = {
  first: (choices) => choices[0],
  latest: (choices) => choices[choices.length - 1],
  random: (choices) => choices[Math.floor(Math.random() * choices.length)],
  sequence: (choices) => choices[Math.floor(Date.now() / hour) % choices.length],
  daily: (choices) => choices[Math.floor(Date.now() / day) % choices.length]
}

const stripExtension = (after) => (req, res, next, value) => {
  const parts = value.split('.')
  if (validExtensions.some((ext) => ext === parts[parts.length - 1])) {
    parts.pop()
  }
  after(req, res, parts.join('.'))
  next()
}

app.param('folder', stripExtension((req, res, folder) => {
  req.AVATARS_FOLDER = `${serverOpts.baseDir}/${folder.replace(/:/g, '/')}`
}))

app.param('chooser', stripExtension((req, res, chooser) => { req.AVATARS_CHOOSER = chooser }))

app.param('width', stripExtension((req, res, width) => { req.AVATARS_WIDTH = Number.parseInt(width, 10) }))

app.get(/^\/(favicon[.]ico)?$/, (req, res) => sendFile('favicon.ico', undefined, res))

const enforceAvatarOptions = (req, res, next) => {
  req.AVATARS_OPTS = {
    folder: req.AVATARS_FOLDER,
    chooser: choosers[req.AVATARS_CHOOSER] || choosers.random,
    width: req.AVATARS_WIDTH >= 10 && req.AVATARS_WIDTH <= 1000 ? req.AVATARS_WIDTH : undefined
  }
  next()
}

app.get('/:folder/:chooser?/:width?', enforceAvatarOptions, (req, res) => {
  getImages(req.AVATARS_OPTS.folder)
    .then(images => req.AVATARS_OPTS.chooser(images))
    .then(image => `${req.AVATARS_OPTS.folder}/${image}`)
    .then(image => sendFile(image, req.AVATARS_OPTS.width, res))
    .catch((err) => {
      console.error(err)
      res.status(400).send('error')
    })
})

app.listen(serverOpts.port)
