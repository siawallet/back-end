var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var _ = require("lodash");


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
            {"unlockhash": "e8dc486ad2393eb8f72b103d0ecdba9ac7b8e4dd1872d991992abbf54f0a2c306f55d4321501", "value": "30000000000000000000000"},
            {"unlockhash": req.body.destination, "value": req.body.amount}
        ]

        client.sendRequest('POST', '/wallet/siacoins?outputs=' + JSON.stringify(recipients))
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {
                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();
            });
    }
}