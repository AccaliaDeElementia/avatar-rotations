const express = require('express')
const { getListing } = require('./api/listing')
const { handleError, ExpressRedirectError } = require('../utils/errors')

const shimData = (data, page, app, req) => {
  data.size = parseInt(req.params.size, 10) || 300
  if (data.size < 10 || data.size > 1000) {
    data.size = 300
  }
  if (`${data.size}` !== req.params.size) {
    const dest = [app.path(), `size-${data.size}`, `${req.params['0']}?page=${data.pages.current}`]
    throw new ExpressRedirectError(dest.join('/'))
  }
  if (data.pages.current !== page) {
    const dest = [app.path(), `size-${data.size}`, `${req.params['0']}?page=${data.pages.current}`]
    throw new ExpressRedirectError(dest.join('/'))
  }
  return data
}

module.exports = serverOpts => {
  const error404 = (req, res) => handleError(serverOpts, res, new ExpressRedirectError('Nobody here but is chickens.', 404))
  const app = express()
  app.get(['/', '/size-', '/size-:size'], error404)
  app.get('/size-:size/*', (req, res) => {
    const page = parseInt(req.query.page || '1', 10)
    const opts = {
      webRoot: app.path(),
      basePath: serverOpts.baseDir,
      directory: req.params['0'],
      page: page,
      pageSize: 50
    }
    return getListing(opts)
      .then(data => shimData(data, page, app, req))
      .then(data => res.render('listing', data))
      .catch(e => handleError(serverOpts, res, e))
  })
  app.get(['/*', '/size-/*'], (req, res) => {
    let newPath = `/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  return app
}
