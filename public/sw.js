console.log("[sw.js]")

importScripts(
  'sw.auth.js',
  'sw.db.js',
  'sw.downloader.js',
  'components/localforage/dist/localforage.js'
)


// the overall state of the tool (todo - store in indexedDB?)
const state = {
  logged_in: false
}

function broadcast() {
  self.clients.matchAll()
  .then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({state:state})
    })
  })
  localforage.setItem('state', state)
}


var downloader = new Downloader(state, broadcast)
var auth = new Auth(state, broadcast)

// dispatch events from postMessage
self.addEventListener('message', e => {
  switch (e.data) {

    /*
      Re-broadcast the current ui state (for when
      a new window needs the state)
    */
    case 'broadcast':
      broadcast()
      break

    /*
      Fetch the current user state
    */
    case 'updateCredentials':
      auth.check()
      break

    /*
      Request all activities for a user
    */
    case 'build':
      downloader.build()
      break

    /*
      Pause the downloading of activities
    */
    case 'pause':
      downloader.pause()
      break

    /*
      Resume downloading activities
    */
    case 'resume':
      downloader.resume()
      break


    default:
      console.log(`unhandled: ${e.data}`)
  }
})


self.addEventListener('activate', e => {

  e.waitUntil(

    localforage.getItem('state')
      .then((stashed) => {
        if(stashed){
          Object.keys(stashed).forEach(k => {
            state[k] = stashed[k]
          })
          console.log('start state', state)
        }
      })
      .then( r => auth.check())
  )

})

self.addEventListener('fetch', e => {

  // after login/logout re-check authentication
  if(e.request.url.match(/\/\?sw-(login|logout)$/)){

    auth.check()
      .then(logged_in => {
        if(logged_in)
          downloader.build()
        else
          downloader.destroy()
      })

    e.respondWith(
      Response.redirect('/',302)
    )
  }
})

// https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-global-scope-skipwaiting
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()))
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))


importScripts('sw.serve.js')
