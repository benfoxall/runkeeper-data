importScripts('components/dexie/dist/dexie.min.js')

Dexie.Promise.on('error', console.error.bind(console, 'Dexie: '))

var db = new Dexie('Runkeeper')

db.version(1).stores({
  activities: '&uri'
})

db.open()
