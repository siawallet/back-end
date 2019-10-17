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

module.exports.authWallet = (wallet, res, hash, password) => {
    let findWallet = _.findIndex(walletData, function (o) { return o.wallet === hash });
    if (findWallet === -1) {
        bridge(wallet, res, hash, "HHD", password, null)
    } else {
        walletData[findWallet].lastUpdate = new Date();
        walletData[findWallet].logout = false;
        res.send({
            status: walletData[findWallet].status,
            hash: hash
        });
    }

}

module.exports.gotSeed = (req, res) => {
    let wallet = req.body.wallet
    let registPassword = req.body.password
    let decode = helpers.decodeWallet(wallet);
    let findWallet = _.findIndex(walletData, function (o) { return o.wallet === decode });
    if (findWallet === -1) {
        findInBackUp(wallet, res, decode, registPassword);
    } else {
        walletData[findWallet].lastUpdate = new Date();
        walletData[findWallet].logout = false;
        res.send({ status: walletData[findWallet].status });
    }
}

function findInBackUp(wallet, res, decode, registPassword) {
    let password = null
    glob("../wallets/*", async (er, files) => {
        if (er === null) {
            let existWallet = _.findIndex(files, (o) => { return o === "../wallets/" + decode; });
            if (existWallet === -1) {
                // wallet not found
                bridge(wallet, res, decode, "RAM", password, registPassword)

            } else {
                // wallet found
                bridge(wallet, res, decode, "HHD", password, registPassword)

            }
        } else {
            res.send("1 blob get files error")
        }
    })
}

function bridge(wallet, res, decode, from, password, registPassword) {
    // wallet not found
    let object = _.filter(walletData, function (o) { return o.from === from });
    let findWalletNull = _.findIndex(object, function (o) { return o.wallet === null });
    if (findWalletNull === -1) {

        res.status(400);
        res.send("The server is busy with other users, please try again in a few minutes. Your data is not stored.");

        bot.sendErrors("error " + from + " The server is busy with other users, please try again in a few minutes. Your data is not  stored.", "error" + from)

    } else {
        let index = _.findIndex(walletData, function (o) { return o.id === object[findWalletNull].id });
        walletData[index].wallet = decode;
        walletData[index].lastUpdate = new Date();
        checkIfDemonIsReady(wallet, res, index, from, password, registPassword)
    }
}

function checkIfDemonIsReady(wallet, res, index, from, password, registPassword) {
    let client = helpers.siaClient(walletData[index]["api-addr"])
    client.sendRequest('GET', '/wallet')
        .then(() => {
            if (from === "RAM") {
                checkConsensus(wallet, res, index, registPassword)
            } else {
                oldWallet(wallet, res, index, password, registPassword)
            }
        })
        .catch((err) => {
            console.log("get coins error")
            let findError = err.message.search("Error: connect ECONNREFUSED");
            if (findError !== -1) {
                setTimeout(() => {
                    checkIfDemonIsReady(wallet, res, index, password, registPassword)
                }, 2000)
            }
        });
}

async function checkConsensus(wallet, res, index, registPassword) {
    //lets find exite wallet
    let client = helpers.siaClient(walletData[index]["api-addr"])

    let consensus = await client.sendRequest('GET', '/consensus').then((data) => {
        return data.synced;
    }).catch((err) => {

        bot.sendErrors(err, "error from checkConsensus GET /consensus")

    })

    if (consensus === true) {
        newWallet(wallet, res, index, client, registPassword)
    } else {
        setTimeout(() => {
            checkConsensus(wallet, res, index, registPassword);
        }, 2000)
    }
}

function newWallet(wallet, res, index, client, registPassword) {
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
            waitForStatus(wallet, index, client, res, registPassword)
        }
    }, 2000)

}

function waitForStatus(wallet, index, client, res, registPassword) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("scanned to height") != -1) {
            walletData[index].status = "init";
            res.send({ status: "lets go" })
            waitForUnlock(wallet, index, client, registPassword);
        } else {
            waitForStatus(wallet, index, client, res, registPassword)
        }
    }, 3000);
}

function waitForUnlock(w, index, client, registPassword) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        walletData[index].status = "init";
        if (status.search("Done!") != -1) {
            unlockWallet(w, index, client, registPassword)
        } else {
            waitForUnlock(w, index, client, registPassword);
        }
    }, 5000)
}

function unlockWallet(w, index, client, registPassword) {
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
            waitForBackup(w, index, client, registPassword)
        }
    }, 2000)
}

function waitForBackup(w, index, client, registPassword) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("scanned to height") != -1) {
            walletData[index].status = "unlock";
            backappWallet(w, index, client, registPassword);
        } else {
            waitForBackup(w, index, client, registPassword)
        }
    }, 3000);
}




function backappWallet(w, index, client, registPassword) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        walletData[index].status = "unlock";
        if (status.search("Done!") != -1) {
            setPasswordNewWallet(w, index, client, registPassword)
        } else {
            backappWallet(w, index, client, registPassword);
        }
    }, 5000)
}

function setPasswordNewWallet(w, index, client, registPassword) {
    if (registPassword !== null) {
        client.sendRequest('POST', '/wallet/changepassword', {
            encryptionpassword: w,
            newpassword: registPassword
        }).then(() => {
            backup(w, index, client)
        }).catch((err) => {
            console.log("err setPasswordNewWallet")
            console.log(err)
        })
    } else {
        backup(w, index, client)
    }
}

async function backup(w, index, client) {
    let decode = helpers.decodeWallet(w)

    await helpers.executeCommand("sudo cp -a /root/" + walletData[index].name + "/wallet/wallet.db /root/wallets/" + decode);

    walletData[index].status = "done";
    if (walletData[index].logout === true) {
        logout.logout(index, walletData, null, decode)
    }
}

///// OLD WALLET

function oldWallet(wallet, res, index, password, registPassword) {

    let client = helpers.siaClient(walletData[index]["api-addr"])

    client.sendRequest('GET', '/daemon/stop')
        .then(() => {
            copyWallet(wallet, res, index, client, password, registPassword)
        })
        .catch((err) => {
            res.send(err);

            bot.sendErrors(err, "error from oldWallet GET /daemon/stop")

        });
}

function copyWallet(wallet, res, index, client, password, registPassword) {
    let decode = password === null ? helpers.decodeWallet(wallet) : wallet;
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("Shutdown complete.") != -1) {
            let execute = await helpers.executeCommand("sudo cp /root/wallets/" + decode + " /root/" + walletData[index].name + "/wallet/wallet.db")
                .catch((err) => {
                    walletData[index].wallet = null;
                    walletData[index].logout = false;
                    walletData[index].status = null;
                    walletData[index].lastUpdate = null;
                    res.status(400);
                    res.send(err.stderr);
                })
            if (execute.search("done") != -1) {
                let runSia = await helpers.runDemon(walletData[index].name, walletData[index]["api-addr"], walletData[index]["rpc-addr"], walletData[index]["host-addr"]);
                if (runSia.search("done") != -1) {
                    startDemon(wallet, res, index, client, password, registPassword);
                } else {
                    console.log("function start Demon is not executed")
                    res.send("function start Demon is not executed")
                }
            }
        } else {
            console.log("shutdown is error");
            copyWallet(wallet, res, index, client, password, registPassword);
        }
    }, 1000)
}


async function startDemon(wallet, res, index, client, password, registPassword) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("Finished loading") != -1) {
            checkConsensusExistWallet(wallet, res, index, client, password, registPassword)

        } else {
            startDemon(wallet, res, index, client, password, registPassword);
        }
    }, 1000)

}



async function checkConsensusExistWallet(wallet, res, index, client, password, registPassword) {

    let consensus = await client.sendRequest('GET', '/consensus').then((data) => {
        return data;
    }).catch((err) => {

        bot.sendErrors(err, "error from checkConsensusExistWallet GET /consensus")

    })

    let basicConsensus = await readLastLines.read('/root/consensus/consensus.out', 1);

    if (consensus !== undefined || basicConsensus !== undefined) {
        if (Number(consensus.height) === Number(basicConsensus)) {
            setUnlockExistWallet(wallet, res, index, client, password, registPassword)
        } else {
            setTimeout(() => {
                checkConsensusExistWallet(wallet, res, index, client, password, registPassword);
            }, 2000)
        }
    } else {
        setTimeout(() => {
            checkConsensusExistWallet(wallet, res, index, client, password, registPassword);
        }, 2000)
    }
}


function setUnlockExistWallet(wallet, res, index, client, password, registPassword) {
    let keyIsIncorrect = false
    let pass = password === null ? wallet : password
    let promise = new Promise((resolve, reject) => {
        client.sendRequest('POST', '/wallet/unlock', {
            encryptionpassword: pass,
        }).catch((err) => {
            if (err.response !== undefined && err.response.body !== undefined) {
                if (err.response.body.message.search("provided encryption key is incorrect") !== -1) {
                    keyIsIncorrect = true;
                }
            }

            bot.sendErrors(err, "error from setUnlockExistWallet GET /wallet/unlock")

        })
        setTimeout(() => {
            resolve("done");
        }, 5000)
    })

    promise.then(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("scanned to height") === -1) {
            let data = {
                status: "done",
                hash: password === null ? "" : wallet,
                key: keyIsIncorrect === false ? '' : "provided encryption key is incorrect"
            }

            if (registPassword !== null) {
                setPasswordOld(wallet, client, registPassword)
            }

            res.send(data);
            walletData[index].status = "done";
        } else {
            let data = {
                status: "unlock",
                hash: password === null ? "" : wallet,
                key: keyIsIncorrect === false ? '' : "provided encryption key is incorrect"
            }
            res.send(data);
            walletData[index].status = "unlock";
            unlockExistWallet(wallet, index, client, password, registPassword)
        }
    })
}


async function unlockExistWallet(w, index, client, password, registPassword) {
    setTimeout(async () => {
        let status = await helpers.getStatus(walletData[index].name);
        if (status.search("Done!") === -1) {
            unlockExistWallet(w, index, client, password, registPassword)
        } else {

            if (registPassword !== null) {
                setPasswordOld(w, client, registPassword)
            }

            setTimeout(async () => {
                let decode = password === null ? helpers.decodeWallet(w) : w;
                await helpers.executeCommand("sudo cp -a /root/" + walletData[index].name + "/wallet/wallet.db /root/wallets/" + decode);
                walletData[index].status = "done";
            }, 5000)
        }
    }, 1000)
}

function setPasswordOld(w, client, registPassword) {
    client.sendRequest('POST', '/wallet/changepassword', {
        encryptionpassword: w,
        newpassword: registPassword
    }).catch((err) => {
        console.log("err setPasswordNewWallet")
        console.log(err)
    })
}