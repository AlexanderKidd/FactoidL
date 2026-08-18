const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const releaseDirectory = path.join(__dirname, '..', 'release-builds');
const source = path.join(releaseDirectory, 'win-unpacked');
const destination = path.join(releaseDirectory, 'factoidl-desktop-win32-x64-' + packageJson.version);

if (!fs.existsSync(source)) {
  throw new Error('Expected Windows unpacked build at ' + source);
}

fs.rmSync(destination, { recursive: true, force: true });
fs.renameSync(source, destination);
console.log('Created portable release directory ' + destination);
