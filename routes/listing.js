const express = require('express')
const { getListing } = require('./api/listing')
const handleError = require('../utils/errors')

module.exports = serverOpts => {
  const app = express()
  app.get('/size-:size/*', (req, res) => getListing({
      webRoot: app.path(),
      basePath: serverOpts.baseDir,
      directory: req.params['0'],
      page: parseInt(req.query.page || '1', 10),
      pageSize: 50
    })
    .then(data => {
      data.size = req.params.size || '300'
      return data
    })
    .then(data => res.render('listing', data))
    .catch(e => handleError(serverOpts, res, e)))
  app.get('/size-/*', (req, res) => {
    let newPath = `/listing/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  app.get('/*', (req, res) => {
    let newPath = `/listing/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  return app
}
