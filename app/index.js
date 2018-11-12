import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import {BaseStoreContainer} from './storeUtils';
import getTheme from 'electron-gtk-theme';
//import './styles/flexbodgrid2.css';
import './app.global.css';

window.iconPaths = [];

const init = function() {
  const NextRoot = require('./root').default;
  getTheme({
    outputPath: __dirname,
  }).then(function(themeData) {
    window.iconPaths = themeData.iconPaths;
    render(
      <AppContainer>
        <BaseStoreContainer>
          <NextRoot />
        </BaseStoreContainer>
      </AppContainer>,
      document.getElementById('root')
    );
  });
};

init();

if (module.hot) {
  module.hot.accept('./root', () => init());
}

(function(window) {
  document.onmousemove = handleMouseMove;
  function handleMouseMove(e) {
    window.cursor = {
      page: {
        x: e.pageX,
        y: e.pageY
      },
      offset: {
        x: e.offsetX,
        y: e.offsetY,
      },
      keys: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey
      }
    };
  }
})(window);