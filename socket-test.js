const Logger  = require('frozor-logger');
let log       = new Logger('TEST');
let WebSocket = require('./ReconnectingWebsocket');

let TestSocket = new WebSocket({
    prefix: 'Test Socket',
    name  : 'Test Socket',
    jeon  : true
});

TestSocket.connect('wss://echo.websocket.org');

TestSocket.on('connected', ()=>{
    TestSocket.sendJSON({
        message: 'Hello'
    });

    TestSocket.sendText('Hello World!');
});

TestSocket.on('message', (message)=>{
    log.info(`Got a message: ${JSON.stringify(message)}`);
});