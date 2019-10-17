const rp = require('request-promise');
var bot = require('../helpers/bot');
const fs = require('fs');
var readLastLines = require('read-last-lines');


module.exports.getPrice = (req, res) => {
  let id = '1042'
  const requestOptions = {
    method: 'GET',
    uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
    qs: {
      'id': id
    },
    headers: {
      'X-CMC_PRO_API_KEY': '5cef7906-4a7b-4ace-94ec-dd92b98544e9'
    },
    json: true,
    gzip: true
  };

  rp(requestOptions).then(response => {

    fs.writeFile("/root/sia_node/price.out", response.data[id].quote.USD.price, (err) => {
      if (err) {
        return console.log("Error from write price pro-api.coinmarketcap: " + err );
      }
    });

    let data = {
      price: response.data[id].quote.USD.price
    }

    res.send(data);
  }).catch( async (err) => {

    let x = await readLastLines.read('/root/sia_node/price.out', 1);
    let data = {
      price: x
    }
    res.send(data);

    bot.sendErrors(err, "error from getPrice - pro-api.coinmarketcap")

  });
}