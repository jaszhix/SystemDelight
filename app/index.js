import {remote} from 'electron';
import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import Root from './root';
import {BaseStoreContainer} from './storeUtils';
import getTheme from 'electron-gtk-theme';
//import './styles/flexbodgrid2.css';
import './app.global.css';

getTheme({
  outputPath: __dirname,
}).then(function(themeData) {
  window.iconPaths = themeData.iconPaths;
  render(
    <AppContainer>
      <BaseStoreContainer>
        <Root />
      </BaseStoreContainer>
    </AppContainer>,
    document.getElementById('root')
  );
});

if (module.hot) {
  module.hot.accept('./root', () => {
    const NextRoot = require('./root'); // eslint-disable-line global-require
    render(
      <AppContainer>
        <BaseStoreContainer>
          <NextRoot />
        </BaseStoreContainer>
      </AppContainer>,
      document.getElementById('root')
    );
  });
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