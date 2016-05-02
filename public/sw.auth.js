function Auth(state, broadcaster) {
  this.state = state
  this.broadcaster = broadcaster
}

Auth.prototype.check = function() {
  return fetch('/current', {credentials: 'include'})
    .then(res => res.json())
    .then(res => {

      var s = !!res._access_token

      if(s) {
        this.state.u_token = res._access_token
        this.state.u_name = res.name
        this.state.u_url = res.url
      } else {
        this.state.u_token =
        this.state.u_name =
        this.state.u_url = null
      }

      this.state.logged_in = s

      this.broadcaster()
      
      return s
    })

}
