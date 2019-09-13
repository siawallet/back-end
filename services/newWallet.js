var helpers = require("../helpers/helpers");
var new_wallet = require("../config/new_wallet.json")
var bot = require('../helpers/bot');

module.exports.createWallet = (req, res) => {
    let forse = false

    let client = helpers.siaClient(new_wallet[0]["api-addr"])
    client.sendRequest('GET', '/wallet').then((wallet) => {
        if (wallet.encrypted === true) {
            forse = true
        }

        client.sendRequest('POST', '/wallet/init?force=' + forse)
            .then((x) => {
                res.send(x);
            })
            .catch((err) => {
                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();

                bot.sendErrors(err, "error from createWallet POST /wallet/init?force=" + forse)

            });

    }).catch((err) => {

        res.statusMessage = err.response.body.message;
        res.status(err.response.statusCode).end();

        bot.sendErrors(err, "error from createWallet GET /wallet")

    })
}