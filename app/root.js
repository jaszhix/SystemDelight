import React from 'react';
import {hot} from 'react-hot-loader';

import {map} from './utils';
import {withState} from './storeUtils';
import Toolbar from './components/toolbar';
import Resources from './components/resources';
import ProcessTable from './components/processTable';
import ServicesTable from './components/servicesTable';
import KernelsTable from './components/kernelTable';

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

class Root extends React.Component {
  render() {
    let {view} = this.props.s;
    return (
      <div className="window-frame frame-container">
        {/* <div className="switch" /> */}
        <Toolbar />
        {view === 'resources' ? <Resources /> : null}
        {view === 'processes' ? <ProcessTable /> : null}
        {view === 'services' ? <ServicesTable /> : null}
        {view === 'kernels' ? <KernelsTable /> : null}
      </div>
    );
  }
}
Root = withState(Root);

/* class Root extends React.Component {
  render() {

    return (
      <div className="window-frame">

        <div className="headerbar">
          <button className="toolbutton">Header</button>
          <button className="toolbutton">Bar</button>
          {getIcon('lock', 22)}
        </div>
        <div className="searchbar">
          <input value={'test'} />
          {getIcon('lock', 22)}
        </div>
        <div className="actionbar">
          Action bar
        </div>
        <div className="levelbar">
          Level bar
        </div>
        <div className="primary-toolbar">
          <button className="toolbutton">Tool</button>
          <button className="toolbutton">Bar</button>
        </div>
        <div className="stack-switcher">
          <button className="image-button">+</button>
          <button className="image-button">-</button>
        </div>

        Test 123
        <div className="osd">
          <button>Test 123</button>
        </div>
        <div className="popover">Popover</div>
        <div className="notebook frame">
          <div className="header">Notebook frame</div>
        </div>
        <div className="paned">
          Paned
          <div className="horizontal separator" />
          Separation
        </div>
        <input placeholder="Input" />
        <div className="separator" />
        <input className="flat" placeholder="Flat input" />
        <div className="separator" />
        <input className="error" value="Error input" />
        <div className="separator" />
        <div className="treeview view progressbar" style={{width: '25%'}}>25% Progress</div>
        <input className="progress" placeholder="Flat input" value={'50% progress'} style={{width: '50%'}} />
        <div className="separator" />
        <textarea className="selected" />
        <div className="separator" />
        <a className="text-button">Test link</a>
        <input
        id="checkbox"
        type="checkbox"
        className="checkbox" />
        <input
        type="radio"  />
        <div className="open-document-selector-">
          <div className="treeview_view">

            Treeview
            <div className="treeview_view_expander_checked" />
          </div>
        </div>
        <div className="osd">OSD</div>
        <div className="spinbutton"><button className="toolbutton">Spinbutton</button></div>
        <div className="infobar info">Info bar</div>
        <div className="infobar question">Info bar question</div>
        <div className="infobar warning">Info bar warning</div>
        <div className="infobar error">Info bar error</div>
        <div className="row">Info bar error</div>
      </div>
    );
  }
} */

export default hot(module)(Root);