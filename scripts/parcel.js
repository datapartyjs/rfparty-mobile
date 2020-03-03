/**
 * Launch npm build command
 * use --dev to launch the build-dev command
 */
module.exports = function(context) {
  //console.log('Build parcel', context.cmdLine)
  var exec = require('child_process').execSync;
  var cmd = 'npm run build';
  if (/--dev/.test(context.cmdLine)) cmd += '-dev';
  exec(cmd, {stdio: 'inherit'});
  console.log();
}