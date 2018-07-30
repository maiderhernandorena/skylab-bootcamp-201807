import React, { Component } from 'react';
import { Route, withRouter, Redirect } from 'react-router-dom'

import Landing from './components/Landing'
import Register from './components/Register'
import Login from './components/Login'
import Main from './components/Main'
import Profile from './components/Profile'
import Gallery from './components/Gallery'
import Navbar from './components/Navbar'

class App extends Component {
  state = {
    // loggedIn: logic.loggedIn
    loggedIn: false
  }

  onRegister = () => this.props.history.push("/register")
  onLogin = () => this.props.history.push("/login")
  goToApp = () => this.props.history.push("/home")
  
  // return promise and handle error inside each component
  registerUser = (username, password) => {
    // logic.registerUser(username, password)
    //   .then(() => {
    //     this.onLogin()
    //     this.setState({ registerFail: null })
    //   })
    //   .catch((err) => {
    //     this.setState({ registerFail: err.message })
    //   })
    this.onLogin()
  }
  loginUser = (username, password) => {
    // logic.loginUser(username, password)
    //   .then(() => {
    //     this.setState({ loginFail: null, loggedIn: true })
    //     this.goToApp()
    //   })
    //   .catch((err) => {
    //     this.setState({ loginFail: err.message })
    //   })
    this.setState({loggedIn: true})
    this.goToApp()
  }
  updateUser = (password, newUsername, newPassword) => {
    // return logic.updateUser(password, newUsername, newPassword)
  }
  deleteUser = (password) => {
    // return logic.unregisterUser(password)
    //   .then(() => {
    //     this.logout()
    //   })
  }
  logout = () => {
    // logic.logout()
    this.setState({ loggedIn: false })
    this.props.history.push("/")
  }

  render() {
    const {
      state: {
        loggedIn
      },
      onRegister,
      onLogin,
      registerUser,
      loginUser,
      logout,
      updateUser,
      deleteUser
    } = this
    return (
      <div className="App">
        <Route exact path="/" render={() => !loggedIn ? <Landing onRegister={onRegister} onLogin={onLogin} /> : <Redirect to="/home" />} />
        <Route path="/register" render={() => !loggedIn ? <Register onRegister={registerUser} onLogin={onLogin} /> : <Redirect to="/home" />} />
        <Route path="/login" render={() => !loggedIn ? <Login onLogin={loginUser} onRegister={onRegister} /> : <Redirect to="/home" />} />
        <Route path="/home" render={() => loggedIn ? <Main onLogout={logout} /> : <Redirect to="/" />} />
        <Route path="/profile" render={() => loggedIn ? <Profile onLogout={logout} updateUser={updateUser} deleteUser={deleteUser} /> : <Redirect to="/" />} />
        <Route path="/gallery" render={() => loggedIn ? <Gallery /> : <Redirect to="/" />} />
        {loggedIn && <Navbar />}
      </div>
    );
  }
}

export default withRouter(App);
