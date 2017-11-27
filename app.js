'use strict'

const serverOpts = {
  port: process.env.PORT || 8888,
  ip: process.env.IP || '127.0.0.1',
  baseDir: process.env.AVATARS_BASEDIR || 'Images',
  debug: process.env.AVATARS_DEBUG || false,
  pageSize: Number.parseInt(process.env.AVATARS_PAGESIZE, 10) || 30
}

const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const hbs = require('express-hbs')

const index = require('./routes/index')
const avatars = require('./routes/avatars')(serverOpts)
const listing = require('./routes/listing')(serverOpts)
const api = require('./routes/api')(serverOpts)
const tanner = require('./routes/tanner')(serverOpts)
const { handleError } = require('./utils/errors')
const app = express()

// view engine setup
app.engine('hbs', hbs.express4({
  partialsDir: path.join(__dirname, '/views/partials')
}))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')
if (serverOpts.debug) {
  app.disable('view cache')
}

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', index)
app.use('/avatars', avatars)
app.use('/listing', listing)
app.use('/api', api)
app.use('/tanner', tanner)

const redirector = (req, res) => {
  let newPath = `/avatars/${req.params.chooser || 'random'}/`
  if (req.params.width) {
    newPath += `size-${req.params.width}/`
  }
  newPath += `${req.params.folder.replace(/:/g, '/')}`
  res.redirect(301, newPath)
}
app.get('/:folder/:chooser?/:width?.png', redirector)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = err

  handleError(serverOpts, res, err)
})

app.listen(serverOpts.port, serverOpts.ip)
