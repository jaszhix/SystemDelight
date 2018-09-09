import os from 'os';
import {run, find, map} from './utils';

export const systemStat = function(cb) {
  run('cat /proc/stat', function(err, stdout, code) {
    if (err) {
      cb(err);
      return;
    }

    stdout = stdout.split(os.EOL)
    let cores = [];
    let stats = {
      cores
    }
    for (let i = 0; i < stdout.length; i++) {
      if (stdout[i].substr(0, 3) === 'cpu') {
        let [label, ...values] = stdout[i].split(/\s+/);
        for (let i = 0; i < values.length; i++) {
          values[i] = parseInt(values[i]);
        }
        let [user, nice, system, idle, iowait, irq, softirq, steal, guest, guest_nice] = values;
        stats.cores.push({label, user, nice, system, idle, iowait, irq, softirq, steal, guest, guest_nice});
      }
    }
    cb(null, stats);
  });
};

const stat = function(cb) {
  run('cat /proc/*/stat 2>&1 | grep -v "Permission denied" | grep -v "No such file or directory"  | grep -v "Is a directory"', function(err, stdout, code) {
    if (err) {
      cb(err);
      return;
    }

    stdout = stdout.split(os.EOL);

    let stats = [];
    for (let i = 0; i < stdout.length; i++) {
      let line = stdout[i].split(' ');
      for (let i = 0; i < line.length; i++) {
        if (i !== 1 && i !== 2) {
          line[i] = parseInt(line[i]);
        }
      }
      let [
        pid,
        comm,
        state,
        ppid,
        pgrp,
        session,
        tty_nr,
        tpgid,
        flags,
        minflt,
        cminflt,
        majflt,
        utime,
        stime,
        cutime,
        cstime,
        priority,
        nice,
        threads,
        itrealvalue,
        starttime,
        vsize,
        rss,
        rsslim,
        startcode,
        endcode,
        startstack,
        kstkesp,
        kstkeip,
        signal,
        blocked,
        sigignore,
        sigcatch,
        wchan,
        nswap,
        cnswap,
        exit_signal,
        processor,
        rt_priority,
        policy,
        delayacct_blkio_ticks,
        guest_time,
        cguest_time,
        start_data,
        end_data,
        start_brk,
        arg_start,
        arg_end,
        env_start,
        env_end,
        exit_code
      ] = line;
      stats.push({
        pid,
        comm,
        state,
        ppid,
        pgrp,
        session,
        tty_nr,
        tpgid,
        flags,
        minflt,
        cminflt,
        majflt,
        utime,
        stime,
        cutime,
        cstime,
        priority,
        nice,
        threads,
        itrealvalue,
        starttime,
        vsize,
        rss,
        rsslim,
        startcode,
        endcode,
        startstack,
        kstkesp,
        kstkeip,
        signal,
        blocked,
        sigignore,
        sigcatch,
        wchan,
        nswap,
        cnswap,
        exit_signal,
        processor,
        rt_priority,
        policy,
        delayacct_blkio_ticks,
        guest_time,
        cguest_time,
        start_data,
        end_data,
        start_brk,
        arg_start,
        arg_end,
        env_start,
        env_end,
        exit_code
      });
    }
    cb(null, stats);
  });
}

const status = function(cb) {
  run('cat /proc/*/status', function(err, stdout, code) {
    if (err) {
      cb(err);
      return;
    }

    stdout = stdout.split(os.EOL);


    let stats = [];
    let r = 0;
    let obj = {};
    for (let i = 0; i < stdout.length; i++) {
      ++r;
      if (r > 53) {
        stats.push(obj);
        obj = {};
        r = 0;
      }
      let [key, value] = stdout[i].split(':');

      if (!value) {
        continue;
      }
      let isKB = value.indexOf('kB') > -1;
      let int = parseInt(value.replace(/ kB/, ''), 10);
      if (isKB) {
        int = int * 1024;
      }
      if (isNaN(int)) {
        value = value.trim().replace(/\t/g, '');
      } else {
        value = int;
      }
      obj[key.trim().toLowerCase()] = value;
    }
    cb(null, stats);
  });
}

export const getDesktopData = function(cb) {
  run('locate *.desktop | xargs cat 2>&1 | grep -v "Permission denied" | grep -v "No such file or directory"  | grep -v "Is a directory"', function(err, stdout, code) {
    if (err) {
      console.log(err);
      return;
    }
    cb(map(stdout.split('[Desktop Entry]'), function(entry) {
      let lines = entry.split(os.EOL);
      let obj = {exec: '', name: ''};
      each(lines, function(line) {
        if (line.substr(0, 5) === 'Icon=') {
          obj.icon = line.split('=')[1].trim().replace(/\-symbolic/, '');
        } else if (line.substr(0, 5) === 'Name=') {
          obj.name = line.split('=')[1].trim();
        } else if (line.substr(0, 5) === 'Exec=') {
          obj.exec = line.split('=')[1].trim();
        }
      })
      return obj;
    }));
  });
}

const getPS = function(cb) {
  run('ps -A -o pid,args', function(err, stdout, code) {
    cb(map(stdout.split(os.EOL), function(p) {
      return p.split(/\s+/)
    }));
  });
}

export const getStats = function(cb) {
  let out = [];
  stat(function(err, stats1) {
    if (err) {
      cb(err);
      return;
    }
    status(function(err, stats2) {
      if (err) {
        cb(err);
        return;
      }
      getPS(function(ps) {
        for (let i = 0; i < stats2.length; i++) {
          let ref = find(stats1, function(s) {
            return s.pid === stats2[i].pid;
          });
          let ref2 = find(ps, function(p) {
            return parseInt(p[0]) === stats2[i].pid;
          });
          if (ref) {
            if (ref2) {
              ref.args = ref2[1];
              let nameParts = ref2[1].split(' ')[0].split('/');
              stats2[i].name = nameParts[nameParts.length - 1];
            }
            let state = stats2[i].state.match(/[A-Z] \(([a-z]*)\)/);
            if (state) {
              stats2[i].state = state[1];
            }
            if (!stats2[i].vmrss) {
              continue;
            }
            out.push(Object.assign(ref, stats2[i]));
          }
        }
        cb(null, out);
      });
    });
  });
}

export const getClockTick = function(cb) {
  run('getconf CLK_TCK', function(err, stdout, code) {
    cb(parseInt(stdout.trim()));
  });
}
/* console.time(1)
getData(function(data) {
  console.log(data)
  console.timeEnd(1);
}) */