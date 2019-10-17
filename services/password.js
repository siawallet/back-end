var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var _ = require("lodash");
var bot = require('../helpers/bot');

module.exports.setPassword = (req, res) => {
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === req.body.hash });
    if (index === -1) {
        console.log("setPassword wallet not found")
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        let client = helpers.siaClient(data[index]["api-addr"])
        data[index].lastUpdate = new Date();

        client.sendRequest('POST', '/wallet/changepassword', {
            encryptionpassword: req.body.wallet,
            newpassword: req.body.password
        })
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {
                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();

                bot.sendErrors(err, "error from setPassword POST /wallet/changepassword")

            });
    }

}