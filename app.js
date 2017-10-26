const http = require('http');
const fs = require('fs');
const sharp = require('sharp');

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const choosers = {
  first: (choices) => choices[0],
  'static': (choices) => choices[0],
  last: (choices) => choices[choices.length - 1],
  latest: (choices) => choices[choices.length - 1],
  random: (choices) => choices[Math.floor(Math.random() * choices.length)],
  sequence: (choices) => choices[Math.floor(Date.now() / hour) % choices.length],
  daily: (choices) => choices[Math.floor(Date.now() / day) % choices.length]
};

const readOpts = (url) => {
  return new Promise((res) => {
    const parts = url.split('/');
    let ext = 'png';
    if (parts[parts.length - 1].indexOf('.') !== -1) {
      const term = parts[parts.length - 1].split('.');
      ext = term.pop();
      parts[parts.length - 1] = term.join('.');
    }
    const opts = {
      source: `${serverOpts.baseDir}/${parts[1].replace(/:/g, '/')}`,
      chooser: choosers[parts[2]],
      size: Number.parseInt(parts[3], 10),
      extension: ext
    };
    if (!opts.chooser) {
      opts.chooser = choosers.random;
    }
    if (!(opts.size >= 1 && opts.size <= 1000)) {
      opts.size = undefined;
    }
    res(opts);
  });
};

const readDir = (directory) => {
  return new Promise((res, rej) => {
    fs.readdir(directory, (err, data) => {
      if (err) {
        return rej(err);
      }
      const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff'];
      data.filter((file) => {
        let fileExt = file.split('.');
        fileExt = fileExt[fileExt.length - 1].toLowerCase();
        return exts.some((ext) => ext === fileExt);
      });
      data.sort();
      res(data);
    });
  });
};

const readFile = (filename) => {
  return new Promise((res, rej) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        return rej(err);
      }
      res(data);
    });
  });
};

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
    responsePromise =
      readOpts(request.url)
      .then((theOpts) => opts = theOpts)
      .then(() => readDir(opts.source))
      .then((files) => `${opts.source}/${opts.chooser(files)}`)
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
  port: process.env.PORT || 3000,
  ip: process.env.IP || '0.0.0.0',
  baseDir: process.env.AVATARS_BASEDIR || '.'
};

const mergeConfig = (filename, onError) => {
  try {
    const params = JSON.parse(fs.readFileSync(filename));
    Object.keys(serverOpts).forEach((key) => {
      serverOpts[key] = params[key] !== undefined ? params[key] : serverOpts[key];
    });
  }
  catch (e) {
    onError(e);
  }
};

if (process.argv[2]) {
  mergeConfig(process.argv[2], () => {
    console.error('Failed to read configuration data.');
    process.exit(1);
  });
}

var server = http.createServer(requestHandler);
server.listen(serverOpts.port, serverOpts.ip, function() {
  var addr = server.address();
  console.log(`Listening at ${addr.address}:${addr.port}`);
});
