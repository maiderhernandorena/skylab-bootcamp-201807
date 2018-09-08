require('dotenv').config()
require('isomorphic-fetch')

const logic = require('.')
const {expect} = require('chai')
const {mongoose, models: {User, Game}} = require('chess-data')
const {Types: {ObjectId}} = mongoose
const {Chess} = require('chess.js')
const uuidv1 = require('uuid/v1');
const randomEmail = require('random-email');
const {env: {MONGO_URL,JWT_SECRET}} = process
const jwt = require('jsonwebtoken')

describe('logic', () => {
  const email = `blippy-${Math.random()}@mail.com`, password = `123-${Math.random()}`,
    nickname = `blippy-${Math.random()}`
  const email2 = `bloopy-${Math.random()}@mail.com`, nickname2 = `bloopy-${Math.random()}`
  let _connection
  let usersCount = 0
  let users = []
  let engines = new Map

  before(() =>
    mongoose.connect(MONGO_URL, {useNewUrlParser: true})
      .then(conn => _connection = conn)
  )

  beforeEach(() =>
    Promise.all([
      User.deleteMany()
    ])
      .then(_ => Promise.all([
        Game.deleteMany()
      ]))
      .then(() => {
        engines = new Map
        let count = Math.floor(Math.random() * 100)

        const creations = []

        while (count--) creations.push({
          nickname: `other-${Math.random()}`,
          email: `other-${Math.random()}@mail.com`,
          password: `123-${Math.random()}`
        })
        users = creations.slice()
        if (usersCount = creations.length)
          return User.create(creations)
      })
      .then(() => {
        const creations = []
        for (let i = 0; i < (users.length / 2) - 1; i++) {
          let engine = new Chess()
          let uuid = uuidv1()
          engines.set(uuid, engine)
          let pgn = engine.pgn()
          creations.push({
            initiator: users[i].nickname,
            acceptor: users[users.length - i - 1].nickname,
            engineID: uuid,
            pgn,
            winner: "",
            state: "invited",
            toPlay: users[i].nickname,
            inCheck: false,
            inDraw: false,
            inStalemate: false,
            inCheckmate: false,
            inThreefoldRepetition: false,
            insufficientMaterial: false,
            hasAcknowledgedGameOver: [],
          })
        }
        if (creations.length)
          return Game.create(creations)
      })
  )


  describe('validate fields', () => {
    it('should succeed on correct value', () => {
      expect(() => logic._validateStringField('email', email).to.equal(email))
      expect(() => logic._validateStringField('password', password).to.equal(password))
    })

    it('should fail on undefined value', () => {
      expect(() => logic._validateStringField('name', undefined)).to.throw(`invalid name`)
    })

    it('should fail on empty value', () => {
      expect(() => logic._validateStringField('name', '')).to.throw(`invalid name`)
    })

    it('should fail on numeric value', () => {
      expect(() => logic._validateStringField('name', 123)).to.throw(`invalid name`)
    })
  })

  describe('register user', () => {
    it('should register correctly', () =>
      User.findOne({nickname})
        .then(user => {
          expect(user).to.be.null

          return logic.register(email, nickname, password)
        })
        .then(res => {
          expect(res).to.be.true

          return User.findOne({nickname})
        })
        .then(user => {
          expect(user).to.exist
          expect(user.email).to.equal(email)
          expect(user.password).to.equal(password)
          expect(user.nickname).to.equal(nickname)

          return User.find()
        })
        .then(users => expect(users.length).to.equal(usersCount + 1))
    )

    it('should fail on trying to register an already registered email', () =>
      User.create({email, password, nickname})
        .then(() => logic.register(email, nickname2, password))
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`user with ${email} email already exists`))
    )

    it('should fail on trying to register an already registered nickname', () =>
      User.create({email, password, nickname})
        .then(() => logic.register(email2, nickname, password))
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`user with ${nickname} nickname already exists`))
    )

    it('should fail on trying to register with an undefined email', () =>
      logic.register(undefined, nickname, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to register with an empty email', () =>
      logic.register('', nickname, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to register with an empty nickname', () =>
      logic.register(email, '', password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )
    it('should fail on trying to register with an undefined nickname', () =>
      logic.register(email, undefined, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )


    it('should fail on trying to register with a numeric nickname', () =>
      logic.register(email, 123, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )


    it('should fail on trying to register with a numeric email', () =>
      logic.register(123, nickname, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to register with an undefined password', () =>
      logic.register(email, nickname, undefined)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to register with an empty password', () =>
      logic.register(email, nickname, '')
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to register with a numeric password', () =>
      logic.register(email, nickname, 123)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )
  })

  describe('authenticate user', () => {
    beforeEach(() => User.create({email, password, nickname}))

    it('should login correctly', () =>
      logic.authenticate(nickname, password)
        .then(token => {
          expect(token).to.be.a('string')

          let payload

          expect(() => payload = jwt.verify(token, JWT_SECRET)).not.to.throw()
          expect(payload.sub).to.equal(nickname)        })
    )

    it('should fail on trying to login with an undefined nickname', () =>
      logic.authenticate(undefined, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail on trying to login with an empty nickname', () =>
      logic.authenticate('', password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail on trying to login with a numeric nickname', () =>
      logic.authenticate(123, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail on trying to login with an undefined password', () =>
      logic.authenticate(nickname, undefined)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to login with an empty password', () =>
      logic.authenticate(nickname, '')
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to login with a numeric password', () =>
      logic.authenticate(nickname, 123)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )
  })

  false && describe('update user', () => {
    const newPassword = `${password}-${Math.random()}`

    beforeEach(() => User.create({email, password}))

    it('should update password correctly', () =>
      logic.updatePassword(email, password, newPassword)
        .then(res => {
          expect(res).to.be.true

          return User.findOne({email})
        })
        .then(user => {
          expect(user).to.exist
          expect(user.email).to.equal(email)
          expect(user.password).to.equal(newPassword)
        })
    )

    it('should fail on trying to update password with an undefined email', () =>
      logic.updatePassword(undefined, password, newPassword)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to update password with an empty email', () =>
      logic.updatePassword('', password, newPassword)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to update password with a numeric email', () =>
      logic.updatePassword(123, password, newPassword)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to update password with an undefined password', () =>
      logic.updatePassword(email, undefined, newPassword)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to update password with an empty password', () =>
      logic.updatePassword(email, '', newPassword)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to update password with a numeric password', () =>
      logic.updatePassword(email, 123, newPassword)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to update password with an undefined new password', () =>
      logic.updatePassword(email, password, undefined)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid new password`))
    )

    it('should fail on trying to update password with an empty new password', () =>
      logic.updatePassword(email, password, '')
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid new password`))
    )

    it('should fail on trying to update password with a numeric new password', () =>
      logic.updatePassword(email, password, 123)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid new password`))
    )
  })

  false && describe('unregister user', () => {
    beforeEach(() => User.create({email, password}))

    it('should unregister user correctly', () =>
      logic.unregisterUser(email, password)
        .then(res => {
          expect(res).to.be.true

          return User.findOne({email})
        })
        .then(user => {
          expect(user).not.to.exist
        })
    )

    it('should fail on trying to unregister user with an undefined email', () =>
      logic.unregisterUser(undefined, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to unregister user with an empty email', () =>
      logic.unregisterUser('', password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to unregister user with a numeric email', () =>
      logic.unregisterUser(123, password)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid email`))
    )

    it('should fail on trying to unregister user with an undefined password', () =>
      logic.unregisterUser(email, undefined)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to unregister user with an empty password', () =>
      logic.unregisterUser(email, '')
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )

    it('should fail on trying to unregister user with a numeric password', () =>
      logic.unregisterUser(email, 123)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid password`))
    )
  })

  describe('get games for user', () => {

    let token, token2
    beforeEach(async () => {

        await User.create({email, password, nickname})
        await User.create({email: email2, password, nickname: nickname2})
        token = await logic.authenticate(nickname, password)
        token2 = await logic.authenticate(nickname2, password)
        for (let i = 0; i < 3; i++) {
          let engine = new Chess()
          let uuid = uuidv1()
          engines.set(uuid, engine)
          let pgn = engine.pgn()

          await Game.create({
            initiator: nickname,
            acceptor: `blippy-${i}`,
            engineID: uuid,
            pgn,
            winner: "",
            state: "invited",
            toPlay: nickname,
            inCheck: false,
            inDraw: false,
            inStalemate: false,
            inCheckmate: false,
            inThreefoldRepetition: false,
            insufficientMaterial: false,
            hasAcknowledgedGameOver: [],
          })
        }

    })

    it('should get games correctly', () =>
      logic.getGamesForUser(nickname,token)
        .then(res => {
          expect(res).to.be.an('array')
          expect(res.length).to.equal(3)
          expect(res[0].initiator).to.equal(nickname)
          expect(res[1].initiator).to.equal(nickname)
          expect(res[2].initiator).to.equal(nickname)
          expect(res[0].acceptor).to.equal('blippy-0')
          expect(res[1].acceptor).to.equal('blippy-1')
          expect(res[2].acceptor).to.equal('blippy-2')
          expect(res[0].state).to.equal('invited')
          expect(res[1].state).to.equal('invited')
          expect(res[2].state).to.equal('invited')
        })
    )


    it('should return empty array when no games exist for user', () =>
      logic.getGamesForUser(nickname2,token2)
        .then(res => {
          expect(res).to.be.an('array')
          expect(res.length).to.equal(0)
        })
    )

    it('should fail for empty nickname', () =>
      logic.getGamesForUser('',token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for undefined nickname', () =>
      logic.getGamesForUser(undefined,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for numeric nickname', () =>
      logic.getGamesForUser(1234,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )


  })



  describe('get users for string', () => {
    const nickname0 = "Abcedgh"
    const nicknameA = "Abracadabra"
    const nicknameB = "baldroSa"
    const nicknameC = "¢”#≠”¢"

    beforeEach(async () => {

      await User.create({email: randomEmail({domain: 'example.com'}), password, nickname: nickname0})
      await User.create({email: randomEmail({domain: 'example.com'}), password, nickname: nicknameA})
      await User.create({email: randomEmail({domain: 'example.com'}), password, nickname: nicknameB})
      await User.create({email: randomEmail({domain: 'example.com'}), password, nickname: nicknameC})
      token = await logic.authenticate(nickname0, password)

    })

    it('should return correct users for one letter string', () =>
      logic.getUsersForString(nickname0, 'a',token)
        .then(res => {
          expect(res).to.be.an('array')
          expect(res.length).to.equal(2)
          expect(res[0]).to.equal(nicknameA)
          expect(res[1]).to.equal(nicknameB)
        })
    )

    it('should return correct users for multi letter string', () =>
      logic.getUsersForString(nickname0, 'cadab',token)
        .then(res => {
          expect(res).to.be.an('array')
          expect(res.length).to.equal(1)
          expect(res[0]).to.equal(nicknameA)
        })
    )

    it('should return empty array for empty string', () =>
      logic.getUsersForString(nickname0, '',token)
        .then(res => {
          expect(res).to.be.an('array')
          expect(res.length).to.equal(0)
        })
    )

    it('should return empty array for wrong character string', () =>
      logic.getUsersForString(nickname0, 'xxx',token)
        .then(res => {
          expect(res).to.be.an('array')
          expect(res.length).to.equal(0)
        })
    )

    it('should fail for numeric term', () =>
      logic.getUsersForString(nickname0, 123,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid str`))
    )

    it('should fail for missing nickname', () =>
      logic.getUsersForString('', 'a',token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for undefined nickname', () =>
      logic.getUsersForString(undefined, 'a',token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for numeric nickname', () =>
      logic.getUsersForString(123, 'a',token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )
  })

  describe('acknowledge game over for user', () => {

    const email1 = randomEmail({domain: 'example.com'})
    const email2 = randomEmail({domain: 'example.com'})
    let game0State, game1State


    beforeEach(async () => {
      await User.create({email: email1, password, nickname: nickname})
      await User.create({email: email2, password, nickname: nickname2})
      token = await logic.authenticate(nickname, password)
      token2 = await logic.authenticate(nickname2, password)

      let engine = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3') // game in checkmate
      let uuid = uuidv1()
      engines.set(uuid, engine)
      let pgn = engine.pgn()
      game0State = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: "",
        state: "playing",
        toPlay: nickname,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
      engine = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3') // game in checkmate
      uuid = uuidv1()
      engines.set(uuid, engine)
      pgn = engine.pgn()
      game1State = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: "",
        state: "playing",
        toPlay: nickname,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [nickname],
      })
    })


    it('should succeed for correct nickname and gameID with game having 0 acknowledgements', () =>
      logic.onAcknowledgeGameOver(nickname, game0State.id, token)
        .then(res => {
          expect(res).to.deep.equal({ message: 'game terminated' })
          return Game.findOne({_id: game0State._id})
        })
        .then(game => {
          const engine = engines.get(game.engineID)
          expect(engine).to.exist
          expect(game.hasAcknowledgedGameOver.length).to.equal(1)
          expect(game.hasAcknowledgedGameOver[0]).to.equal(nickname)
          expect(game.state).to.equal('playing')
        })
    )


    it('should succeed for correct nickname and gameID with game having 1 acknowledgement', () =>
      logic.onAcknowledgeGameOver(nickname2, game1State.id, token2)
        .then(res => {
          expect(res).to.deep.equal({ message: 'game terminated' })
          return Game.findOne({_id: game1State._id})
        })
        .then(game => {
          const engine = engines.get(game.engineID)
          expect(engine).to.exist
          expect(game.hasAcknowledgedGameOver.length).to.equal(2)
          expect(game.hasAcknowledgedGameOver[0]).to.equal(nickname)
          expect(game.hasAcknowledgedGameOver[1]).to.equal(nickname2)
          expect(game.state).to.equal('terminated')
        })
    )

    it('should fail for incorrect nickname ', () =>
      logic.onAcknowledgeGameOver("georgeJones", game0State.id, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid token`))
    )

    it('should fail for missing nickname ', () =>
      logic.onAcknowledgeGameOver("", game0State.id, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for undefined nickname ', () =>
      logic.onAcknowledgeGameOver(undefined, game0State.id, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for numeric nickname ', () =>
      logic.onAcknowledgeGameOver(123, game0State.id, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )
    it('should fail for incorrect gameID', () => {
        const id = new ObjectId().toString()
        return logic.onAcknowledgeGameOver(nickname, id, token)
          .catch(err => err)
          .then(({message}) => expect(message).to.equal(`game with id ${id} does not exist`))
      }
    )
    it('should fail for missing gameID', () =>
      logic.onAcknowledgeGameOver(nickname, '', token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    )
    it('should fail for undefined gameID', () =>
      logic.onAcknowledgeGameOver(nickname, undefined, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    )
    it('should fail for numeric gameID', () =>
      logic.onAcknowledgeGameOver(nickname, 123434, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    )
  }) // end describe acknowledge game over for user

  describe('make a game move', () => {

    const email1 = randomEmail({domain: 'example.com'})
    const email2 = randomEmail({domain: 'example.com'})

    let gameInProgress, gameInCheckmate, gameOneBeforeCheckmate, gameOneBeforeStalemate, gameNotInCheck
    let badGameID

    beforeEach(async () => {

      badGameID = (new ObjectId()).toString()

      await User.create({email: email1, password, nickname: nickname})
      await User.create({email: email2, password, nickname: nickname2})
      token = await logic.authenticate(nickname, password)

      let engine = new Chess() // game in progress
      let uuid = uuidv1()
      engines.set(uuid, engine)
      let pgn = engine.pgn()
      gameInProgress = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: "",
        state: "playing",
        toPlay: nickname,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
      engine = new Chess('rnbqkbnr/pppp1ppp/8/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq g3 0 2') // game in progress one before checkmate
      uuid = uuidv1()
      engines.set(uuid, engine)
      pgn = engine.pgn()
      gameOneBeforeCheckmate = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: "",
        state: "playing",
        toPlay: nickname2,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
      engine = new Chess('rnbqkbnr/ppp2ppp/8/3pp3/3P4/3Q4/PPP1PPPP/RNB1KBNR w KQkq e6 0 3') // game not in check
      uuid = uuidv1()
      engines.set(uuid, engine)
      pgn = engine.pgn()
      gameNotInCheck = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: "",
        state: "playing",
        toPlay: nickname,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
      engine = new Chess('4k3/4P3/8/4K3/8/8/8/8 w - - 0 1') // game one before stalemate
      uuid = uuidv1()
      engines.set(uuid, engine)
      pgn = engine.pgn()
      gameOneBeforeStalemate = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: "",
        state: "playing",
        toPlay: nickname,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
      engine = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3') // game in checkmate
      uuid = uuidv1()
      engines.set(uuid, engine)
      pgn = engine.pgn()
      gameInCheckmate = await Game.create({
        initiator: nickname,
        acceptor: nickname2,
        engineID: uuid,
        pgn,
        winner: nickname2,
        state: "playing",
        toPlay: nickname,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: true,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
      logic._currentEngines = engines
    })

    //makeAGameMove(nickname, opponent, move, gameID, token) {

    it('should succeed for correct nickname, move and gameID with game in progress', () =>
      logic.makeAGameMove(nickname, nickname2,{from: "e2", to: "e4", promotion: "q"}, gameInProgress.id,token)
        .then(res => {
          expect(res).to.be.true
          return Game.findOne({_id: gameInProgress._id})
        })
        .then(game => {
          const engine = engines.get(game.engineID)
          expect(engine).to.not.be.undefined
          expect(engine.fen()).to.equal('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
          expect(game.state).to.equal('playing')
          expect(game.toPlay).to.equal(nickname2)
          expect(game.winner).to.equal('')
          expect(game.initiator).to.equal(nickname)
          expect(game.acceptor).to.equal(nickname2)
          expect(game.inCheckmate).to.be.false
          expect(game.inThreefoldRepetition).to.be.false
          expect(game.inStalemate).to.be.false
          expect(game.inCheck).to.be.false
          expect(game.insufficientMaterial).to.be.false
          expect(game.inDraw).to.be.false
        })
    )

    it('should succeed for game one before check with correct nickname, move and gameID with game in progress', () =>
      logic.makeAGameMove(nickname,nickname2, {from: "d3", to: "b5", promotion: "q"}, gameNotInCheck.id, token)
        .then(res => {
          expect(res).to.be.true
          return Game.findOne({_id: gameNotInCheck._id})
        })
        .then(game => {
          const engine = engines.get(game.engineID)
          expect(engine).to.not.be.undefined
          expect(engine.fen()).to.equal('rnbqkbnr/ppp2ppp/8/1Q1pp3/3P4/8/PPP1PPPP/RNB1KBNR b KQkq - 1 3')
          expect(game.state).to.equal('playing')
          expect(game.toPlay).to.equal(nickname2)
          expect(game.winner).to.equal('')
          expect(game.initiator).to.equal(nickname)
          expect(game.acceptor).to.equal(nickname2)
          expect(game.inCheckmate).to.be.false
          expect(game.inThreefoldRepetition).to.be.false
          expect(game.inStalemate).to.be.false
          expect(game.inCheck).to.be.true
          expect(game.insufficientMaterial).to.be.false
          expect(game.inDraw).to.be.false
        })
    )

    it('should fail for correct nickname, move and gameID with impossible move with game in progress', () =>
      logic.makeAGameMove(nickname,  nickname2,{from: "e2", to: "e6", promotion: "q"}, gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`move is not allowed`))
    )

    it('should fail when game is over (in checkmate) for correct nickname, move and gameID', () =>
      logic.makeAGameMove(nickname,  nickname2, {from: "e2", to: "e4", promotion: "q"},gameInCheckmate.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game is over, cannot move`))
    )

    it('should succeed when game is one move before checkmate for correct nickname, move and gameID with game in progress', () =>
      logic.makeAGameMove(nickname2,  nickname2, {from: "d8", to: "h4", promotion: "q"},gameOneBeforeCheckmate.id,token)
        .then(res => {
          expect(res).to.be.true
          return Game.findOne({_id: gameOneBeforeCheckmate._id})
        })
        .then(game => {
          const engine = engines.get(game.engineID)
          expect(engine).to.not.be.undefined
          expect(engine.fen()).to.equal('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3')
          expect(engine.game_over()).to.be.true
          expect(game.inCheckmate).to.be.true
          expect(game.inCheck).to.be.false
          expect(game.inDraw).to.be.false
          expect(game.inThreefoldRepetition).to.be.false
          expect(game.inStalemate).to.be.false
          expect(game.state).to.equal('playing')
          //    expect(game.toPlay).to.equal(nickname)  ??? maybe it's not set after checkmate?
          expect(game.winner).to.equal(game.acceptor)
          expect(game.initiator).to.equal(nickname)
          expect(game.acceptor).to.equal(nickname2)
        })
    )


    it('should succeed when game is one move before stalemate for correct nickname, move and gameID with game in progress', () =>
      logic.makeAGameMove(nickname,   nickname2,{from: "e5", to: "e6", promotion: "q"},gameOneBeforeStalemate.id,token)
        .then(res => {
          expect(res).to.be.true
          return Game.findOne({_id: gameOneBeforeStalemate._id})
        })
        .then(game => {
          const engine = engines.get(game.engineID)
          expect(engine).to.not.be.undefined
          expect(engine.fen()).to.equal('4k3/4P3/4K3/8/8/8/8/8 b - - 1 1')
          expect(engine.game_over()).to.be.true
          expect(game.inCheckmate).to.be.false
          expect(game.inCheck).to.be.false
          expect(game.inDraw).to.be.true
          expect(game.inThreefoldRepetition).to.be.false
          expect(game.inStalemate).to.be.true
          expect(game.state).to.equal('playing')
          expect(game.toPlay).to.equal(game.initiator)
          expect(game.winner).to.equal("no winner")
          expect(game.initiator).to.equal(nickname)
          expect(game.acceptor).to.equal(nickname2)
        })
    )

    it('should fail for correct nickname, move and bad gameID', () =>
      logic.makeAGameMove(nickname, nickname2, {from: "e2", to: "e4", promotion: "q"}, badGameID,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game with id ${badGameID} does not exist`))
    )

    it('should fail for correct nickname, move and missing gameID', () =>
      logic.makeAGameMove(nickname,  nickname2, {from: "e2", to: "e4", promotion: "q"},'',token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    )

    it('should fail for correct nickname, move and undefined gameID', () =>
      logic.makeAGameMove(nickname,  nickname2,{from: "e2", to: "e4", promotion: "q"},undefined, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    )

    it('should fail for correct nickname, move and numeric gameID', () =>
      logic.makeAGameMove(nickname,  nickname2, {from: "e2", to: "e4", promotion: "q"},123,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    )

    it('should fail for correct move, gameID and bad nickname', () =>
      logic.makeAGameMove("buddy",  nickname2, {from: "e2", to: "e4", promotion: "q"},gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game with id ${gameInProgress.id} does not belong to user buddy`))
    )

    it('should fail for correct move, gameID and missing nickname', () =>
      logic.makeAGameMove("",  nickname2, {from: "e2", to: "e4", promotion: "q"},gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for correct move, gameID and undefined nickname', () =>
      logic.makeAGameMove(undefined,  nickname2, {from: "e2", to: "e4", promotion: "q"},gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for correct move, gameID and numeric nickname', () =>
      logic.makeAGameMove(123, nickname2, {from: "e2", to: "e4", promotion: "q"},gameInProgress.id, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail for correct nickname, gameID and malformed move', () =>
      logic.makeAGameMove(nickname,  nickname2, {x: "e2", to: "e4", promotion: "q"},gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`move is of wrong format`))
    )

    it('should fail for correct nickname, gameID and empty move', () =>
      logic.makeAGameMove(nickname,  nickname2,{},gameInProgress.id, token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`move is of wrong format`))
    )

    it('should fail for correct nickname, gameID and undefined move', () =>
      logic.makeAGameMove(nickname,  nickname2, undefined,gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`move is of wrong format`))
    )

    it('should fail for correct nickname, gameID and numeric move', () =>
      logic.makeAGameMove(nickname,  nickname2, 112,gameInProgress.id,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`move is of wrong format`))
    )
  }) // end make a game move


  describe('request new game', () => {

    const email1 = randomEmail({domain: 'example.com'})
    const email2 = randomEmail({domain: 'example.com'})
    nicknameA = uuidv1()
    nicknameB = uuidv1()

    beforeEach(async () => {
      await User.create({email: email1, password, nickname: nicknameA})
      await User.create({email: email2, password, nickname: nicknameB})
      token = await logic.authenticate(nicknameA, password)
    })

    it('should succeed with correct requester and destination', () =>
      logic.requestGame(nicknameA, nicknameB,token)
        .then(res => {
          expect(res).to.deep.equal({ message: 'game requested' })
          return Game.findOne({initiator: nicknameA, acceptor: nicknameB})
        })
        .then(game => {
          expect(game).not.to.be.undefined
          expect(game.initiator).to.equal(nicknameA)
          expect(game.acceptor).to.equal(nicknameB)
          expect(game.state).to.equal('invited')
          return Game.find({initiator: nicknameA, acceptor: nicknameB})
        })
        .then(games => expect(games.length).to.equal(1))
    )

    it('should fail when game already exists between players ', () =>
      Promise.resolve()
        .then(_ => {
          engine = new Chess()
          uuid = uuidv1()
          engines.set(uuid, engine)
          pgn = engine.pgn()
          return Game.create({
            initiator: nicknameA,
            acceptor: nicknameB,
            engineID: uuid,
            pgn,
            winner: "",
            state: "invited",
            toPlay: nicknameA,
            inCheck: false,
            inDraw: false,
            inStalemate: false,
            inCheckmate: false,
            inThreefoldRepetition: false,
            insufficientMaterial: false,
            hasAcknowledgedGameOver: [],
          })
        })
        .then(_ => logic.requestGame(nicknameA, nicknameB,token))
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game between ${nicknameA} and ${nicknameB} already exists`))
    )

    it('should fail when destination user does not exist', () =>
      logic.requestGame(nicknameA, "sorry charlie",token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`user with sorry charlie nickname does not exist`))
    )

    it('should fail when requesting user does not exist', () =>
      logic.requestGame('tricky rabbit', nicknameB,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid token`))
    )

    it('should fail when requesting user nickname missing', () =>
      logic.requestGame('', nicknameB,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail when requesting user nickname undefined', () =>
      logic.requestGame(undefined, nicknameB,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )
    it('should fail when requesting user nickname numeric', () =>
      logic.requestGame(123, nicknameB,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid nickname`))
    )

    it('should fail when destination user nickname missing', () =>
      logic.requestGame(nicknameA, '',token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid opponent`))
    )

    it('should fail when destination user nickname undefined', () =>
      logic.requestGame(nicknameA, undefined,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid opponent`))
    )
    it('should fail when destination user nickname numeric', () =>
      logic.requestGame(nicknameA, 123,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid opponent`))
    )

  }) // end request new game

  describe('respond to game request', () => {


    const email1 = randomEmail({domain: 'example.com'})
    const email2 = randomEmail({domain: 'example.com'})
    let nicknameA
    let nicknameB
    let game
    let uuid
    let engine
    let pgn
    let badID

    beforeEach(async () => {

      nicknameA = uuidv1()
      nicknameB = uuidv1()
      engine = new Chess()
      uuid = uuidv1()
      engines.set(uuid, engine)
      pgn = engine.pgn()
      badID = new ObjectId().toString()

      await User.create({email: email1, password, nickname: nicknameA})
      await User.create({email: email2, password, nickname: nicknameB})
      token = await logic.authenticate(nicknameB, password)

      game = await Game.create({
        initiator: nicknameA,
        acceptor: nicknameB,
        engineID: uuid,
        pgn,
        winner: "",
        state: "invited",
        toPlay: nicknameA,
        inCheck: false,
        inDraw: false,
        inStalemate: false,
        inCheckmate: false,
        inThreefoldRepetition: false,
        insufficientMaterial: false,
        hasAcknowledgedGameOver: [],
      })
    })

    expect('it to succeed with correct usernames, gameID and afffirmative answer', () =>
      logic.respondToGameRequest(nicknameB, nicknameA, game.id, true,token)
        .then(res => {
          expect(res).to.deep.equal({ message: 'game requested' })
          expect(game.state).to.equal('playing')
        })
    )

    expect('it to succeed with correct usernames, gameID and negative answer', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, game.id, true,token)
        .then(res => {
          expect(res).to.deep.equal({ message: 'game requested' })
          expect(game.state).to.equal('terminated')
        })
    })

    expect('it to fail with string answer', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, badID, 'true',token)
        .catch(err => err)
        .then(({ message }) => expect(message).to.equal(`answer is not type boolean`))
    })

    expect('it to fail with missing answer', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, badID, '',token)
        .catch(err => err)
        .then(({ message }) => expect(message).to.equal(`answer is not type boolean`))
    })

    expect('it to fail with undefined answer', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, badID, undefined,token)
        .catch(err => err)
        .then(({ message }) => expect(message).to.equal(`answer is not type boolean`))
    })

    expect('it to fail with numeric answer', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, badID, 123,token)
        .catch(err => err)
        .then(({ message }) => expect(message).to.equal(`answer is not type boolean`))
    })


    expect('it to fail with wrong game id', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, badID, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game with id ${badID} does not exist`))
    })

    expect('it to fail with missing game id', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, '', true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    })

    expect('it to fail with undefined game id', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, undefined, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    })

    expect('it to fail with numeric game id', () => {
      logic.respondToGameRequest(nicknameB, nicknameA, 123, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid gameID`))
    })

    expect('it to fail with wrong confirmer', () => {
      logic.respondToGameRequest("smithy", nicknameA, game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game with id ${game.id} does not belong to smithy`))
    })

    expect('it to fail with missing confirmer', () => {
      logic.respondToGameRequest('', nicknameA, game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid confirmer`))
    })

    expect('it to fail with undefined confirmer', () => {
      logic.respondToGameRequest(undefined, nicknameA, game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid confirmer`))
    })

    expect('it to fail with numeric confirmer', () => {
      logic.respondToGameRequest(123, nicknameA, game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid confirmer`))
    })

    expect('it to fail with wrong destination', () => {
      logic.respondToGameRequest(nicknameA, "will robinson", game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`game with id ${game.id} does not belong to smithy`))
    })

    expect('it to fail with missing destination', () => {
      logic.respondToGameRequest(nicknameA, "", game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid destination`))
    })

    expect('it to fail with undefined destination', () => {
      logic.respondToGameRequest(nicknameA, undefined, game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid destination`))
    })

    expect('it to fail with undefined destination', () => {
      logic.respondToGameRequest(nicknameA, 123, game.id, true,token)
        .catch(err => err)
        .then(({message}) => expect(message).to.equal(`invalid destination`))
    })


  })


  after(() =>
    Promise.all([
      User.deleteMany()
    ])
      .then(_ => Promise.all([
        Game.deleteMany()
      ]))
      .then(() => _connection.disconnect())
  )
})