var helpers = require("../helpers/helpers");


module.exports.logout = async (index, data, res, decode, deleteWallet) => {
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
        data[index].wallet = null;
        data[index].logout = false;
        data[index].status = null;
        data[index].lastUpdate = null;
    }
}



