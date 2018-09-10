import React, {Fragment} from 'react';
import {hot} from 'react-hot-loader';
import {upperFirst} from 'lodash';
import moment from 'moment';
import v from 'vquery';
import {map, filter, find, whichToShow, formatBytes, cleanUp} from '../utils';
import {withState} from '../storeUtils';
import {dataColumns, labelMap} from '../constants';
import genericBinary from '../images/binary.png';

let knownIcons = {};
let knownBinaries = ['sh', 'cat', 'tar', 'tail', 'man', 'cinnamon'];

class Img extends React.Component {
  componentDidMount() {
    this.fetchImage();
    cleanUp(this);
  }
  fetchImage = () => {
    if (!this.ref) {
      return;
    }
    let path;
    let {name} = this.props;
    if (name === 'code') {
      name = 'com.visualstudio.code';
    }
    if (!knownBinaries.includes(name) && knownIcons[name] !== true) {
      if (knownIcons[name]) {
        path = knownIcons[name];
      } else {
        path = find(window.iconPaths, function(path) {
          return path.indexOf(name) > -1;
        });
        if (path) {
          knownIcons[name] = path;
        } else {
          knownIcons[name] = true;
        }
      }
    }
    let img = new Image();

    img.onload = () => {
      if (!this.ref) {
        return;
      }
      this.ref.appendChild(img);
    }
    if (!path) {
      img.src = genericBinary;
    } else {
      img.src = path;
    }
    img.height = '12';
    img.width = '12';
  }
  render() {
    return (
      <span ref={(ref) => this.ref = ref} className="processIcon" />
    );
  }
}

Img = hot(module)(Img)

export class TableHeader extends React.Component {
  componentWillUnmount() {
    cleanUp(this);
  }
  render() {
    let {columns, onColumnClick, prefix, order, direction, tree, widths, onDragStart, onDragOver, onDragEnd, draggable, onResizeDragStart, onResizeOnDrag, onResizeDragEnd} = this.props;
    return (
      <thead>
        <tr className="filechooser maximized">
          {map(columns, (column, i) => {
            if (dataColumns.indexOf(column) > -1) {
              return null;
            }

            return (
              <th
              id={`${prefix}-${i}`}
              style={{width: `${widths[column]}`}}
              key={i}
              onClick={() => onColumnClick(column)}
              className="sidebar paned"
              draggable={draggable}
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={(e) => onDragEnd(e, i)}>
                {labelMap[column] || upperFirst(column)}
                {column === order && prefix === 'absolute' ?
                  <i className={`sort-icon icon-${tree ? 'tree6' : `arrow-${direction === 'asc' ? 'up' : 'down'}22`}`} />
                : null}
                <span
                className="resize-handle"
                draggable={true}
                onDragStart={(e) => onResizeDragStart(e, i)}
                onDrag={(e) => onResizeOnDrag(e, i)}
                onDragEnd={(e) => onResizeDragEnd(e, i)}>
                  |
                </span>
              </th>
            );

          })}
        </tr>
      </thead>
    );
  }
}

TableHeader = hot(module)(TableHeader)

export class TableRow extends React.Component {
  componentWillUnmount() {
    cleanUp(this);
  }
  render() {
    let {row, columns, className, onClick, onContextMenu, onMouseEnter, onMouseLeave, r, keyValue, tree, widths} = this.props;
    return (
      <tr
      id={`row-${keyValue}`}
      className={className}
      onContextMenu={onContextMenu}
      onClick={onClick}>
        {map(columns, (column, c) => {
          if (dataColumns.indexOf(column) > -1) {
            return null;
          }
          let width = widths[column];
          return (
            <td
            key={column}
            id={`column-${r === 0 ? c : 'default'}`}
            title={column === 'name' ? row.args : null}
            style={{paddingLeft: `${tree && column === 'name' ? row.depth : 0}px`, minWidth: width, maxWidth: width, width}}>
              {tree && column === 'name' && row.hasChildren ?
                <i
                className={`icon-${row.collapsed ? 'plus' : 'minus'}2`}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave} /> : null}
              {column === 'name' ? <Img name={row.name} /> : null}

              {column === 'vmrss' ? formatBytes(row[column])
              : typeof row[column] === 'boolean' ?
                <i className={`icon-${row[column] ? 'checkmark2' : 'cross3'}`} />
              : column === 'started' ? moment(row.started).format('M/D/YY LTS') : row[column]}
            </td>
          );
        })}
      </tr>
    );
  }
}

TableRow = hot(module)(TableRow)

export class Table extends React.Component {
  static defaultProps = {
    onRowClick: null,
    onRowContextMenu: null,
    onColumnClick: null,
    onContextMenu: null,
    onIconMouseEnter: null,
    onIconMouseLeave: null,
    tree: null,
    itemList: [],
    columns: [],
    order: '',
    direction: 'desc',
  };
  constructor(props) {
    super(props);

    this.state = {
      range: {start: 0, length: 0}
    };

    this.connectId = props.s.connect({
      searchValue: () => this.adjustHeaderWidth(),
      resize: () => this.handleResize()
    });
    this.dragCount = 0;
  }
  componentDidMount() {
    this.init = false;
    let checkNode = ()=>{
      if (this.ref) {
        this.ref.addEventListener('scroll', this.handleScroll);
        this.setViewableRange(this.ref);
      } else {
        setTimeout(() => checkNode(), 500);
      }
    };
    checkNode();
  }
  componentWillUnmount() {
    this.props.s.disconnect(this.connectId);
    cleanUp(this);
  }
  handleScroll = () => {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(this.scrollListener, 1);
  }
  scrollListener = () => {
    if (!this.ref) {
      return;
    }

    if (this.scrollTop !== this.ref.scrollTop) {
      this.setViewableRange(this.ref);
      this.scrollTop = this.ref.scrollTop;
    }
  }
  setViewableRange = (node) => {
    if (!node) {
      return;
    }
    let config = {
      outerHeight: this.ref.clientHeight - 15,
      scrollTop: this.ref.scrollTop - 15,
      itemHeight: 17,
      columns: 1
    };
    if (node.clientHeight > 0) {
      this.height = node.clientHeight;
    }
    let range = whichToShow(config);

    //let startOffset = 2;
    range.start -= 2;
    range.length += 2;
    if (range.start < 0) {
      range.start = 0;
    }
    this.scrollTimeout = null;
    this.setState({range}, () => this.adjustHeaderWidth());
  }
  adjustHeaderWidth = (e, recursion = 0) => {
    const {columns} = this.props;
    for (let i = 0; i < columns.length; i++) {
      let headerNode = v(`#header-${i}`);
      let absoluteNode = v(`#absolute-${i}`);
      if (headerNode.n && absoluteNode.n) {
        let width = headerNode.n.offsetWidth;
        absoluteNode.css({width: `${width - 2}px`, maxHeight: '15px'});
      } else if (recursion <= columns.length) {
        setTimeout(() => this.adjustHeaderWidth(recursion + 1), 50)
        return;
      }
    }
  };
  handleResize = () => {
    this.setViewableRange(this.ref);
    this.adjustHeaderWidth();
  }
  handleDragStart = (e, c) => {
    if (this.resizing) {
      return;
    }
    e.target.style.cursor = 'move';
    this.dragged = {el: e.currentTarget, c: c};
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData( 'text/plain', '' );
  }
  handleDragOver = (e, c) => {
    if (this.resizing) {
      return;
    }
    this.dragged.el.style.cursor = 'move';
    this.over = {el: e.currentTarget, c: c};
  }
  handleDragEnd = (e) => {
    if (this.resizing) {
      return;
    }
    e.target.style.cursor = 'pointer';
    let {enabledColumns, view} = this.props.s;
    enabledColumns[view] = v(enabledColumns[view]).move(this.dragged.c, this.over.c).ns;
    this.props.s.setState({enabledColumns}, () => this.adjustHeaderWidth());
  }
  handleResizeDragStart = (e) => {
    this.resizing = true;
    e.target.style.cursor = 'ew-resize';
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData( 'text/plain', '' );
  }
  handleResizeOnDrag = (e, c) => {
    let th = e.target.parentNode;
    let {left} = th.getBoundingClientRect();
    let adjustWidth = e.pageX - left;
    let width = `${adjustWidth}px`;
    // header DOM manipulation
    v(`#header-${c}`).n.style.width = width;
    v(`#absolute-${c}`).n.style.width = width;

    if (width === this.lastWidth) {
      ++this.dragCount;
    }

    // deferred state setting, when the width doesn't change
    if (this.dragCount > 5) {
      this.dragCount = 0;
      let {widths, view} = this.props.s;
      widths[view][th.innerText.toLowerCase().split('|')[0]] = adjustWidth;
      this.props.s.set({widths}, () => this.adjustHeaderWidth());
    }
    this.lastWidth = width;
  }
  handleResizeDragEnd = (e) => {
    let th = e.target.parentNode;
    let {left} = th.getBoundingClientRect();
    let adjustWidth = e.pageX - left;
    let {widths, view} = this.props.s;
    widths[view][th.innerText.toLowerCase().split('|')[0]] = adjustWidth;
    this.props.s.set({widths}, () => this.adjustHeaderWidth());
    setTimeout(() => this.resizing = false, 500);
  }
  render() {
    let {searchValue, widths, view} = this.props.s;
    widths = widths[view];
    let {itemList, columns, order, direction, keyBy, searchBy, tree, onColumnClick, onRowClick, onRowContextMenu, onIconMouseEnter, onIconMouseLeave} = this.props;
    let {range} = this.state;
    if (itemList.length === 0) {
      return null;
    }
    if (searchValue.length > 0) {
      itemList = filter(itemList, function(item) {
        return item[searchBy].toLowerCase().indexOf(searchValue.toLowerCase()) > -1;
      });
    }
    return (
      <Fragment>
        <table className="treeview view" style={{maxWidth: `${window.innerWidth - 15}px`, position: 'absolute', zIndex: '50'}} border="0" cellSpacing="1px">
          <TableHeader
          prefix="absolute"
          columns={columns}
          onColumnClick={onColumnClick}
          order={order}
          direction={direction}
          tree={tree}
          widths={widths}
          draggable={true}
          onDragStart={this.handleDragStart}
          onDragOver={this.handleDragOver}
          onDragEnd={this.handleDragEnd}
          onResizeDragStart={this.handleResizeDragStart}
          onResizeOnDrag={this.handleResizeOnDrag}
          onResizeDragEnd={this.handleResizeDragEnd} />
        </table>
        <div ref={(ref) => this.ref = ref} style={{overflow: 'auto', maxHeight: `${window.innerHeight - 38}px`, maxWidth: `${window.innerWidth}px`}}>
          <table style={{/* width: '100%',*/ overflow: 'auto'}} border="0" cellSpacing="0px">
            <TableHeader
            prefix="header"
            columns={columns}
            onColumnClick={onColumnClick}
            widths={widths} />
            <tbody className="treeview view paned vertical">
              {map(itemList, (row, r) => {
                let className = row.selected ? 'treeview view selected row' : 'row';
                let isVisible = r >= range.start && r <= range.start + range.length;
                if (!isVisible) {
                  return (
                    <tr
                    key={row[keyBy]}
                    style={{height: '17px'}}
                    className="row" />
                  );
                }
                return (
                  <TableRow
                  enabled={isVisible}
                  key={row[keyBy]}
                  keyValue={row[keyBy]}
                  row={row}
                  r={r}
                  columns={columns}
                  className={className}
                  tree={tree}
                  widths={widths}
                  onClick={onRowClick}
                  onContextMenu={onRowContextMenu}
                  onMouseEnter={onIconMouseEnter}
                  onMouseLeave={onIconMouseLeave} />
                );
              })}
            </tbody>
          </table>
        </div>
      </Fragment>
    );
  }
}

Table = hot(module)(withState(Table));