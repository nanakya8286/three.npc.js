const socketIo = require('socket.io');
// bad words
// const Filter = require('bad-words');

function removeXSS(message) {
   // remove any HTML tags from the message
    return message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
class GlobalChat {
    constructor(server, io) {
        this.server = server;
        this.io = io || socketIo(server);
        // this.filter = new Filter();

        this.io.on('connection', (socket) => {
            console.log('A user connected to the chat:', socket.id);

            socket.on('chatMessage', (message) => {
                console.log(`Message from ${socket.id}: ${message}`);
                // this.io.emit('receiveMessage', { id: socket.id, message });

                const filteredMessage = removeXSS(message).slice(0, 100); // limit message length to 100 characters
                // prevent XSS

                this.io.emit('chatMessage', { id: socket.id, message: filteredMessage });
            });

            socket.on('disconnect', () => {
                console.log('A user disconnected from the chat:', socket.id);
            });
        });
    }
}

module.exports = GlobalChat;
