'use strict'

const fs = require('fs')

if (!fs.existsSync('data')) {
  fs.mkdirSync('data')
}

const logic = {
  _users: null,

  _validateStringField(fieldName, fieldValue) {
    if (typeof fieldValue !== 'string' || !fieldValue.length) throw new LogicError(`invalid ${fieldName}`)
  },

  _validateUserExists(username) {
    return this._users.findOne({username})
      .then(user => {
        if (!user) throw new LogicError(`user ${username} does not exist`)
      })
  },

  register(username, password) {
    return Promise.resolve()
      .then(() => {
        this._validateStringField('username', username)
        this._validateStringField('password', password)

        return this._users.findOne({username})
      })
      .then(user => {
        if (user) throw new LogicError(`user ${username} already exists`)

        const _user = {username, password}

        return this._users.insertOne(_user)
      })
      .then(() =>
        new Promise((resolve, reject) => {
          fs.mkdir(`data/${username}`, err => {
            if (err) return reject(err)

            fs.mkdir(`data/${username}/files`, err => {
              if (err) return reject(err)

              resolve()
            })
          })
        })
      )
  },

  authenticate(username, password) {

    return Promise.resolve()
      .then(() => {
        this._validateStringField('username', username)
        this._validateStringField('password', password)
        return this._validateUserExists(username)
      })

      .then(() => this._users.findOne({username}))
      .then(user => {
        if (user.password !== password) throw new LogicError('wrong credentials')
        return true
      })
  },

  updatePassword(username, password, newPassword) {

    return this.authenticate(username, password)
      .then(() => {
        this._validateStringField('new password', newPassword)
        if (password === newPassword) throw new LogicError('new password cannot be same as current password')
        return this._users.findOne({username})
      })
      .then(user => {

        this._users.updateOne(user, {$set: {password: newPassword}})
      })
      .then(() => true)
  },

  listFiles(username) {

    return Promise.resolve()
      .then(() => {
          this._validateStringField('username', username)

          return this._validateUserExists(username)
        }
      )
      .then(() => {
        return new Promise((resolve, reject) => {

          fs.readdir(`data/${username}/files`, (err, results) => {
            if (err) return reject(err)

            resolve(results)

          })
        })
      })


  },

  // DEPRECATED
  // TODO test!
  // getFilesFolder(username) {
  //     return `files/${username}`
  // }

  saveFile(username, filename, buffer) {

    return Promise.resolve()
      .then(_ => {

        this._validateStringField('username', username)
        this._validateStringField('filename', filename)
        if (typeof buffer === 'undefined' || /*!(buffer instanceof Buffer)*/ !Buffer.isBuffer(buffer)) throw new LogicError('invalid buffer')
        return this._validateUserExists(username)
      })
      .then(() => new Promise((resolve, reject) => {
        fs.writeFile(`data/${username}/files/${filename}`, buffer, (err, results) => {
          if (err) return reject(err)
          resolve(results)
        })
      }))
  },

  getFilePath(username, file) {

    return Promise.resolve()
      .then(_ => {
        this._validateStringField('username', username)
        this._validateStringField('file', file)
        return this._validateUserExists(username)
      })
      .then(_ => `data/${username}/files/${file}`)

  },

  removeFile(username, file) {

    return Promise.resolve()
      .then(_ => {
        this._validateStringField('username', username)
        this._validateStringField('file', file)
        return this._validateUserExists(username)
      })
      .then(_ => {
        return new Promise((resolve, reject) => {
          fs.unlink(`data/${username}/files/${file}`, (err) => {
            if (err) return reject(err)
            resolve()
          })

        })
      })
  }
}

class LogicError extends Error {
  constructor(message) {
    super(message)
  }
}

module.exports = {logic, LogicError}