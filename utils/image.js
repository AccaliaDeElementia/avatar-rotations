'use strict'

const { readFile, readdir } = require('fs')
const {normalize} = require('path')
const sharp = require('sharp')
const naturalSort = require('node-natural-sort')
const { ExpressRedirectError } = require('./errors')

const validExtensions = exports.validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff']

exports.stripValidExtensions = (path) => {
  const parts = path.split('.')
  if (validExtensions.some((ext) => ext === parts[parts.length - 1])) {
    parts.pop()
  }
  return parts.join('.').replace(/\/+$/, '')
}

const hasValidExtension = ext => {
  ext = (ext || '').toLowerCase()
  return validExtensions.some(validExt => validExt === ext)
}

const safeExec = (fn, param) =>{
  return new Promise((resolve, reject) => {
    if (param !== normalize(param)) {
      return reject(new ExpressRedirectError('Attempted directory traversal', 403))
    }
    fn(param, (err, files) => err ? reject(err) : resolve(files))
  })
}

exports.getImages = folder => {
  return safeExec(readdir, folder)
    .then(files => files.filter(file => hasValidExtension(file.split('.').pop())))
    .then(files => {
      files.sort(naturalSort({ caseSensitive: false }))
      return files
    })
}

exports.sendFile = (filename, maxWidth, res) => {
  let ext = filename.split('.').pop().toLowerCase()
  ext = ext === 'gif' ? ext : 'png'
  return safeExec(readFile, filename)
    .then(data => (ext === 'gif') ? data : sharp(data).rotate().resize(maxWidth, maxWidth).max().toBuffer())
    .then(data => res.set('Content-Type', `image/${ext}`).send(data))
}
