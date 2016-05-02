importScripts('components/dexie/dist/dexie.min.js')

var db = new Dexie('Runkeeper')

db.on("error", function(e) { console.error (e.stack || e) })

db.version(1).stores({
  activities: '&uri'
})

db.open()
