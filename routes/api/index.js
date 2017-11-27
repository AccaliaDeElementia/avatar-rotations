'use strict'

const express = require('express')
const { getListing } = require('./listing')

module.exports = serverOpts => {
  const app = express()
  app.get('/list/*', (req, res) => getListing({
    webRoot: app.path(),
    basePath: serverOpts.baseDir,
    directory: req.params['0'],
    page: parseInt(req.query.page || '1', 10)
  })
    .then(data => res.send(data))
    .catch(e => {
      console.error(e)
      res.status(500).send('error') // TODO: maybe not every error is 500?
    }))
  return app
}
