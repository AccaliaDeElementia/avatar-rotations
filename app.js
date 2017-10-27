const http = require('http');
const fs = require('fs');
const sharp = require('sharp');

const promisfy = (fn) => {
  return (input) => new Promise((res, rej) => {
    fn(input, (err, data) => (err) ? rej(err) : res(data));
  });
};

const readdir = promisfy(fs.readdir);
const readFile = promisfy(fs.readFile);

const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff'];
const hour = 60 * 60 * 1000;
const day = 24 * hour;
const choosers = {
  first: (choices) => choices[0],
  last: (choices) => choices[choices.length - 1],
  latest: (choices) => choices[choices.length - 1],
  random: (choices) => choices[Math.floor(Math.random() * choices.length)],
  sequence: (choices) => choices[Math.floor(Date.now() / hour) % choices.length],
  daily: (choices) => choices[Math.floor(Date.now() / day) % choices.length]
};

const readOpts = (url) => {
  return new Promise((res) => {
    const parts = url.split('/');
    if (parts[parts.length - 1].indexOf('.') !== -1) {
      const term = parts[parts.length - 1].split('.');
      term.pop();
      parts[parts.length - 1] = term.join('.');
    }
    const opts = {
      source: `${serverOpts.baseDir}/${parts[1].replace(/:/g, '/')}`,
      chooser: choosers[parts[2]] || choosers.random,
      size: Number.parseInt(parts[3], 10)
    };
    if (!(opts.size >= 1 && opts.size <= 1000)) {
      opts.size = undefined;
    }
    res(opts);
  });
};

const justImages = (entries) => {
  const images = entries.filter((file) => {
    let ext = file.split('.');
    ext = ext[ext.length - 1].toLowerCase();
    return validExtensions.some((validExt) => validExt === ext);
  });
  images.sort();
  return images;
};

const chooseFile = (files, opts) => `${opts.source}/${opts.chooser(files)}`;

const resize = (data, opts) => sharp(data)
  .rotate()
  .resize(opts.size)
  .png()
  .toBuffer();

const requestHandler = (request, response) => {
  let opts = {};
  let responsePromise = null;
  if (request.url === '/favicon.ico' || request.url === '/') {
    responsePromise = readFile('favicon.ico');
  }
  else {
    responsePromise = readOpts(request.url)
      .then((theOpts) => opts = theOpts)
      .then(() => readdir(opts.source))
      .then(justImages)
      .then((files) => chooseFile(files, opts))
      .then(readFile);
  }
  responsePromise.then((data) => resize(data, opts))
    .then((data) => response.end(data))
    .catch((err) => {
      console.error(err);
      response.statusCode = 400;
      response.end('error');
      return;
    });
};

const serverOpts = {
  port: process.env.PORT || 8888,
  ip: process.env.IP || '127.0.0.1',
  baseDir: process.env.AVATARS_BASEDIR || 'Images'
};

var server = http.createServer(requestHandler);
server.listen(serverOpts.port, serverOpts.ip, function() {
  var addr = server.address();
  console.log(`Listening at ${addr.address}:${addr.port}`);
});
