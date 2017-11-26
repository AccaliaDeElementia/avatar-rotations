const express = require('express')
const { getListing } = require('./api/listing')
const handleError = require('../utils/errors')

module.exports = serverOpts => {
  const app = express()
  app.get('/size-:size/*', (req, res) => {
    const page = parseInt(req.query.page || '1', 10)
    return getListing({
      webRoot: app.path(),
      basePath: serverOpts.baseDir,
      directory: req.params['0'],
      page: page,
      pageSize: 50
    })
    .then(data => {
      data.size = req.params.size || '300'
      return data
    })
    .then(data => res.render('listing', data))
    .catch(e => handleError(serverOpts, res, e))
  })
  const redirectWithSize = (req, res) => {
    let newPath = `/listing/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  }
  app.get('/size-/*', redirectWithSize)
  app.get('/*', redirectWithSize)
  return app
}
