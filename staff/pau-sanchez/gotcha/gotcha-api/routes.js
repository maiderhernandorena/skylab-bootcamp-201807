require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const { logic, LogicError } = require('./logic')
const jwt = require('jsonwebtoken')
const validateJwt = require('./utils/validate-jwt')

const router = express.Router()

const jsonBodyParser = bodyParser.json()


//@route    POST api/register
//@desc     Register User
//@access   Public



router.post('/register', jsonBodyParser, (req, res) => {
    const { body: { email, password, name } } = req

    logic.register( email, password, name )
        .then(() => res.status(201).json({ message: 'user registered' }))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 400 : 500).json({ message })
        })
})

//@route    POST api/authenticate
//@desc     Authenticate User
//@access   Public



router.post('/authenticate', jsonBodyParser, (req, res) => {
    const { body : { email, password } } = req

    logic.authenticate( email , password )
        .then(id => {
            const { JWT_SECRET, JWT_EXP } = process.env

            const token = jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: JWT_EXP})

            res.json({ message: 'user authenticated', token, id})
        })
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })

})


//@route    POST api/unregister
//@desc     Unregister User
//@access   Private

router.delete('/unregister/:id', [validateJwt, jsonBodyParser], (req, res) => {
    const { body: { email, password } } = req

    logic.unregisterUser(email, password)
        .then(() => res.json({ message: 'user unregistered'}))
        .catch(err => {
            const { message } = err
            res.status(err instanceof LogicError ? 400 : 500).json({ message })
        })
})


//@route    POST api/update
//@desc     Update User Password
//@access   Private-Token


router.post('/user/:id', [validateJwt, jsonBodyParser], (req, res) => {
    const { /*params: { id },*/ body: { email, password, newPassword } } = req

    logic.updatePassword(email, password, newPassword)
        .then(() => res.json({ message: 'user updated' }))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 400 : 500).json({ message })
        })
})


//@route    POST api/:id/notebook
//@desc     Create notebook
//@access   Private-Token

router.post('/:id/notebook', [validateJwt, jsonBodyParser], (req, res) => {
    const { params: { id }, body: {notebooktitle, videourl} } = req

    logic.createNotebook( id, notebooktitle, videourl)
        .then(() => res.json({ message: 'Notebook created correctly' }))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({message})
        })
})


//@@    GET api/:id/notebooks
//@@    List all user notebooks
//@@    Private-Token


router.get('/:id/notebooks', [validateJwt, jsonBodyParser], (req, res) => {
    const { params: {id} } = req

    logic.listNotebooks(id)
        
        .then(notebooks => res.json(notebooks))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message})
        })
})

//@@    GET api/:id/notebooks/:notebookid
//@@    List user notebooks by id
//@@    Private-Token

router.get('/:id/notebooks/:notebookid', [validateJwt, jsonBodyParser], (req, res) => {
    const { params: {id, notebookid} } = req

    logic.listNotebooksByNotebookId(id, notebookid)

        .then(notebook => res.json(notebook))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})


//@@    GET api/:id/notebooks/:notebookid/update
//@@    Update notebook
//@@    Private-Token

router.patch('/:id/notebooks/:notebookid/update', [validateJwt, jsonBodyParser], (req, res) => {
    const {params: { id, notebookid}, body : {newnotebooktitle}} = req

    logic.updateNotebook(id, notebookid, newnotebooktitle)

        .then(updatednotebook => res.json(updatednotebook))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})

//@@    DELETE api/:id/notebooks/:notebookid/delete
//@@    Delete notebook
//@@    Private-Token

router.delete('/:id/notebooks/:notebookid/delete', [validateJwt, jsonBodyParser], (req, res) => {
    const {params: { id, notebookid} } = req

    logic.removeNotebook( id, notebookid)
        .then(() => res.json({ message: 'Notebook removed correctly' }))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})


//@@    POST api/:id/note
//@@    Create note
//@@    Private-Token

router.post('/:id/:notebook/note', [validateJwt, jsonBodyParser] , (req, res) => {
    const {params: {id, notebook }, body: { seconds, notetitle, notetext }} = req

    logic.createNote(seconds, notetitle, notetext, notebook)
        .then(() => res.json({ message: 'Note created correctly'}))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})


//@@    GET api/:id/notes
//@@    List notes by user id
//@@    Private-Token

router.get('/:id/notes', [validateJwt, jsonBodyParser] , (req, res) => {
    const {params: {id} } = req

    logic.listNotesbyUser(id)
        .then(notes => res.json( notes ))
        .catch(err => {
            const { message } = err
        
            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})

//@@    GET api/:id/:notebookdid/notes
//@@    List notes by notebook id
//@@    Private-Token

router.get('/:id/:notebookid/notes', [validateJwt, jsonBodyParser] , (req, res) => {
    const {params: {id, notebookid} } = req

    logic.listNotebyNotebookId(notebookid)
        .then(notes => res.json( notes ))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })

        })
})

//@@    GET api/:id/note/:noteid
//@@    List note by note id
//@@    Private-Token

router.get('/:id/note/:noteid', [validateJwt, jsonBodyParser], (req, res) => {
    const {params: {id, noteid} } = req

    logic.listNotesbyNoteId(noteid)
        .then(note => res.json(note))
        .catch(err => {
            const { message } = err

            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})

//@@    DELETE api/:id/removenote/:noteid
//@@    Remove note
//@@    Private-Token

router.delete('/:id/removenote/:noteid', [validateJwt, jsonBodyParser] , (req, res) => {
    const {params: { id, noteid} } = req

    logic.removeNote(noteid)
        .then(() => res.json({ message: 'Note removed succesfully' }))
        .catch(err => {
            const { message } = err
            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})

//@@    UPDATE api/:id/updatenote/:noteid
//@@    Remove note
//@@    Private-Token

router.patch('/:id/updatenote/:noteid', [validateJwt, jsonBodyParser], (req, res) => {
    const {params: { id, noteid}, body:{ newnotetitle, newnotetext} } = req

    logic.updateNote(noteid, newnotetitle, newnotetext)
        .then(updatednote => res.json(updatednote))
        .catch(err => {
            const { message } = err
            res.status(err instanceof LogicError ? 401 : 500).json({ message })
        })
})





module.exports = router
