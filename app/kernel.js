import os from 'os';
import {run, find, map, each} from './utils';

export const getInstalledKernels = function() {
  return new Promise(function(resolve, reject) {
    run('dpkg --list | grep linux-image', function(err, stdout, code) {
      if (err) {
        reject(err);
        return;
      }

      stdout = stdout.split(os.EOL)
      let items = [];
      each(stdout, function(kernel) {
        let [installed, pkg, version, architecture] = kernel.split(/\s+/);
        if (!installed || installed !== 'ii') return;
        let pkgParts = pkg.split('-');
        let type = pkgParts.pop();
        pkg = pkgParts.join('-');
        items.push({pkg, version, architecture, type});
      });
      resolve(items);
    });
  });
};