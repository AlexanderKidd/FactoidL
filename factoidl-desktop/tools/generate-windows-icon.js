const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const source = path.join(__dirname, '..', 'assets', 'icons', 'png', 'FactoidL_Logo_Rounded_2.0_FINAL.png');
const output = path.join(__dirname, '..', 'assets', 'icons', 'win', 'FactoidL_Logo_Rounded_2.0_FINAL.ico');

pngToIco([source], {
  sizes: [16, 32, 48, 64, 128, 256]
}).then(function(icon) {
  fs.writeFileSync(output, icon);
  console.log('Generated ' + output);
}).catch(function(error) {
  console.error('Could not generate Windows icon:', error);
  process.exitCode = 1;
});
