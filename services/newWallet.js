var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var _ = require("lodash");

module.exports.createWallet = (req, res) => {
    let data = wallet.allWallets();

    let index = _.findIndex(data, function (o) { return o.wallet === null });
    if (index === -1) {
        res.statusMessage = "The server is busy with other users, please try again in a few minutes. Your data is not stored.";
        res.status(400).end();
    } else {
        let forse = false

        let client = helpers.siaClient(data[index]["api-addr"])
        client.sendRequest('GET', '/wallet').then((wallet)=>{
          if(wallet.encrypted === true){
            forse = true
          }

          client.sendRequest('POST', '/wallet/init?force=' + forse)
            .then((x) => {
                res.send(x);
            })
            .catch((err) => {
                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();
            });

        }).catch((err)=>{
            res.statusMessage = err.response.body.message;
            res.status(err.response.statusCode).end();
        })
    }
}