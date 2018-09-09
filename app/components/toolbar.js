import {remote} from 'electron';
import React from 'react';
import {hot} from 'react-hot-loader';
import {map} from '../utils';
import {upperFirst} from 'lodash';
import {withState} from '../storeUtils';

const {Menu, dialog, app, getCurrentWindow} = remote;

const toolbarButtons = [
  'processes',
  'resources',
  'services'
];

class Toolbar extends React.Component {
  handleSearchChange = (e) => {
    this.props.s.set({searchValue: e.target.value});
  }
  handleMenu = (e) => {
    let {left, bottom} = e.currentTarget.getBoundingClientRect();
    const contextOptions = [
      {
        label: 'Options',
        click: () => null
      },
      {
        label: 'About',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            buttons: [],
            title: 'System Delight',
            message: 'v0.0.1',
            detail: `
Copyright (C) 2018 Jason Hicks and Contributors

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
            `
          });
        }
      },
      {
        label: 'Quit',
        click: app.quit
      }

    ];
    Menu
      .buildFromTemplate(contextOptions)
      .popup({
        window: getCurrentWindow(),
        x: left,
        y: bottom,
      });
  }
  render() {
    let {searchValue, view, set} = this.props.s;
    return (
      <div className="inline-toolbar">
        {/* getIcon('system-file-manager-panel', 22) */}
        <div className="inline-toolbar-container">
          <button
          className="menuitembutton flat"
          onClick={this.handleMenu}>
            <i className="icon-menu7" />
          </button>
          {map(toolbarButtons, function(label) {
            return (
              <button
              key={label}
              className={`toolbutton${view === label ? ' floating-bar' : ''}`}
              onClick={() => set({view: label})}>
                {upperFirst(label)}
              </button>
            );
          })}
          <div className="search-container">
            <input value={searchValue} onChange={this.handleSearchChange} placeholder="Search" />
          </div>
        </div>
      </div>
    );
  }
}
Toolbar = withState(Toolbar);

export default hot(module)(Toolbar);