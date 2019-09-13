var demonData = require("../config/demon.json");
var hhd_demons = require("../config/hhd_demons.json");
var helpers = require("../helpers/helpers");
var glob = require("glob");
var _ = require("lodash");
var logout = require('./logout');
var readLastLines = require('read-last-lines');
var bot = require('../helpers/bot');


var walletData;

module.exports.walletInit = () => {
    let allData = demonData.concat(hhd_demons);
    walletData = allData.map(function (el) {
        var o = Object.assign({}, el);
        o.wallet = null;
        o.logout = false;
        o.status = null;
        o.lastUpdate = null;
        return o;
    })
}

module.exports.allWallets = () => {
    return walletData;
}

module.exports.gotSeed = (wallet, res) => {
    let decode = helpers.decodeWallet(wallet);
    let findWallet = _.findIndex(walletData, function (o) { return o.wallet === decode });
    if (findWallet === -1) {
        glob("../wallets/*", async (er, files) => {
            if (er === null) {
                let existWallet = _.findIndex(files, (o) => { return o === "../wallets/" + decode; });
                if (existWallet === -1) {
                    // wallet not found
                    let object = _.filter(walletData, function (o) { return o.from === "RAM" });
                    let findWalletNull = _.findIndex(object, function (o) { return o.wallet === null });
                    if (findWalletNull === -1) {
                        res.statusMessage = "The server is busy with other users, please try again in a few minutes. Your data is not stored.";
                        res.status(400).end();

                        bot.sendErrors("error RAM The server is busy with other users, please try again in a few minutes. Your data is not  stored.", "error RAM")

                    } else {
                        let index = _.findIndex(walletData, function (o) { return o.id === object[findWalletNull].id });
                        walletData[index].wallet = decode;
                        walletData[index].lastUpdate = new Date();
                        checkIfDemonIsReady(wallet, res, index, true)
                    }

                } else {
                    // wallet found
                    let object = _.filter(walletData, function (o) { return o.from === "HHD" });
                    let findWalletNull = _.findIndex(object, function (o) { return o.wallet === null });
                    if (findWalletNull === -1) {
                        res.statusMessage = "The server is busy with other users, please try again in a few minutes. Your data is not stored.";
                        res.status(400).end();

                        bot.sendErrors("error HHD The server is busy with other users, please try again in a few minutes. Your data is not stored.", "error HHD")

                    } else {

                        let index = _.findIndex(walletData, function (o) { return o.id === object[findWalletNull].id });
                        walletData[index].wallet = decode;
                        walletData[index].lastUpdate = new Date();
                        checkIfDemonIsReady(wallet, res, index, false)

                    }
                }
            } else {
                res.send("1 blob get files error")
            }
        })
    } else {
        walletData[findWallet].lastUpdate = new Date();
        walletData[findWallet].logout = false;
        res.send(walletData[findWallet].status);
    }
}

function checkIfDemonIsReady(wallet, res, index, way) {
    let client = helpers.siaClient(walletData[index]["api-addr"])
    client.sendRequest('GET', '/wallet')
        .then(() => {
            if (way === true) {
                checkConsensus(wallet, res, index)
            } else {
                oldWallet(wallet, res, index)
            }
        })
        .catch((err) => {
            console.log("get coins error")
            let findError = err.message.search("Error: connect ECONNREFUSED");
            if (findError !== -1) {
                setTimeout(() => {
                    checkIfDemonIsReady(wallet, res, index)
                }, 2000)
            }
        });
}

async function checkConsensus(wallet, res, index) {
    //lets find exite wallet
    let client = helpers.siaClient(walletData[index]["api-addr"])

    let consensus = await client.sendRequest('GET', '/consensus').then((data) => {
        return data.synced;
    }).catch((err) => {

        bot.sendErrors(err, "error from checkConsensus GET /consensus")

    })

    if (consensus === true) {
        newWallet(wallet, res, index, client)
    } else {
        setTimeout(() => {
            checkConsensus(wallet, res, index);
        }, 2000)
    }
}

function newWallet(wallet, res, index, client) {
    var waitForStatusTimer = false

    client.sendRequest('POST', '/wallet/init/seed', {
        seed: wallet,
        forse: true
    }).catch((err) => {
        if (err.response !== undefined) {

            walletData[index].wallet = null
            walletData[index].lastUpdate = null;
            waitForStatusTimer = true

            res.status(err.response.statusCode);
            res.send(err.response.body.message);
        }

        bot.sendErrors(err, "error from newWallet GET /wallet/init/seed")

    })
    setTimeout(() => {
        if (waitForStatusTimer === false) {
            waitForStatus(wallet, index, client, res)
        }
    }, 2000)

}

function waitForStatus(wallet, index, client, res) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("scanned to height") != -1) {
            walletData[index].status = "init";
            res.send("lets go")
            waitForUnlock(wallet, index, client);
        } else {
            waitForStatus(wallet, index, client, res)
        }
    }, 3000);
}

function waitForUnlock(w, index, client) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        walletData[index].status = "init";
        if (status.search("Done!") != -1) {
            unlockWallet(w, index, client)
        } else {
            waitForUnlock(w, index, client);
        }
    }, 5000)
}

function unlockWallet(w, index, client) {
    console.log(w);
    let unlock = true
    client.sendRequest('POST', '/wallet/unlock', {
        encryptionpassword: w,
    }).catch((err) => {
        if (err.response !== undefined) {

            bot.sendErrors(err, "error from unlockWallet POST /wallet/unlock")

            let alredyUnlocked = err.response.body.message.search("wallet has already been unlocked") != -1 ? true : false
            if (alredyUnlocked === true) {
                walletData[index].status = "unlock";
                unlock = false;

                backup(w, index, client)
            }
        }
    })
    setTimeout(() => {
        if (unlock === true) {
            waitForBackup(w, index, client)
        }
    }, 2000)
}

function waitForBackup(w, index, client) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("scanned to height") != -1) {
            walletData[index].status = "unlock";
            backappWallet(w, index, client);
        } else {
            waitForBackup(w, index, client)
        }
    }, 3000);
}




function backappWallet(w, index, client) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        walletData[index].status = "unlock";
        if (status.search("Done!") != -1) {
            backup(w, index, client)
        } else {
            backappWallet(w, index, client);
        }
    }, 5000)
}

function backup(w, index, client) {
    let decode = helpers.decodeWallet(w)
    client.sendRequest('GET', '/wallet/backup', {
        destination: "/root/wallets/" + decode
    }).catch((err) => {

        bot.sendErrors(err, "error from backup GET /wallet/backup")

    })
    walletData[index].status = "done";
    if (walletData[index].logout === true) {
        logout.logout(index, walletData, null, decode)
    }
}

///// OLD WALLET

function oldWallet(wallet, res, index) {

    let client = helpers.siaClient(walletData[index]["api-addr"])

    client.sendRequest('GET', '/daemon/stop')
        .then((data) => {
            copyWallet(wallet, res, index, client)
        })
        .catch((err) => {
            res.send(err);

            bot.sendErrors(err, "error from oldWallet GET /daemon/stop")

        });
}

function copyWallet(wallet, res, index, client) {
    let walletName = helpers.decodeWallet(wallet);
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("Shutdown complete.") != -1) {
            let execute = await helpers.executeCommand("sudo cp /root/wallets/" + walletName + " /root/" + walletData[index].name + "/wallet/wallet.db")
            if (execute.search("done") != -1) {
                let runSia = await helpers.runDemon(walletData[index].name, walletData[index]["api-addr"], walletData[index]["rpc-addr"], walletData[index]["host-addr"]);
                if (runSia.search("done") != -1) {
                    startDemon(wallet, res, index, client);
                } else {
                    console.log("function start Demon is not executed")
                    res.send("function start Demon is not executed")
                }
            }
        } else {
            console.log("shutdown is error");
            copyWallet(wallet, res, index, client);
        }
    }, 1000)
}


async function startDemon(wallet, res, index, client) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("Finished loading") != -1) {
            checkConsensusExistWallet(wallet, res, index, client)

        } else {
            startDemon(wallet, res, index, client);
        }
    }, 1000)

}



// NOT SHURE THST ITS' CORRECT
async function checkConsensusExistWallet(wallet, res, index, client) {

    let consensus = await client.sendRequest('GET', '/consensus').then((data) => {
        return data;
    }).catch((err) => {

        bot.sendErrors(err, "error from checkConsensusExistWallet GET /consensus")

    })

    let basicConsensus = await readLastLines.read('/root/consensus/consensus.out', 1);

    if (consensus !== undefined || basicConsensus !== undefined) {
        if (Number(consensus.height) === Number(basicConsensus)) {
            setUnlockExistWallet(wallet, res, index, client)
        } else {
            setTimeout(() => {
                checkConsensusExistWallet(wallet, res, index, client);
            }, 2000)
        }
    } else {
        setTimeout(() => {
            checkConsensusExistWallet(wallet, res, index, client);
        }, 2000)
    }
}


function setUnlockExistWallet(wallet, res, index, client) {
    let promise = new Promise((resolve, reject) => {
        client.sendRequest('POST', '/wallet/unlock', {
            encryptionpassword: wallet,
        }).catch((err) => {

            bot.sendErrors(err, "error from setUnlockExistWallet GET /wallet/unlock")

        })
        setTimeout(() => {
            resolve("done");
        }, 5000)
    })

    promise.then(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("scanned to height") === -1) {
            res.send("done");
            walletData[index].status = "done";
        } else {
            res.send("unlock");
            walletData[index].status = "unlock";
            unlockExistWallet(wallet, index, client)
        }
    })
}


async function unlockExistWallet(w, index, client) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("Done!") === -1) {
            unlockExistWallet(w, index, client)
        } else {
            setTimeout(async () => {
                let decode = helpers.decodeWallet(w);
                await helpers.executeCommand("sudo cp -a /root/" + walletData[index].name + "/wallet/wallet.db /root/wallets/" + decode);
                walletData[index].status = "done";
            }, 5000)
        }
    }, 1000)
}

