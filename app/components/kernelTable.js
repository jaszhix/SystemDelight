import {remote} from 'electron';
import React from 'react';
import {hot} from 'react-hot-loader';
import {orderBy} from 'lodash';
import axios from 'axios';
import {parse} from 'himalaya'
import {each, map, find, findIndex, filter, cleanUp} from '../utils';
import {withState} from '../storeUtils';
import {getInstalledKernels} from '../kernel';
import {Table} from './table';

const {Menu} = remote;

class KernelTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      kernels: [],
      columns: [],
      selected: [],
      order: 'name',
      direction: 'asc',
    };

    this.mainWindow = remote.getCurrentWindow();

    this.mainWindow.webContents.on('context-menu', this.buildMenu);
  }
  componentDidMount() {
    this.getData();
  }
  componentWillUnmount() {
    this.mainWindow.webContents.off('context-menu', this.buildMenu);
    cleanUp(this);
  }
  buildMenu = (e, props) => {
    const contextOptions = [];

    if (this.contextType === 'row') {
      let {kernels} = this.state;
      let selected = filter(kernels, function(kernel) {
        return kernel.selected;
      });

      contextOptions.push({
        label: 'Install',
        click: (item, focusedWindow) => {
          each(selected, function(kernel) {
            // TODO
            console.log('Install kernel...', kernel.name);
          });
        }
      });
    }
    this.contextType = '';
    Menu
      .buildFromTemplate(contextOptions)
      .popup(this.mainWindow);
  }
  getData = () => {
    console.time('1')
    let kernels = [];
    let columns = ['name', 'date', 'installed'];
    let installedKernels = [];

    getInstalledKernels().then((kernels) => {
      installedKernels = kernels;
      return axios.get('http://kernel.ubuntu.com/~kernel-ppa/mainline/');
    }).then((res) => {
      console.timeEnd('1')
      let rows = parse(res.data)[2].children[3].children[3].children;
      rows = filter(map(rows, (row) => row.children), (row) => row != null)
      let [th1, th2, ...tableRows] = rows;

      each(tableRows, (columns) => {
        let [img, name, date, ...etc] = columns;
        if (!name) return;
        name = name.children[0].children[0].content;
        if (name.includes('Parent Directory')) return;
        name = name.match(/[A-z.1-9,0\-]/g);
        if (!name) return;
        name = name.join('');

        if (name.length < 2) return;

        if (name[0] === 'v') name = name.split('v')[1];
        let [major, minor, patch, patch2] = map(name.split('.'), (d) => parseInt(d));
        if (!isNaN(major)) {
          name = `${major}.${minor}.${!patch ? 0 : patch}${typeof patch2 === 'number' ? '.' + patch2 : ''}`;
        }
        if (find(kernels, (kernel) => kernel.name === name)) return;
        date = date.children[0].content.trim();

        let installed = false;

        each(installedKernels, (kernel) => {
          let version = kernel.version.split('-')[0];
          let [iMajor, iMinor, iPatch, iPatch2] = map(version.split('.'), (d) => parseInt(d));

          if (!patch) patch = 0;
          let _name = `${iMajor}.${iMinor}.${iPatch}${typeof iPatch2 === 'number' ? '.' + iPatch2 : ''}`;
          if (name === _name) {
            installed = true;
          }
        });
        kernels.push({name, date, installed});
      });
      this.setState({kernels, columns});
    }).catch((err) => console.error(err));
  }
  handleColumnClick = (column) => {
    let s = this.state;
    let order = column;
    let direction = s.order === column && s.direction === 'asc' ? 'desc' : 'asc';

    let kernels = orderBy(s.kernels, [order], [direction]);
    this.setState({kernels, order, direction});
  }
  handleRowContextMenu = (e) => {
    let {kernels} = this.state;
    let unit = e.currentTarget.id.split('row-')[1];
    let refRow = findIndex(kernels, (p) => p.name === unit);
    this.contextType = 'row';
    if (refRow === -1) {
      return;
    }
    if (!kernels[refRow].selected) {
      each(kernels, function(p, i) {
        kernels[i].selected = false;
      });
      kernels[refRow].selected = true;
      this.setState({kernels});
    }
  }
  handleSelect = (e) => {
    e.currentTarget.focus()
    let {kernels} = this.state;
    let unit = e.currentTarget.id.split('row-')[1];
    let refRow = findIndex(kernels, (p) => p.name === unit);
    if (refRow === -1) {
      return;
    }
    console.log(kernels[refRow])
    let {shift, ctrl} = window.cursor.keys;

    let selected = [];

    each(kernels, function(p, i) {
      if (ctrl) {
        return;
      }
      if (shift && p.selected) {
        selected.push(i);
        return;
      }
      if (p.selected) {
        kernels[i].selected = false;
      }
    });

    if (shift && selected.length > 0) {
      let start = 0;
      let end = kernels.length -1
      if (refRow < selected[0]) {
        start = refRow;
        end = selected[0] + 1
      } else {
        start = selected[0];
        end = refRow + 1;
      }
      let slice = kernels.slice(start, end);
      each(kernels, function(p, i) {
        kernels[i].selected = false;
      });
      each(slice, function(p) {
        let refSelected = findIndex(kernels, function(_p) {
          return p.name === _p.name;
        });
        kernels[refSelected].selected = true;
      })
    } else {
      kernels[refRow].selected = !kernels[refRow].selected;
    }

    this.setState({kernels});
  }
  render() {
    let {kernels, columns, order, direction} = this.state;
    if (kernels.length === 0) {
      return null;
    }
    return (
      <Table
      keyBy="name"
      searchBy="description"
      itemList={kernels}
      columns={columns}
      order={order}
      direction={direction}
      tree={false}
      iconsEnabled={false}
      onColumnClick={this.handleColumnClick}
      onRowClick={this.handleSelect}
      onRowContextMenu={this.handleRowContextMenu} />
    );
  }
}
KernelTable = withState(KernelTable);

export default hot(module)(KernelTable);