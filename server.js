#!/usr/bin/env node
process.env.UV_THREADPOOL_SIZE = 128;

var helpers = require('./helpers/helpers');
var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var _ = require("lodash");

var logout = require("./services/logout");
var init = require('./services/init');
var wallet = require('./services/seed');
var addresses = require('./services/addresses');
var transactions = require('./services/transactions');
var send = require("./services/send");
var newWallet = require("./services/newWallet");
var price = require("./services/price");
var consensus = require("./services/consensus");

const multer = require('multer');
const upload = multer();


var cors = require('cors');

app.use(cors({
    origin: "*"
}))
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({
    extended: true
}));


app.post('/getstatus', async (req, res) => {
    let decode = helpers.decodeWallet(req.body.wallet);
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === decode });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {
        let status = await helpers.getStatus(data[index].name);
        data[index].lastUpdate = new Date();
        res.send(status);
    }
});

app.post('/logout', upload.none(), async (req, res) => {
    let value = JSON.parse(req.body)
    let decode = helpers.decodeWallet(value.wallet);
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === decode });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {
        data[index].lastUpdate = new Date();
        logout.logout(index, data, res, decode, true)
    }
});

app.get("/allData", (req, res) => {
    let data = wallet.allWallets();
    res.send(data);
})


app.post("/coins", (req, res) => {
    let decode = helpers.decodeWallet(req.body.wallet);
    let data = wallet.allWallets();
    let index = _.findIndex(data, function (o) { return o.wallet === decode });
    if (index === -1) {
        res.statusMessage = "wallet not found";
        res.status(400).end();
    } else {

        let client = helpers.siaClient(data[index]["api-addr"])
        data[index].lastUpdate = new Date();

        client.sendRequest('GET', '/wallet')
            .then((data) => {
                res.send(data);
            })
            .catch((err) => {
                res.statusMessage = err.response.body.message;
                res.status(err.response.statusCode).end();
            });
    }
});


app.get("/consensus/main", async (req, res) => {
    consensus.mainConsensus(req, res)
})

app.post("/consensus/coin", async (req, res) => {
    consensus.walletConsensus(req, res)
})

app.post("/addresses", async (req, res) => {
    addresses.getAddresses(req, res);
})

app.post("/addresses/create", async (req, res) => {
    addresses.setAddresses(req, res);
})


app.post("/seed", async (req, res) => {
    wallet.gotSeed(req.body.wallet, res)
})

app.post("/transactions", async (req, res) => {
    transactions.getTransactions(req, res)
})

app.post("/send/coins", async (req, res) => {
    send.sendCoins(req, res)
})

app.get("/create", async (req, res) => {
    newWallet.createWallet(req, res)
})

app.get("/price", async (req, res) => {
    price.getPrice(req, res)
})

app.listen(3000, async () => {
    wallet.walletInit();
    init.init();
    logOutByTime();
});

function logOutByTime() {
    setInterval(() => {
        let data = wallet.allWallets();
        for (i = 0; i < data.length; i++) {
            if (data[i].lastUpdate !== null) {
                if (data[i].status === "done") {
                    let d1 = new Date(data[i].lastUpdate);
                    let d2 = new Date();
                    let d3 = d2.getTime() - d1.getTime();
                    if (d3 > 120000) {
                        logout.logout(i, data, null, data[i].wallet, false)
                    }
                }
            }
        }
    }, 120000)

}





