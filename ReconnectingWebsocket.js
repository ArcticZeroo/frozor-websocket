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
        this.log         = new Logger(this.options.prefix);
        this.name        = this.options.name;
        this.socket      = new WebSocketClient();
        this.isConnected = false;
        this.connection  = null;

        this.socket.on('connect', (connection)=>{
            //Set these variables in case I need them once connected is emitted
            this.isConnected = true;
            this.connection  = connection;

            //Print to console that it's connected
            this.log.info(`Connected to ${this.log.chalk.cyan(this.getSocketName())}!`);

            //Emit the connected event!
            this.emit('connected');

            connection.on('message', (message)=>{
                //If it's not UTF8 run away
                if(message.type != 'utf8') return;

                //Set it to the UTF8 Data, who cares about the rest!
                message = message.utf8Data;

                if(options.json) message = JSON.parse(message);

                this.emit('message', message);
            });

            connection.on('error', (error)=>{
                this.log.error(`Error in connection to ${this.getSocketName()}: ${this.log.chalk.red(error)}`);
                this.isConnected = false;

                this.emit('error', error);

                this.disconnected();
            });

            connection.on('close', (code, description)=>{
                this.log.warn(`Connection to ${this.getSocketName()} closed.`);
                this.isConnected = false;

                this.emit('close', code, description);

                this.disconnected();
            });

            connection.on('connectFailed', ()=>{
                this.log.warn(`Unable to connect to the ${this.getSocketName()} socket.`);
                this.isConnected = false;

                this.emit('connectFailed');

                this.disconnected();
            });
        });
    }

    getSocketName(){
        return this.name || 'Websocket';
    }

    disconnected(){
        if(this.options.reconnect) this.resetConnectionDelay(10*1000, connection);
    }

    resetConnectionDelay(delay, connection){
        setTimeout(()=>{
            this.resetConnectionImmediate(connection);
        }, delay);
    }

    resetConnectionImmediate(connection){
        this.log.warn(this.log.chalk.magenta(`Resetting ${this.getSocketName()} connection...`));
        if(connection) connection.drop();
        this.connect(this.options.reconnect_url || undefined);
    }

    connect(url){
        if(url) this.options.url = url;

        this.log.info(`Connecting to ${this.log.chalk.cyan(this.getSocketName())}...`);
        this.isConnected = false;
        this.socket.connect(this.options.url);

        setTimeout(()=>{
            if(!this.isConnected) this.resetConnectionImmediate();
        }, 15*1000);
    }

    sendJSON(json){
        if(!this.connection) return this.log.debug(this.connection);

        this.connection.sendUTF(JSON.stringify(json));
    }

    sendText(text){
        if(!this.connection) return this.log.debug(this.connection);

        this.connection.sendUTF(text);
    }
}

module.exports = ReconnectingWebsocket;