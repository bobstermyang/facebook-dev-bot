var net = require('net');

var PIPE_NAME = "log_pipe";
var PIPE_PATH = "\\\\.\\pipe\\" + PIPE_NAME;

var client = net.connect(PIPE_PATH, function() {
    console.log('Client: on connection');
})

client.on('end', function() {
    console.log('Client: on end');
})


function randomLogging() {
    var rand = Math.round(Math.random() * (10000 - 2000)) + 2000;
    setTimeout(function() {
        client.write('severe message mockup');
		console.log('Message sent');
        randomLogging();  
    }, rand);
};


randomLogging();
console.log('Started')