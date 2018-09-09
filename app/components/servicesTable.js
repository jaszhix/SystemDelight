import {remote} from 'electron';
import React from 'react';
import {hot} from 'react-hot-loader';
import {orderBy, pick, cloneDeep} from 'lodash';
import {each, map, find, findIndex, filter, cleanUp} from '../utils';
import {listUnits, systemCtl} from '../systemctl';
import {withState} from '../storeUtils';
import {Table} from './table';
const {Menu, dialog} = remote;

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

const handleActionInfo = function(err, action, unit) {
  if (!err) {
    return;
  }
  dialog.showMessageBox({
    type: 'info',
    buttons: [],
    title: `Info: ${action} ${unit.name}`,
    message: err.message
  });
};

class ServicesTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      units: [],
      columns: [],
      selected: [],
      order: 'name',
      direction: 'asc',
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
    const contextOptions = [];

    if (this.contextType === 'row') {
      let selected = filter(this.state.units, function(p) {
        return p.selected;
      });
      let active = filter(selected, function(p) {
        return p.active;
      });
      let inactive = filter(selected, function(p) {
        return !p.active;
      });
      let enabled = filter(selected, function(p) {
        return p.startup && p.startup.indexOf('enabled') > -1;
      });
      let disabled = filter(selected, function(p) {
        return p.startup && p.startup === 'disabled';
      });

      let {getData} = this;
      if (inactive.length > 0) {
        contextOptions.push({
          label: 'Start',
          click: (item, focusedWindow) => {
            each(inactive, function(p) {
              systemCtl('start', p.name, function(err, code) {
                handleActionInfo(err, 'starting', p);
                getData();
              });
            });
          }
        });
      }
      if (active.length > 0) {
        contextOptions.push({
          label: 'Stop',
          click: (item, focusedWindow) => {
            each(active, function(p) {
              systemCtl('stop', p.name, function(err, code) {
                handleActionInfo(err, 'stopping', p);
                getData();
              });
            });
          }
        });
      }
      if (enabled.length > 0) {
        contextOptions.push({
          label: 'Disable',
          click: (item, focusedWindow) => {
            each(enabled, function(p) {
              if (p.selected) {
                systemCtl('disable', p.name, function(err, code) {
                  handleActionInfo(err, 'disabling', p);
                  getData();
                });
              }
            });
          }
        })
      }
      if (disabled.length > 0) {
        contextOptions.push({
          label: 'Enable',
          click: (item, focusedWindow) => {
            each(disabled, function(p) {
              if (p.selected) {
                systemCtl('enable', p.name, function(err, code) {
                  handleActionInfo(err, 'enabling', p);
                  getData();
                });
              }
            });
          }
        })
      }
    }
    this.contextType = '';
    Menu
      .buildFromTemplate(contextOptions)
      .popup(this.mainWindow);
  }
  startInterval = () => {
    this.interval = setInterval(() => {
      this.getData();
    }, 6000);
  }
  getData = () => {
    console.time('1')
    listUnits((err, units) => {
      if (err) {
        console.error(err);
        return;
      }
      console.timeEnd('1');
      if (!this.init) {
        this.init = true;
        console.log(cloneDeep(units))
      }
      let {order, direction} = this.state;
      let {view, enabledColumns} = this.props.s;

      each(units, (ps, i) => {
        units[i] = pick(units[i], enabledColumns[view]);
        let refProc = find(this.state.units, (p) => p.name === ps.name);
        if (!refProc) {
          return;
        }
        units[i].selected = refProc.selected;
      });

      this.setState({
        units: orderBy(units, [order], [direction]),
        columns: enabledColumns[view]
      });
    });
  }
  handleColumnClick = (column) => {
    let s = this.state;
    let order = column;
    let direction = s.order === column && s.direction === 'asc' ? 'desc' : 'asc';

    let units = orderBy(s.units, [order], [direction]);
    this.setState({units, order, direction});
  }
  handleRowContextMenu = (e) => {
    let {units} = this.state;
    let unit = e.currentTarget.id.split('row-')[1];
    let refRow = findIndex(units, (p) => p.name === unit);
    this.contextType = 'row';
    if (refRow === -1) {
      return;
    }
    if (!units[refRow].selected) {
      each(units, function(p, i) {
        units[i].selected = false;
      });
      units[refRow].selected = true;
      this.setState({units});
    }
  }
  handleSelect = (e) => {
    e.currentTarget.focus()
    let {units} = this.state;
    let unit = e.currentTarget.id.split('row-')[1];
    let refRow = findIndex(units, (p) => p.name === unit);
    if (refRow === -1) {
      return;
    }
    console.log(units[refRow])
    let {shift, ctrl} = window.cursor.keys;

    let selected = [];

    each(units, function(p, i) {
      if (ctrl) {
        return;
      }
      if (shift && p.selected) {
        selected.push(i);
        return;
      }
      if (p.selected) {
        units[i].selected = false;
      }
    });

    if (shift && selected.length > 0) {
      let start = 0;
      let end = units.length -1
      if (refRow < selected[0]) {
        start = refRow;
        end = selected[0] + 1
      } else {
        start = selected[0];
        end = refRow + 1;
      }
      let slice = units.slice(start, end);
      each(units, function(p, i) {
        units[i].selected = false;
      });
      each(slice, function(p) {
        let refSelected = findIndex(units, function(_p) {
          return p.name === _p.name;
        });
        units[refSelected].selected = true;
      })
    } else {
      units[refRow].selected = !units[refRow].selected;
    }

    this.setState({units});
  }
  render() {
    let {units, columns, order, direction} = this.state;
    if (units.length === 0) {
      console.log('no units')
      return null;
    }
    return (
      <Table
      keyBy="name"
      searchBy="description"
      itemList={units}
      columns={columns}
      order={order}
      direction={direction}
      tree={false}
      onColumnClick={this.handleColumnClick}
      onRowClick={this.handleSelect}
      onRowContextMenu={this.handleRowContextMenu} />
    );
  }
}
ServicesTable = withState(ServicesTable);

export default hot(module)(ServicesTable);