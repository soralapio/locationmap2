import React, { Component } from 'react';
import { observer } from 'mobx-react';
import './App.css';

import Map from '../Map/Map';
import LoginPage from '../LoginPage/LoginPage';
import store from '../../stores';

class App extends Component {
  render() {
    if (store.loadingFirstTime) {
      return <div className="Loading">Loading</div>;
    }
    return <div className="App">{!store.loggedIn ? <LoginPage /> : <Map />}</div>;
  }
}

export default observer(App);
