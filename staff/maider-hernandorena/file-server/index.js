const fs = require('fs')
const express = require('express')
const fileUpload = require('express-fileupload')
const package = require('./package.json')
const morgan = require('morgan')

const { argv: [, , port] } = process

const app = express()

app.use(fileUpload())
app.use(morgan('dev'))
app.use(express.static('public'))

const errors = {
    emptyFile: 'cannot upload an empty file'
}

app.get('/helloworld', (req, res) => {
    res.send(`<html>
                <head>
                    <title>hola mundo</title>
                </head>
                <body>
                    <h1>hello world!</h1>
                </body>
            </html>`)
})

app.get('/files', (req, res) => {
    const { query: { error} } = req
    const files = fs.readdirSync('files')

    res.send(`<html>
                <head>
                    <title>files</title>
                    <link rel="stylesheet" href="/styles.css"/>
                    <link rel="Shortcut Icon" href="/logo.png" type="image/png">
                </head>
                <body>
                    <ul>
                        ${files.map(file => `<li><a href="downloads/${file}">${file}</a><a href="deleted/${file}"><p>X</p></a></li>`).join('')}
                    </ul>

                    <form action="/files" method="post" encType="multipart/form-data">
                        <input type="file" name="upload">
                        <button>UPLOAD</button>
                    </form>

                    ${error ? `<p class="error">${errors[error]}</p>` : ''}
                </body>
            </html>`)
})

app.post('/files', (req, res) => {
    const { files: { upload } } = req

    if (upload) {
        upload.mv(`files/${upload.name}`, (err) => {
            if (err)
                return res.status(500).send(err)

            res.redirect('/files')
        })
    } else
        res.redirect('/files?error=emptyFile')
})

app.get('/downloads/:file', (req, res) => {
    const file = `files/${req.params.file}`
    res.download(file)
})

app.get('/deleted/:file', (req, res) => {
    const fileToDelete = `files/${req.params.file}`
    fs.unlinkSync(fileToDelete)
    res.redirect('/files')
})

app.listen(port, () => console.log(`${package.name} ${package.version} up and running on port ${port}`))