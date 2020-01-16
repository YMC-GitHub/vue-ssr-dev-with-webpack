const express = require('express')
const compression = require('compression')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const path = require('path')

const bluebird = require('bluebird')

const config = require('../config/server.config')

global.Promise = bluebird

if (process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = 'production'
}
const isProd = process.env.NODE_ENV === 'production'

const rootPath = path.resolve(__dirname, '../')

const resolve = file => path.resolve(rootPath, file)

//include some route files
//const bindRouteToApp = require('./server/routes/index')

const app = express()
//use some express middlewares
app.use(compression())
//app.use(logger('":method :url" :status :response-time ms - :res[content-length]'))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(favicon(isProd ? `${config.build.public}/favicon.ico` : `${config.dev.public}/favicon.ico`))
// for static serve in public path
app.use(express.static(isProd ? config.build.public : config.dev.public))
// for static web serve in views path
app.use(express.static(isProd ? config.build.www : config.dev.www))
// for static web serve in views path
//app.set('views', path.join(__dirname, 'views'))
//app.engine('.ejs', require('ejs').__express)
//app.set('view engine', 'ejs')

const router = require('./router')(app)
app.use(router)

// page not found
app.use((req, res, next) => {
  res.status(404).end('404 | Page Not Found')
})

module.exports = app
