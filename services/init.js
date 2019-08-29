var helpers = require("../helpers/helpers");
var wallet = require("../services/seed");
var consensus = require("../config/consensus.json");
var getConsensus = require("./consensus");

var demonData
var index = 0

module.exports.init = () => {
    startInit();
}

function startInit() {
    demonData = wallet.allWallets();
    demonData = demonData.concat(consensus);

    if (demonData[index] != undefined) {
        let client = helpers.siaClient(demonData[index]["api-addr"])
        let promise = new Promise((resolve, regect) => {
            client.sendRequest('GET', '/consensus')
                .then((data) => {
                    resolve(data)
                })
                .catch((err) => {
                    resolve(err)
                });
        })
        promise.then((x) => {
            let status = JSON.stringify(x).search("connect ECONNREFUSED");
            if (status != -1) {
                letsDelWalletRunDemon(index);
            } else {
                stopDemon(client, index);
            }
        })
    } else {
        getConsensus.getMainConsensus();
    }
}

function stopDemon(client, i) {
    client.sendRequest('GET', '/daemon/stop')
        .then(() => {
            checkStatus(i)
        })
        .catch((err) => {
            console.log(err);
        });
}

async function checkStatus(i) {
    let status = await helpers.getStatus(demonData[i].name);
    if (status.search("Shutdown complete") === -1) {
        setTimeout(() => {
            checkStatus(i)
        }, 1000)
    } else {
        letsDelWalletRunDemon(i)
    }
}

async function letsDelWalletRunDemon(i) {
    await deleteWallet(demonData[i].name);
    await deleteLogs(demonData[i].name);
    startDemon(i)

}

async function startDemon(i) {
    await helpers.runDemon(demonData[i].name, demonData[i]["api-addr"], demonData[i]["rpc-addr"], demonData[i]["host-addr"])
    getStatusOfDemons(i);

}

async function getStatusOfDemons(i) {
    setTimeout(async () => {
        let status = await helpers.getStatus(demonData[i].name);
        if (status.search("Finished loading") != -1) {
            index = i + 1;
            startInit();
        } else {
            startDemon(i);
        }
    }, 2000)
}

async function deleteWallet(name) {
    return await helpers.executeCommand("sudo rm -rf /root/" + name + "/wallet")
}

async function deleteLogs(name) {
    return await helpers.executeCommand("sudo rm -rf /root/" + name + "/nohup.out")
}