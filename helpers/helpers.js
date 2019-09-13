var readLastLines = require('read-last-lines');
var execSync = require('child_process').execSync;
var child_process = require('child_process')
var fs = require('fs');
var SiaClient = require('node-sia');
var crypto = require('crypto');

module.exports.getStatus = name => {
   return readLastLines.read('../' + name + '/nohup.out', 1);
};

module.exports.executeCommand = async (command) => {
   return await runCommand(command)
}

function runCommand(command) {
   return new Promise((resolve, reject) => {
      var options = {
         encoding: 'utf8'
      };
      execSync(command, options);
      resolve("done")
   })
}

module.exports.runDemon = (name, apiAddr, rpcAddr, hostAddr) => {
   return new Promise((resolve, reject) => {
      var out = fs.openSync('../' + name + '/nohup.out', 'a');
      var err = fs.openSync('../' + name + '/nohup.out', 'a');
      child_process.spawn('nohup',
         ['./siad',
            //  '--authenticate-api=false',
            '-M',
            'gctw',
            "--api-addr=" + apiAddr,
            "--rpc-addr=" + rpcAddr,
            "--host-addr=" + hostAddr],
         {
            cwd: '../' + name + '/',
            stdio: ['ignore', out, err],
            detached: true
         });

      resolve('done');
   })
}

module.exports.decodeWallet = wallet => {
   return crypto.createHash('md5').update(wallet).digest('hex');
}

module.exports.siaClient = port => {
   var parameters = {
      "url": "http://" + port,
      "password": "Bla_bla_bla"
   }

   return new SiaClient(parameters);
}

module.exports.deleteWallet = async (name) => {
   return await runCommand("sudo rm -rf /root/" + name + "/wallet")
}
