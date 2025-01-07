const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const GlobalChat = require('./globalchat');
// use three.npc.js here
const { addNPCRoutes, createNPC, activateNPC, deactivateNPC, getActiveNPCs, getAllNPCs, chatWithNPC, getChatHistory } = require('./three.npc.js');
const app = express();
// session storage
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const fileStoreOptions = {};
app.use(session({
    store: new FileStore(fileStoreOptions),
    secret: 'keyboard cat',
}));

app.use(cors());
app.use(express.json());
addNPCRoutes(app);
// now serve the static files out of /client/dist
app.use(express.static('client/dist'));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const globalChat = new GlobalChat(server, io);

const players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Add new player to the players object
    players[socket.id] = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        name: 'Player ',
        animation: 'idle'
    };

    // Send the current state of all players to the new player
    socket.emit('currentPlayers', players);

    // Broadcast new player to all other players
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    // Handle player state updates
    socket.on('updateState', (state) => {
        if (players[socket.id]) {
            players[socket.id] = state;
            // Broadcast updated state to all other players
            socket.broadcast.emit('updateState', { id: socket.id, ...state });
        }
    });

    socket.on('audioStream', (audioData) => {
        socket.broadcast.emit('audioStream', {
            id: socket.id,
            audioData
        });
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('A player disconnected:', socket.id);
        // Remove player from the players object
        delete players[socket.id];
        // Broadcast player disconnection to all other players
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});