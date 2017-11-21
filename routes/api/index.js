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
  }).then(data => res.send(data))
        .catch(e => {
          console.error(e)
          console.error(e.stack)
          res.send('error')
        }))
  return app
}
