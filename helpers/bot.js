const Discord = require('discord.js')
const clientBot = new Discord.Client()
const botToken = "bot_token";
const channelID = "channel_id";


module.exports.runBot = () => {
    clientBot.login(botToken)
}

module.exports.sendErrors = (err, errMess) => {
    let message
    if (err.response === undefined) {
        message = String(err)
    } else if (err.response.body === undefined) {
        message = err.response
    } else {
        message = err.response.body.message
    }

    if (validator(message) === false) {
        var generalChannel = clientBot.channels.get(channelID)
        generalChannel.send(errMess);
        generalChannel.send(message);

        console.log(errMess)
        console.log(message);
    }
}

function validator(message) {
    if (message.search("ESOCKETTIMEDOUT") !== -1 ||
        message.search("word not found in dictionary") !== -1 ||
        message.search("invalid formatting") !== -1 ||
        message.search("seed is not valid") !== -1 ||
        message.search("illegal character") !== -1 ||
        message.search("illegal number of bytes") !== -1 ||
        message.search("wallet has coins spent in") !== -1 ||
        message.search("checksum verification") !== -1) {
        return true
    } else {
        return false
    }
}
