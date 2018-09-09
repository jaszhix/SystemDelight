import React from 'react';
import {hot} from 'react-hot-loader';

import {map} from './utils';
import {withState} from './storeUtils';
import Toolbar from './components/toolbar';
import Resources from './components/resources';
import ProcessTable from './components/processTable';
import ServicesTable from './components/servicesTable';

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
      </div>
    );
  }
}
Root = withState(Root);

export default hot(module)(Root);