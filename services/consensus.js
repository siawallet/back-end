var wallet = require("../services/seed");
var helpers = require("../helpers/helpers");
var consensusData = require("../config/consensus.json");
const fs = require('fs');
var readLastLines = require('read-last-lines');
var _ = require("lodash");



module.exports.mainConsensus = async (req, res) => {
    let data = await readLastLines.read('/root/consensus/consensus.out', 1);
    res.send(data);
}

module.exports.getMainConsensus = () => {
    setInterval(() => {
        let client = helpers.siaClient(consensusData[0]["api-addr"])

        client.sendRequest('GET', '/consensus')
            .then((data) => {
                fs.writeFile("/root/consensus/consensus.out", data.height, (err) => {
                    if (err) {
                        return console.log(err);
                    }
                });
            })
            .catch((err) => {
                console.log(err);
            });
    }, 10000)
}

module.exports.walletConsensus = (req, res) => {
    let decode = helpers.decodeWallet(req.body.wallet);
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === decode });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        let client = helpers.siaClient(data[index]["api-addr"])
        data[index].lastUpdate = new Date();
        client.sendRequest('GET', '/consensus')
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {
                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();
            });
    }

}
