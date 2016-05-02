importScripts('components/async/dist/async.min.js')


function Downloader(state, broadcaster) {
  this.state = state
  this.broadcaster = broadcaster

  this.state.total = 0
  this.state.downloaded = 0

  this.queue = new Set()
  this.downloaded = new Set()

  this.iter = this.queue[Symbol.iterator]()

  var populateActivity = (uri) =>
    fetch('data' + uri, { credentials: 'include' })
      .then(res => res.json() )
      .then((data) => db.activities.put(data) )

  this.processor = async.queue(this._processor.bind(this), 2)
}

// process a uri (cb style for async)
Downloader.prototype._processor = function (uri, callback) {

  var downloaded = this.downloaded
  var state = this.state
  var broad = this.broadcaster
  var token = this.state.u_token

  console.log('⬇️', uri)

  db.activities
    .where('uri').equals(uri)
    .count(function(c){
      if(c === 0)
        return fetch('https://api.runkeeper.com' + uri, {
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
    })
    // .then(update)
    .then(callback)

}


Downloader.prototype.start = function() {

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

Downloader.prototype.dequeue = function() {
  // this.iter = this.queue[Symbol.iterator]()

  var next = this.iter.next().value

  if(next) {
    this.queue.delete(next)

    console.log("REQUEST", next)
  }


  // request({
  //   url:'https://api.runkeeper.com/fitnessActivities/' + req.params.id + (url_parts.search || ''),
  //   headers: {
  //     'Authorization': 'Bearer ' + req.user._access_token,
  //     'Accept': 'application/vnd.com.runkeeper.FitnessActivity+json'
  //   }
  // }).pipe(res);
}

Downloader.prototype.buildQueue = function() {

  this.queue.clear()

  // NOT SURE IF THIS IS RIGHT
  this.processor.kill()

  var updateLength = (urls) => {
    this.state.total = urls.size
    this.broadcaster()
  }

  var popupateQueue = (path, token, urls) =>
    fetch('https://api.runkeeper.com' + path, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.com.runkeeper.FitnessActivityFeed+json'
        }
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
