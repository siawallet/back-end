const Discord = require('discord.js')
const clientBot = new Discord.Client()
const botToken = "Bla_Bla_Bla";
const channelID = "Bla_Bla_Bla";


module.exports.runBot = () => {
    clientBot.login(botToken)
}

module.exports.sendErrors = (err, errMess) => {
    let message
    if (err.response === undefined) {
        message = String(err)
    } else {
        message = err.response.body.message
    }


    var generalChannel = clientBot.channels.get(channelID)
    generalChannel.send(errMess);
    generalChannel.send(message);


    console.log(errMess)
    console.log(message);
}
