'use strict'

const { readFile, readdir } = require('fs')

const sharp = require('sharp')
const naturalSort = require('node-natural-sort')

const validExtensions = exports.validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff']

exports.stripValidExtensions = (path) => {
  const parts = path.split('.')
  if (validExtensions.some((ext) => ext === parts[parts.length - 1])) {
    parts.pop()
  }
  return parts.join('.')
}

const hasValidExtension = ext => {
  ext = (ext || '').toLowerCase()
  return validExtensions.some(validExt => validExt === ext)
}

exports.getImages = folder => {
  return new Promise((resolve, reject) => {
    readdir(folder, (err, files) => err ? reject(err) : resolve(files))
  })
    .then(files => files.filter(file => hasValidExtension(file.split('.').pop())))
    .then(files => {
      files.sort(naturalSort({ caseSensitive: false }))
      return files
    })
}

exports.sendFile = (filename, maxWidth, res) => {
  let ext = filename.split('.').pop().toLowerCase()
  ext = ext === 'gif' ? ext : 'png'
  return new Promise((resolve, reject) => {
    readFile(filename, (err, data) => err ? reject(err) : resolve(data))
  })
    .then(data => (ext === 'gif') ? data : sharp(data).rotate().resize(maxWidth, maxWidth).max().toBuffer())
    .then(data => res.set('Content-Type', `image/${ext}`).send(data))
}
