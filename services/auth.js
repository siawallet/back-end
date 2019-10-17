
const MongoClient = require('mongodb').MongoClient;
const seed = require('./seed');
var helpers = require("../helpers/helpers");

const uri = 'mongo_key'


module.exports.auth = (req, res) => {

    MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            res.status(400);
            res.send("error database connection");
            throw err;
        }
        let dbo = db.db("mydb");

        var data = {
            email: req.body.email,
            password: req.body.password,
            hash: req.body.hash
        };

        dbo.collection("users").insertOne(data, function (err, response) {
            if (err) {
                res.status(400);
                res.send("error database connection");
                throw err;
            }

            res.status(200).end();
            db.close();

        });

    });
}

module.exports.authGuard = (req, res) => {
    MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            res.status(400);
            res.send("error database connection");
            throw err;
        }
        let dbo = db.db("mydb");

        dbo.collection("users").findOne({ email: req.body.email }, (err, result) => {
            if (err) {
                res.status(400);
                res.send("error database connection");
                throw err;
            }
            if (result === null) {

                res.status(200).end();
                db.close();

            } else {
                res.status(400);
                res.send("user already exist");
                db.close();
            }
        })
    });
}


module.exports.login = (req, res) => {
    MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            res.status(400);
            res.send("error database connection");
            throw err;
        }
        let dbo = db.db("mydb");

        dbo.collection("users").findOne({ email: req.body.email }, (err, result) => {
            if (err) {
                res.status(400);
                res.send("error database connection");
                throw err;
            }
            if (result === null) {

                res.status(400);
                res.send("user not found");
                db.close();

            } else {
                if (result.password !== req.body.password) {
                    res.status(400);
                    res.send("password not correct");
                    db.close();
                } else {
                    seed.authWallet(result.hash, res, result.hash, result.password);
                    db.close();
                }
            }
        })
    });
}

module.exports.userUpdate = (req, res) => {
    MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            res.status(400);
            res.send("error database connection");
            throw err;
        }
        let dbo = db.db("mydb");

        var myquery = { email: req.body.email };

        var newvalues = {
            $set: {
                email: req.body.email,
                password: req.body.password,
                hash: req.body.hash
            }
        };
        dbo.collection("users").updateOne(myquery, newvalues, function (err, responce) {
            if (err) {
                res.status(400);
                res.send("error database connection");
                throw err;
            }
            res.send("1 document updated");
            db.close();
        });
    });
}

module.exports.existedUser = (req, res) => {
    MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            res.status(400);
            res.send("error database connection");
            throw err;
        }
        let dbo = db.db("mydb");
        dbo.collection("users").findOne({ hash: req.body.hash }, (err, result) => {
            if (err) {
                res.status(400);
                res.send("error database connection");
                throw err;
            }
            if (result !== null) {
                res.status(400);
                res.send("hash already exist");
                db.close();
            } else {
                res.status(200);
                res.send("ok");
                db.close();
            }
        })
    });
}

module.exports.authDelete = (req, res) => {
    let walletHash = req.body.hash
    let deleteWallet = req.body.deleteWallet
    MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            res.status(400);
            res.send("error database connection");
            throw err;
        }
        let dbo = db.db("mydb");

        var deletedData = {
            hash: walletHash
        };

        dbo.collection("users").deleteOne(deletedData, async (err, result) => {
            if (err) {
                res.status(400);
                res.send("error database connection");
                throw err;
            }
            if (result) {
                res.status(200);
                res.send("ok");
                db.close();
                if (deleteWallet === true) {

                    await helpers.executeCommand("sudo rm -rf /root/wallets/" + walletHash)

                }
            }else{
                res.status(400);
                res.send("error deleting");
                db.close();
            }
        })
    });
}




