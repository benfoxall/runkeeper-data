console.log("sw.js")

var state = {
  logged_in: 'Ben Foxall',
  activity_total: 34,
  activity_downloaded: 1,
}

setInterval(f => {
  if(!state.paused){
    state.activity_total++
    broadcastState()
  }
}, 300)

function broadcastState() {
  self.clients.matchAll()
  .then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({state:state})
    })
  })
}


self.addEventListener('message', e => {
  switch (e.data) {
    case 'broadcast':
      broadcastState()
      break

    case 'pause':
      state.paused = true
      broadcastState()
      break

    case 'resume':
      state.paused = false
      broadcastState()
      break

    default:
      console.log(`unhandled: ${e.data}`)
  }
})



// https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-global-scope-skipwaiting
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()))
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
