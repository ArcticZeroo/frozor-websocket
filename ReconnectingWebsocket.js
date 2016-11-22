var Logger          = require('frozor-logger');

var EventEmitter    = require('events');
var WebSocketClient = require('websocket').client;

var StatusType = {
    RECONNECTING  : 'STATUS_RECONNECTING',
    CONNECTFAILED : 'STATUS_CONNECTFAILED',
    ERROR         : 'STATUS_CONNECTERROR',
    CONNECTED     : 'STATUS_CONNECTED',
    CLOSED        : 'STATUS_CLOSED',
    PENDING_RESET : 'STATUS_PENDINGRESET',
    CONNECTING    : 'STATUS_CONNECTING',
    NOT_CONNECTED : 'STATUS_NOT_CONNECTED'

};

class ReconnectingWebsocket extends EventEmitter{
    constructor(options = {}){
        super();
        this.options     = options;
        this.log         = new Logger(options.prefix);
        this.name        = options.name;
        this.socket      = new WebSocketClient();
        this.status      = StatusType.NOT_CONNECTED;
        this.isConnected = false;

        this.socket.on('connect', (connection)=>{
            this.isConnected = true;
            this.log.info(`Connected to ${this.log.chalk.cyan(this.getSocketName())}!`);
            this.emit('connected');

            this.status = StatusType.CONNECTED;

            connection.on('message', (message)=>{
                if(message.type != 'utf8') return;

                message = message.utf8Data;

                if(options.json) message = JSON.parse(message);

                this.emit('message', message);
            });

            connection.on('error', (error)=>{
                this.log.error(`Error in connection to ${this.getSocketName()}: ${this.log.chalk.red(error)}`);
                this.isConnected = false;

                this.emit('error');
                this.status = StatusType.ERROR;

                this.resetConnectionDelay(10*1000, connection);
            });

            connection.on('close', ()=>{
                this.log.warning(`Connection to ${this.getSocketName()} closed.`);
                this.isConnected = false;

                this.emit('close');
                this.status = StatusType.CLOSED;

                this.resetConnectionDelay(10*1000, connection);
            });

            connection.on('connectFailed', ()=>{
                this.log.warning(`Unable to connect to the ${this.getSocketName()} socket.`);
                this.isConnected = false;

                this.emit('connectFailed');
                this.status = StatusType.CONNECTFAILED;

                this.resetConnectionDelay(10*1000, connection);
            });
        });
    }

    getSocketName(){
        return this.name || 'Websocket';
    }

    resetConnectionDelay(delay, connection){
        setTimeout(()=>{
            this.status = StatusType.PENDING_RESET;
            this.resetConnectionImmediate(connection);
        }, delay);
    }

    resetConnectionImmediate(connection){
        this.log.warning(this.log.chalk.magenta(`Resetting ${this.getSocketName()} connection...`));
        if(connection) connection.drop();
        this.connect();
    }

    connect(url){
        if(url) this.options.url = url;

        this.status = StatusType.CONNECTING;
        this.log.info(`Connecting to ${this.log.chalk.cyan(this.getSocketName())}...`);
        this.isConnected = false;
        this.socket.connect(this.options.url);

        setTimeout(()=>{
            if(!this.isConnected) this.resetConnectionImmediate();
        }, 15*1000);
    }
}

module.exports = ReconnectingWebsocket;