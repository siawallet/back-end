var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var _ = require("lodash");
var bot = require('../helpers/bot');


module.exports.sendCoins = (req, res) => {
    let decode = helpers.decodeWallet(req.body.wallet);
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === decode });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        let client = helpers.siaClient(data[index]["api-addr"])
        data[index].lastUpdate = new Date();

        let recipients = [
            { "unlockhash": req.body.destination, "value": req.body.amount }
        ]

        client.sendRequest('POST', '/wallet/siacoins?outputs=' + JSON.stringify(recipients))
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {

                res.status(err.response.statusCode);
                res.send(err.response.body.message);

                bot.sendErrors(err, "error from sendCoins POST /wallet/siacoins?outputs=" + JSON.stringify(recipients))

            });
    }
}