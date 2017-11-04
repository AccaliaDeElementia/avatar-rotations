const handlebars = require('mustache')
const { readFile } = require('fs')

exports.sendTemplate = (context) => new Promise((resolve, reject) => {
    readFile(context.template, {encoding:'utf8'}, (err, data) => err ? reject(err) : resolve(data))
  })
  .then(template => {
      context.res.send(handlebars.render(template, context.data))
  })