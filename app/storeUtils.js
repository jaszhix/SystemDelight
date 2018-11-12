import {remote} from 'electron';
import React from 'react';
import {hot} from 'react-hot-loader';
import initStore from './store';
import {each} from './utils';

const state = initStore({
  interval: 1000,
  searchValue: '',
  view: 'kernels',
  ready: false,
  desktopData: [],
  enabledColumns: {
    processes: ['name', 'usage', 'vmrss', 'threads', 'nice', 'pid', 'state'],
    services: ['name', 'description', 'file', 'active', 'startup', 'started'],
    kernels: ['name', 'date', 'installed']
  },
  widths: {
    services: {
      name: 230,
      description: 366,
      file: 370,
      active: 50,
      startup: 125,
      started: 120
    },
    processes: {
      name: 295,
      usage: 100,
      vmrss: 85,
      threads: 80,
      nice: 75,
      pid: 70,
      state: 70
    },
    kernels: {
      name: 400,
      date: 200,
      installed: 80
    }
  }
});

window.state = state;

const StateContext = React.createContext('state');
export class BaseStoreContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = state;
    state.setState = (...args) => this.setState(...args);
    this.connectId = this.state.connect('*', (newState) => {
      if (newState.widths) {
        this.correctWidths(newState);
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('STATE INPUT: ', newState);
        let stackParts = new Error().stack.split('\n');
        console.log('STATE CALLEE: ', stackParts[3].trim());
      }
      this.setState(newState, () => console.log('STATE: ', this.state));
    });
    this.state.connect({
      correctWidths: () => this.correctWidths(this.state)
    });
  }
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    let Window = remote.getCurrentWindow();
    Window.on('maximize', () => setTimeout(() => this.state.trigger('resize'), 20));
    Window.on('unmaximize', () => setTimeout(() => this.state.trigger('resize'), 20));
    Window.on('resize', () => setTimeout(() => this.state.trigger('resize'), 20));
    this.handleResize();
  }
  componentWillUnmount = () => {
    window.removeEventListener('resize', this.handleResize);
    state.disconnect(this.connectId);
  }
  handleResize = () => {
    this.correctWidths(this.state);
    this.state.trigger('resize');
  }
  correctWidths = (newState) => {
    let newWidth = false;
    each(newState.widths, function(view, label) {
      let sum = 0;
      each(view, function(val) {
        sum += val;
      });
      if (sum > window.innerWidth - 30) {
        newWidth = true;
        let width = (window.innerWidth - 30) / Object.keys(view).length;
        each(view, function(val, key) {
          newState.widths[label][key] = width;
        });

      }
    })
    if (newWidth) {
      this.setState({widths: newState.widths});
    }
  }
  render() {
    return (
      <StateContext.Provider value={this.state}>
        {this.props.children}
      </StateContext.Provider>
    );
  }
}

BaseStoreContainer = hot(module)(BaseStoreContainer);

export function withState(Component) {
  return function StateComponent(props) {
    return (
      <StateContext.Consumer>
        {state => <Component {...props} s={state} />}
      </StateContext.Consumer>
    );
  };
}