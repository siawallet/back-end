var helpers = require("../helpers/helpers");
var bot = require('../helpers/bot');


module.exports.logout = async (index, data, res, decode) => {
    if (data[index].status === "init" || data[index].status === "unlock") {
        data[index].logout = true;
        data[index].lastUpdate = new Date();
        if (res !== null) {
            res.send("{logout:'logout'}")
        }
    } else {
        if (res !== null) {
            res.send("{logout:'logout'}")
        }

        await helpers.executeCommand("sudo cp -a /root/" + data[index].name + "/wallet/wallet.db /root/wallets/" + decode);

        if (data[index].from === "RAM") {
            let client = helpers.siaClient(data[index]["api-addr"])
            stopDemon(client, index, data, decode);
        }else{
            data[index].wallet = null;
            data[index].logout = false;
            data[index].status = null;
            data[index].lastUpdate = null;
        }
    }
}

async function stopDemon(client, i, data, decode) {
    await client.sendRequest('GET', '/daemon/stop')
        .catch((err) => {

            bot.sendErrors(err, "error from stopDemon GET /daemon/stop")

        });

    checkStatus(i, data, decode)

}

async function checkStatus(i, data, decode) {
    let status = await helpers.getStatus(data[i].name);
    if (status.search("Shutdown complete") === -1) {
        setTimeout(() => {
            checkStatus(i, data, decode)
        }, 1000)
    } else {
        letsDelWalletRunDemon(i, data, decode)
    }
}

async function letsDelWalletRunDemon(i, data, decode) {

    await helpers.executeCommand("sudo cp -a /root/" + data[i].name + "/wallet/wallet.db /root/wallets/" + decode);
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
            console.log("try again: " + data[i].name);
            startDemon(i, data);
        }
    }, 2000)
}



