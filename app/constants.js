import os from 'os';

export const dataColumns = [
  'children',
  'stime',
  'utime',
  'cstime',
  'cutime',
  'selected',
  'pmem',
  'ppid',
  'pgid',
  'depth',
  'collapsed',
  'hasChildren',
  'args',
  'desktopData'
];

export const widths = {
  '% CPU': 20,
  'CPU Time': 20,
  name: 60,
  memory: 30,
  pgid: 20,
  pid: 20,
  threads: 20,
  unit: 50,
  user: 90,
  usage: 20,
  priority: 20,
  active: 10,
  description: 90,
  file: 20,
  startup: 20,
  started: 20
}

export const labelMap = {
  name: 'Name',
  nice: 'Priority',
  pid: 'PID',
  state: 'Status',
  threads: 'Threads',
  usage: 'CPU Usage',
  vmrss: 'Memory',
  init: 'Init Time'
}

export const coreCount = os.cpus().length;

export const userInfo = os.userInfo();