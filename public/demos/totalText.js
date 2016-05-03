function totalText(element){
  // hide button (this only happens once)
  element.nextSibling.style.display = 'none'


  fetch('/data/totals.json')
    .then(r => r.json())
    .then(data => {

      element.style.fontSize = '3em'
      element.style.marginBottom = '.5em'

      var count = data.activities,
          distance = Math.ceil(data.total_distance/1000).toLocaleString()

      element.innerText = count + ' activities – ' + distance + 'km'

    })
}
