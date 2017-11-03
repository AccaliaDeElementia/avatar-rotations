'use strict'

const serverOpts = {
  port: process.env.PORT || 8888,
  ip: process.env.IP || '127.0.0.1',
  baseDir: process.env.AVATARS_BASEDIR || 'Images'
}

const express = require('express')
const app = express()

const avatars = require('./avatars')(serverOpts)

const {sendFile} = require('./image')

app.get(/^\/(favicon[.]ico)?$/, (req, res) => sendFile('favicon.ico', undefined, res)
  .catch((err) => {
    console.error(err)
    res.status(400).send('error')
  }))

app.use('/avatars', avatars)

const redirector = (req, res) => {
  let newPath = `/avatars/${req.params.chooser || 'random'}/`
  if (req.params.width) {
    newPath += `size-${req.params.width}/`
  }
  newPath += `${req.params.folder.replace(/:/g, '/')}.png`
  res.redirect(301, newPath)
}
app.get('/:folder/:chooser?/:width?.png', redirector)
app.get('/:folder/:chooser?/:width?', redirector)

app.listen(serverOpts.port)
