
function Downloader(state, broadcaster) {
  this.state = state
  this.broadcaster = broadcaster

  this.state.total = 0
  this.state.downloaded = 0

  this.queue = new Set()
}

Downloader.prototype.start = function() {

}

Downloader.prototype.pause = function() {
  this.state.paused = true
  console.log("downloader paused")
  this.broadcaster()
}

Downloader.prototype.resume = function() {
  this.state.paused = false
  console.log("downloader resumed")
  this.broadcaster()
}

Downloader.prototype.buildQueue = function() {

  this.queue.clear()

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
        res.items.forEach(item =>
          urls.add(item.uri)
        )

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
