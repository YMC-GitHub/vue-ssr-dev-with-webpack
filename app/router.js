/* eslint-disable consistent-return */
const router = require('express').Router()
const LRU = require('lru-cache')
const View = require('./View')

if (process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = 'production'
}
const isProd = process.env.NODE_ENV === 'production'

const useMicroCache = process.env.MICRO_CACHE !== 'false'
const cacheUrls = ['/', '/home', '/menu', '/button']

const isCacheable = ctx => cacheUrls.indexOf(ctx.url) >= 0 && useMicroCache

const microCache = LRU({
  // set maximum size of the cache
  max: 100,
  // set maximum age in ms
  maxAge: isProd ? 6 * 1000 : 1200
})

module.exports = function (app) {
  // create vue renderer instance
  const view = new View(app)

  // create custom koa middle
  async function render(req, res, next) {
    // render middleware
    res.setHeader('Content-Type', 'text/html')

    //const { PassThrough } = require('stream')
    //res.body = new PassThrough()

    if (!view.renderer) {
      res.end('waiting for compilation... refresh in a moment.')
      return
    }

    // hit micro cache
    const cacheable = isCacheable(req)
    if (cacheable) {
      const html = microCache.get(req.url)
      if (html) {
        res.set('X-Cache-Hit', '1')
        res.end(html)
        return
      }
    }

    function handleError(error) {
      // console.error('RENDER ERROR', error)
      if (error.url) {
        // fixed stream.push after EOF
        return res.redirect(error.url)
      } else if (error.code === 404) {
        res.status(404)
        res.end('404 | Page Not Found')
      } else {
        // Render Error Page or Redirect
        res.status(500)
        res.end('500 | Internal Server Error')
        console.error(`error during render : ${req.url}`)
        // console.error(error.stack)
      }
    }


    function handleEnd(content) {
      if (cacheable) {
        // set micro cache
        microCache.set(req.url, content)
      }
      res.end(content)
    }

    try {
      const context = {
        title: 'blog',
        url: req.url
      }
      const content = await view.render(context)
      handleEnd(content)
    } catch (error) {
      handleError(error)
    }
  }

  // handle all route to html index file for spa
  router.get(/^(?!\/api)(?:\/|$)/, (req, res, next) => {
    try {
      if (isProd) {
        render(req, res, next)
      } else {
        view.ready.then(() => render(req, res, next))
      }
    } catch (e) {
      next()
    }
  })


  return router
}
