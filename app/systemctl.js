import os from 'os';
import {uniqBy} from 'lodash';
import {run, find, map} from './utils';

const filtered = ['│', '├', '─']
export const listUnits = function(cb) {
  run(`"systemctl status --all 2>&1 | grep -v "Permission denied" | grep -v "No such file or directory"  | grep -v "Is a directory""`, {shell: '/bin/bash', env: process.env}, function(
    err,
    stdout,
    code
  ) {
    if (err) {
      cb(err);
      return;
    }

    let units = [], match, line;
    stdout = stdout.split('● ');
    for (let i = 0; i < stdout.length; i++) {
      if (stdout[i].match(/could not be found/i)) {
        continue;
      }
      let lines = stdout[i].split(os.EOL);
      let [name, description] = lines[0].split(' - ');
      if (!name || !description) {
        continue;
      }
      name = name.replace(/x2d/g, '');
      let type = name.split('.')[1];
      let unit = {name, type, description};

      unit.raw = stdout[i];
      for (let z = 1; z < lines.length; z++) {
        if (!lines[z].includes(': ') || filtered.includes(lines[z])) {
          continue;
        }
        if ((match = lines[z].match(/Active: (.+)/))) {
          line = match[1]
          if ((match = line.match(/([^ ]+)/))) {
            unit.active = match[1] === 'active';
          }

          if ((match = line.match(/since ([\w -:]+)/))) {
            unit.started = new Date(match[1]).getTime();
          }
          continue;
        }
        if ((match = lines[z].match(/Loaded:[ ]+(.+)/))) {
          line = match[1];

          if ((match = line.match(/([^ ]+)/))) {
            unit.loaded = match[1] === 'loaded';
          }

          if (!unit.loaded) {
            if ((match = line.match(/Reason: ([^)]+)/))) {
              unit.error = match[1];
            }
          } else if ((match = line.match(/\((.+)\)/))) {
            const props = match[1];
            const parts = props.split(';').map(s => s.trim());
            if (parts.length >= 1) {
              unit.file = parts[0];
            }
            if (parts.length >= 2) {
              unit.startup = parts[1];
            }
            if (parts.length >= 3) {
              for (let i = 2; i < parts.length; i++) {
                const arr = parts[i].split(':').map(s => s.trim());
                unit.props = unit.props || {};
                unit.props[arr[0]] = arr[1];
              }
            }
          }
          continue;
        }
        let [key, value] = lines[z].split(': ');
        unit[key.trim().toLowerCase()] = value.trim();
      }
      units.push(unit);
    }

    cb(null, units)
  });
};

export const systemCtl = function(action, unit, cb) {
  run(`systemctl ${action} ${unit}`, function(err, stdout, code) {
    if (err) {
      cb(err);
    }
    cb(err, code);
  });
};