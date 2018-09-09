import {remote} from 'electron';
import React from 'react';
import {hot} from 'react-hot-loader';
import {orderBy, cloneDeep} from 'lodash';
import {each, map, filter, find, findIndex, cleanUp} from '../utils';
import {getStats, getClockTick} from '../proc';
import {withState} from '../storeUtils';
import {Table} from './table';
import {dataColumns, widths, coreCount, userInfo} from '../constants';
const {Menu} = remote;

let flatTree = [];
const walkTree = function(arr, depth = 0) {
  map(arr, function(p, i) {
    p.depth = depth;
    flatTree.push(p);
    p.hasChildren = p.children && p.children.length > 0;
    if (p.hasChildren && !p.collapsed) {
      walkTree(p.children, depth + 8);
      p.children = null;
    }
  });
}

class ProcessTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      processTree: [],
      columns: [],
      selected: [],
      tree: false,
      order: 'usage',
      direction: 'desc',
    };
    this.orderCount = 0;

    this.mainWindow = remote.getCurrentWindow();

    this.mainWindow.webContents.on('context-menu', this.buildMenu);

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
    this.mainWindow.webContents.off('context-menu', this.buildMenu);
    this.props.s.disconnect(this.connectId);
    cleanUp(this);
  }
  buildMenu = (e, props) => {
    const { x, y } = props;

    const contextOptions = [];

    if (this.contextType === 'row') {
      contextOptions.push({
        label: 'Kill',
        click: (item, focusedWindow) => {
          each(this.state.processTree, function(p) {
            if (p.selected) {
              process.kill(p.pid);
            }
          });
        }
      });
    }
    this.contextType = '';
    Menu
      .buildFromTemplate(contextOptions)
      .popup(this.mainWindow);
  }
  startInterval = () => {
    getClockTick((clockTick) => {
      this.clockTick = clockTick;
      this.interval = setInterval(() => {
        this.getData();
      }, this.props.s.interval);
    });
  }
  getData = () => {
    console.time('1')
    getStats((err, processTree) => {
      if (err) {
        console.error(err);
        return;
      }
      console.timeEnd('1');
      let {order, direction, tree} = this.state;
      let {view, enabledColumns} = this.props.s;

      this.lastOrder = order;
      this.lastDirection = direction;
      this.lastTree = tree;

      /* processTree = filter(processTree, function(p) {
        return p.uid === userInfo.uid;
      }); */
      //console.log(processTree)
      each(processTree, (ps, i) => {
        let refProc = find(this.state.processTree, (p) => p.pid === ps.pid);
        if (!refProc) {
          processTree[i].usage = 0;
          return;
        }
        let usage = 1000 * (
          (
            ((ps.cutime - refProc.cutime) + (ps.utime - refProc.utime)
          ) / this.clockTick) / ((this.clockTick + (ps.stime - refProc.stime)
        ) / this.clockTick)) / coreCount;
        usage = parseFloat(usage.toFixed(1))
        if (isNaN(usage)) {
          usage = 0;
        }
        processTree[i].usage = usage;
        processTree[i].selected = refProc.selected;
        if (tree) {
          processTree[i].collapsed = refProc.collapsed || false;
        }
      });

      if (tree) {
        flatTree = [];
        let childrenPids = [];
        each(processTree.slice(), function(p, i) {
          if (!p || !p.ppid) {
            return;
          }
          let parent = find(processTree, function(_p) {
            return _p.pid === p.ppid;
          });
          if (!parent) {
            return;
          }
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(p);
          childrenPids.push(p.pid);
        });
        processTree = filter(processTree, function(p) {
          return childrenPids.indexOf(p.pid) === -1;
        });
        walkTree(processTree);
        processTree = flatTree;
      }

      this.setState({
        processTree: tree ? processTree : orderBy(processTree, [order], [direction]),
        columns: enabledColumns[view]
      }, () => {
        if (!this.init) {
          this.init = true;
          this.props.s.trigger('correctWidths');
          console.log(cloneDeep(processTree))

        }
      });
    });
  }
  handleColumnClick = (column) => {
    let s = this.state;
    let {tree} = s;
    let order = column;
    let direction = s.order === column && s.direction === 'asc' ? 'desc' : 'asc';

    if (s.order === column) {
      ++this.orderCount;
    } else {
      direction = 'desc';
      this.orderCount = 0;
    }
    if (this.orderCount === 3) {
      this.orderCount = 0;
      widths.name = 70;
      tree = true;
    } else {
      tree = false;
    }


    let processTree = tree ? s.processTree : orderBy(s.processTree, [order], [direction]);
    this.setState({processTree, order, direction, tree});
  }
  handleRowContextMenu = (e) => {
    let {processTree} = this.state;
    let pid = parseInt(e.currentTarget.id.split('row-')[1]);
    let refRow = findIndex(processTree, (p) => p.pid === pid);
    this.contextType = 'row';
    if (refRow === -1) {
      return;
    }
    console.log('...')
    if (!processTree[refRow].selected) {
      each(processTree, function(p, i) {
        processTree[i].selected = false;
      });
      processTree[refRow].selected = true;
      this.setState({processTree});
    }
  }
  handleSelect = (e) => {
    e.currentTarget.focus()
    let {processTree} = this.state;
    let pid = parseInt(e.currentTarget.id.split('row-')[1]);
    let refRow = findIndex(processTree, (p) => p.pid === pid);
    if (refRow === -1) {
      return;
    }
    console.log(processTree[refRow])
    let {shift, ctrl} = window.cursor.keys;

    let selected = [];

    each(processTree, function(p, i) {
      if (ctrl) {
        return;
      }
      if (shift && p.selected) {
        selected.push(i);
        return;
      }
      if (p.selected) {
        processTree[i].selected = false;
      }
    });

    if (shift && selected.length > 0) {
      let start = 0;
      let end = processTree.length -1
      if (refRow < selected[0]) {
        start = refRow;
        end = selected[0] + 1
      } else {
        start = selected[0];
        end = refRow + 1;
      }
      console.log(refRow, selected[0])
      let slice = processTree.slice(start, end);
      console.log(slice)
      each(processTree, function(p, i) {
        processTree[i].selected = false;
      });
      each(slice, function(p) {
        let refSelected = findIndex(processTree, function(_p) {
          return p.pid === _p.pid;
        });
        processTree[refSelected].selected = true;
      })
    } else {
      processTree[refRow].selected = !processTree[refRow].selected;
    }

    this.setState({processTree});
  }
  handleCollapse = (e) => {
    let {processTree} = this.state;
    let pid = parseInt(e.currentTarget.id.split('row-')[1]);
    let refRow = findIndex(processTree, (p) => p.pid === pid);
    if (refRow === -1) {
      return;
    }
    processTree[refRow].collapsed = !processTree[refRow].collapsed;
    this.setState({processTree}, () => this.getData());
  }
  render() {
    let {processTree, columns, order, direction, tree} = this.state;
    if (processTree.length === 0) {
      return null;
    }
    return (
      <Table
      keyBy="pid"
      searchBy="name"
      itemList={processTree}
      columns={columns}
      order={order}
      direction={direction}
      tree={tree}
      onColumnClick={this.handleColumnClick}
      onRowClick={this.skipRowClick ? this.handleCollapse : this.handleSelect}
      onRowContextMenu={this.handleRowContextMenu}
      onIconMouseEnter={() => this.skipRowClick = true}
      onIconMouseLeave={() => this.skipRowClick = false} />
    );
  }
}
ProcessTable = withState(ProcessTable);

export default hot(module)(ProcessTable);