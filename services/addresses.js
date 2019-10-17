var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var _ = require("lodash");
var bot = require('../helpers/bot');


module.exports.getAddresses = (req, res) => {
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === req.body.wallet });
    if (index === -1) {
        console.log("getAddresses wallet not found")
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        let client = helpers.siaClient(data[index]["api-addr"])
        data[index].lastUpdate = new Date();

        client.sendRequest('GET', '/wallet/addresses')
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {

                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();

                bot.sendErrors(err, "error from getAddresses GET /wallet/addresses")

            });
    }
}

module.exports.setAddresses = (req, res) => {
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === req.body.wallet });
    if (index === -1) {
        console.log("setAddresses wallet not found")
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        let client = helpers.siaClient(data[index]["api-addr"])
        data[index].lastUpdate = new Date();

        client.sendRequest('GET', '/wallet/address')
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {

                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();

                bot.sendErrors(err, "error from setAddresses GET /wallet/address")

            });
    }
}
