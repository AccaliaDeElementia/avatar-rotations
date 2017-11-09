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
const app = express()

// view engine setup
app.engine('hbs', hbs.express4({
  partialsDir: path.join(__dirname, '/views/partials')
}))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')
app.disable('view cache')

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', index)
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
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

app.listen(serverOpts.port, serverOpts.ip)
