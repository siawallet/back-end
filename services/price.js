const rp = require('request-promise');
var bot = require('../helpers/bot');

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
    res.send(response.data[id]);
  }).catch((err) => {

    res.statusMessage = err.response.body.message;
    res.status(err.response.statusCode).end();

    bot.sendErrors(err, "error from getPrice - pro-api.coinmarketcap")

  });
}