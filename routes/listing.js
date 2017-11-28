const express = require('express')
const { getListing } = require('./api/listing')
const { handleError, ExpressRedirectError } = require('../utils/errors')

module.exports = serverOpts => {
  const error404 = (req, res) => handleError(serverOpts, res, new ExpressRedirectError('Nobody here but is chickens.', 404))
  const app = express()
  app.get(['/', '/size-', '/size-:size'], error404)
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
        console.log(data.pages.current, page)
        if (data.pages.current !== page) {
          const dest = [app.path(), `size-${data.size}`, `${req.params['0']}?page=${data.pages.current}`]
          throw new ExpressRedirectError(dest.join('/'))
        }
        return data
      })
      .then(data => res.render('listing', data))
      .catch(e => handleError(serverOpts, res, e))
  })
  app.get(['/*', '/size-/*'], (req, res) => {
    let newPath = `/listing/size-300/${req.params[0]}`
    res.redirect(302, newPath)
  })
  return app
}
