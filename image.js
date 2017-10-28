const { readFile, readdir } = require('fs');

const sharp = require('sharp');

const validExtensions = exports.validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff'];

const hasValidExtension = ext => {
    ext = (ext || '').toLowerCase();
    return validExtensions.some(vext => vext === ext);
};


const getImages = exports.getImages = folder => {
    return new Promise((resolve, reject) => {
            readdir(folder, (err, files) => err ? reject(err) : resolve(files));
        })
        .then(files => files.filter(file => hasValidExtension(file.split('.').pop())))
        .then(files =>{
            files.sort();
            return files;
        });
};

const sendFile = exports.sendFile = (filename, maxWidth, res) => {
    return new Promise((resolve, reject) => {
            readFile(filename, (err, data) => err ? reject(err) : resolve(data));
        })
        .then(data => sharp(data).rotate().resize(maxWidth).png().toBuffer())
        .then(data => res.set('Content-Type', 'image/png').send(data));
};