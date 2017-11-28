const { readdir } = require('fs')

const findErrorTemplates = new Promise((resolve, reject) => {
  readdir('views/errors', (err, files) => err ? reject(err) : resolve(files))
})
  .then(files => {
    const map = {}
    files
      .filter(file => file.slice(-4).toLowerCase() === '.hbs')
      .forEach(file => {
        map[file.slice(0, -4)] = file
      })
    return map
  }).catch(e => { return {} })

exports.ExpressRedirectError = class ExpressRedirectError extends Error {
  constructor (destination, status = 302) {
    super(`${status >= 400 ? 'Error' : 'Redirecting to'}: '${destination}'`)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
    this.statusCode = status || 500
    this.destination = destination
  }
}

exports.handleError = (serverOpts, res, err) => {
  const statusCode = err.statusCode || (err.code === 'ENOENT' ? 404 : 500)
  if (statusCode === 301 || statusCode === 302) {
    return res.redirect(err.statusCode, err.destination || '/')
  }
  if (serverOpts.debug) {
    console.error(err.message)
    console.error(err.stack)
    return res.status(statusCode).render('errors/dev', {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack
    })
  }
  return findErrorTemplates
    .then(templates => templates[statusCode] || '500') // use the 500 template if no specific template found
    .then(template => res.status(statusCode).render(`errors/${template}`))
    .catch(e => {
      console.error(e)
      // I don't know if headers have been sent already here.
      // It's not safe to set the status code... Not that we should be here...
      res.render('errors/500')
    })
}
