import React from 'react';
import {hot} from 'react-hot-loader';
import {ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area, linearGradient, defs, XAxis, YAxis, CartesianGrid, Tooltip} from 'recharts';
import moment from 'moment';
import {systemStat} from '../proc';
import {withState} from '../storeUtils';
import {each, find, map} from '../utils';
import {coreCount} from '../constants';

moment.updateLocale('en', {
  relativeTime : {
      future: "in %s",
      past:   "%s",
      s  : '%d',
      ss : '%d',
      m:  "%d",
      mm: "%d",
      h:  "an hour",
      hh: "%d hours",
      d:  "a day",
      dd: "%d days",
      M:  "a month",
      MM: "%d months",
      y:  "a year",
      yy: "%d years"
  }
});

const coreColors = [];
let i = -1;
while (i < coreCount) {
  ++i;
  coreColors.push('#'+(Math.random()*0xFFFFFF<<0).toString(16));
}

/* class Resources extends React.Component {
  render() {
    return (
      <AreaChart
      width={730}
      height={250}
      data={data}
      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
        <Area type="monotone" dataKey="pv" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPv)" />
      </AreaChart>
    );
  }
} */

class CPUCoresAreaChart extends React.Component {
  render() {
    const {cores} = this.props;
    return (
      <AreaChart
      width={730}
      height={250}
      data={cores}
      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          {map(cores, (core, i) => {
            return (
              <linearGradient key={core.label} id={core.label} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`#${i < 10 ? '0' + i : i}${i < 10 ? '0' + i : i}d8`} stopOpacity={0.8} />
                <stop offset="95%" stopColor={`#${i < 10 ? '0' + i : i}${i < 10 ? '0' + i : i}d8`} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <XAxis />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        {map(cores, (core) => {
          return (
            <Area key={core.label} type="monotone" dataKey="usage" stroke="#8884d8" fillOpacity={1} fill={`url(#${core.label})`} />
          );
        })}
      </AreaChart>
    );
  }
}

const percentageTickFormatter = (label) => `${label}%`;
const emptyTickFormatter = () => '';

class CPUCoresLineChart extends React.Component {
  render() {
    const {coreHistory} = this.props;
    if (coreHistory.length < 60) {
      return null;
    }
    each(coreHistory, function(item, i) {
      coreHistory[i].name = i + 1;
    })
    let [name, ...keys] = Object.keys(coreHistory[0]);
    console.log({coreHistory})
    return (
      <ResponsiveContainer width="100%" height={350} >
        <LineChart
        data={coreHistory}
        margin={{top: 5, right: 30, left: 20, bottom: 5}}>
          <XAxis dataKey="name" interval={0} minTickGap={10} tickFormatter={emptyTickFormatter} />
          <YAxis domain={[0, 101]} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} allowDataOverlow={true} tickFormatter={percentageTickFormatter} />
          <CartesianGrid strokeDasharray="1 1" opacity={0.3} />
          <Legend />
          {map(keys, function(key, i) {
            if (key.indexOf('cpu') > -1) {
              return (
                <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={coreColors[i]}
                dot={false}
                activeDot={i === 0 ? {r: 8} : false}
                isAnimationActive={false} />
              );
            }
          })}
        </LineChart>
      </ResponsiveContainer>
    );
  }
}

class Resources extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stats: {
        cores: []
      },
      coreHistory: []
    };

    this.connectId = props.s.connect({
      interval: () => {
        console.log('reset interval');
        clearInterval(this.interval);
        this.startInterval();
      }
    });
  }
  componentDidMount() {
    this.init = false;
    this.startInterval();
  }
  componentWillUnmount() {
    clearInterval(this.interval);
    this.props.s.disconnect(this.connectId);
  }
  startInterval = () => {
    this.getData();
    this.interval = setInterval(() => {
      this.getData();
    }, 500);
  }
  getData() {
    console.time('1');
    systemStat((err, stats) => {
      console.timeEnd('1')
      let {coreHistory} = this.state;
      let coreHistoryItem = {name: Date.now()};
      each(stats.cores, (core, i) => {
        let {user, nice, system, idle, iowait, irq, softirq, steal} = core;
        let ref = find(this.state.stats.cores, function(_core) {
          return _core.label === core.label;
        });
        stats.cores[i].total = user + nice + system + idle + iowait + irq + softirq + steal;
        if (ref) {
          let total = core.total - ref.total;
          let _nice = nice - ref.nice;
          let _system = system - ref.system;
          let _user = user - ref.user;

          let usage = ((_user + _nice + _system) / total) * 100;//().toFixed(2)
          if (isNaN(usage)) {
            usage = 0;
          }
          stats.cores[i].usage = usage;
          coreHistoryItem[core.label] = parseInt(usage.toFixed(0));
        } else {
          stats.cores[i].usage = 0;
          coreHistoryItem[core.label] = 0;
        }
      });
      coreHistory.push(coreHistoryItem);
      if (coreHistory.length > 60) {
        coreHistory.shift();
      }
      let [n, ...keys] = Object.keys(coreHistory[0]);
      let dummy = {};
      each(keys, function(key) {
        dummy[key] = 0;
      })
      while (coreHistory.length < 60) {
        coreHistory = [dummy].concat(coreHistory);
      }
      this.setState({stats, coreHistory});
    });
  }
  render() {
    const {/* stats,  */coreHistory} = this.state;
    //const {cores} = stats;
    return (
      <div style={{height: '100%'}}>
        {/* <CPUCoresAreaChart cores={cores} /> */}
        <div className="row" style={{minHeight: `${window.innerHeight - 33}px`}}>
          <div className="col-sm-10">
            <CPUCoresLineChart coreHistory={coreHistory} />
          </div>
        </div>
      </div>
    );
  }
}

Resources = withState(Resources)

export default hot(module)(Resources)