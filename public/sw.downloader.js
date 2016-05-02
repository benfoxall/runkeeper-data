importScripts('components/async/dist/async.min.js')

function Downloader(state, broadcaster) {
  this.state = state
  this.broadcaster = broadcaster

  this.state.total = 0
  this.state.downloaded = 0

  this.queue = new Set()
  this.downloaded = new Set()

  this.processor = async.queue(this._processor.bind(this), 2)

}

Downloader.prototype.burst = function(path) {
  return this.state.development ?
    (path + (path.indexOf('?') > -1 ? '&' : '?') + 'dev2') :
    path
}

// process a uri (cb style for async)
Downloader.prototype._processor = function (uri, callback) {

  var downloaded = this.downloaded
  var state = this.state
  var broad = this.broadcaster
  var token = this.state.u_token

  console.log('⬇️', uri)

  var burst = this.burst.bind(this)

  db.activities
    .where('uri').equals(uri)
    .count(function(c){
      if(c === 0)
        return fetch('https://api.runkeeper.com' + burst(uri), {
            headers: {
              'Authorization': 'Bearer ' + token,
              'Accept': 'application/vnd.com.runkeeper.FitnessActivity+json'
            }
          })
          .then(res => res.json())
          .then(data => db.activities.put(data) )
          .catch(d => console.error("Save error:", d))
    })
    .then( () => {
      downloaded.add(uri)
      state.downloaded = downloaded.size
      broadcast()

      // this is not sufficient - something could be
      // being generated
      if(self.RK_CACHE) {
        return caches.delete(self.RK_CACHE)
      }
    })
    .catch(console.error.bind(console))
    .then(function() {callback()})

}

Downloader.prototype.pause = function() {

  this.processor.pause()
  console.log("downloader paused")
  this.state.paused = true
  this.broadcaster()
}

Downloader.prototype.resume = function() {
  this.processor.resume()
  this.state.paused = false
  this.broadcaster()
}

Downloader.prototype.destroy = function() {

  db.activities.clear()
    .then(() => {
      console.log("activities cleared from db")
    })

  this.processor.kill()

  this.queue.clear()
  this.downloaded.clear()
  this.processor.resume()

  this.state.total = 0
  this.state.downloaded = 0
  this.state.paused = false

  this.broadcaster()
}


Downloader.prototype.build = function() {

  this.queue.clear()
  this.downloaded.clear()

  // NOT SURE IF THIS IS RIGHT
  this.processor.kill()

  var updateLength = (urls) => {
    this.state.total = urls.size
    this.broadcaster()
  }

  var popupateQueue = (path, token, urls) =>
    fetch('https://api.runkeeper.com' + this.burst(path), {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.com.runkeeper.FitnessActivityFeed+json'
        }
        // cache: 'reload'
      })
      .then(res => res.json())
      .then(res => {
        res.items.forEach(item => {
          urls.add(item.uri)
          this.processor.push(item.uri)
        })

        updateLength(urls)

        if(res.next)
          return popupateQueue(res.next, token, urls)

        else
          return urls
      })

  return popupateQueue('/fitnessActivities', this.state.u_token, this.queue)
    .then(function(){
      console.log("completed building queue")
    })

}
