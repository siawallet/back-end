var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var _ = require("lodash");

module.exports.download = (req, res) => {
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === req.body.wallet });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        const file = '/root/wallets/' + data[index].wallet;
        res.download(file);

    }
}


module.exports.deleteWallet = async (req, res) => {
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === req.body.wallet });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        if (data[index].from === "RAM") {
            
            await helpers.executeCommand("sudo rm -rf /root/wallets/" + data[index].wallet)

            let client = helpers.siaClient(data[index]["api-addr"])
            stopDemon(client, index, data);

            res.status(200).end();

        } else {

            await helpers.executeCommand("sudo rm -rf /root/wallets/" + data[index].wallet)

            data[index].wallet = null;
            data[index].logout = false;
            data[index].status = null;
            data[index].lastUpdate = null;

            res.status(200).end();

        }

    }
}

async function stopDemon(client, i, data) {
    await client.sendRequest('GET', '/daemon/stop')
    checkStatus(i, data)

}

async function checkStatus(i, data) {
    let status = await helpers.getStatus(data[i].name);
    if (status.search("Shutdown complete") === -1) {
        setTimeout(() => {
            checkStatus(i, data)
        }, 1000)
    } else {
        letsDelWalletRunDemon(i, data)
    }
}

async function letsDelWalletRunDemon(i, data) {

    await helpers.deleteWallet(data[i].name);

    startDemon(i, data)
}

async function startDemon(i, data) {
    await helpers.runDemon(data[i].name, data[i]["api-addr"], data[i]["rpc-addr"], data[i]["host-addr"]);
    getStatusOfDemons(i, data);

}

async function getStatusOfDemons(i, data) {
    setTimeout(async () => {
        let status = await helpers.getStatus(data[i].name);
        if (status.search("Finished loading") != -1) {
            data[i].wallet = null;
            data[i].logout = false;
            data[i].status = null;
            data[i].lastUpdate = null;
        } else {
            startDemon(i, data);
        }
    }, 2000)
}