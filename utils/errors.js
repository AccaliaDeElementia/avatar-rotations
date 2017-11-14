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

module.exports = (serverOpts, res, err) => {
  const statusCode = err.statusCode || err.code === 'ENOENT' ? 404 : 500
  if (statusCode === 301 || statusCode === 302) {
    return res.redirect(err.statusCode, err.destination || '/')
  }
  if (serverOpts.debug) {
    return res.status(statusCode).render('errors/dev')
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
