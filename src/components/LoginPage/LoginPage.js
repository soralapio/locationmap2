import React, { Component } from 'react';
import _ from 'lodash';
import autobind from 'auto-bind';

import store from '../../stores';
import request from '../../utils/request';

export default class LoginPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      password: '',
      error: null,
    };

    autobind(this);
  }

  handlePasswordChange(event) {
    const password = event.target.value;
    this.setState({ password });
  }

  handleKeyDown(event) {
    // login on Enter-press
    if (event.keyCode === 13) {
      this.login();
    }
  }

  async login() {
    this.setState({ error: null });
    try {
      await request.post('/login/', { password: this.state.password });
      store.login();
    } catch (error) {
      console.error(error);
      if (_.get(error, 'response.status') === 401) {
        this.setState({ error: 'Wrong password' });
      } else {
        this.setState({ error: 'Something went wrong.' });
      }
    }
  }

  render() {
    return (
      <div>
        <h1>Login</h1>
        <input
          placeholder="password"
          type="password"
          value={this.state.password}
          onChange={this.handlePasswordChange}
          onKeyDown={this.handleKeyDown}
        />
        <button onClick={this.login}>Login</button>
        {this.state.error && <div style={{ color: 'red' }}>{this.state.error}</div>}
      </div>
    );
  }
}
