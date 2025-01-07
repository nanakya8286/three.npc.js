const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { OpenAI } = require('openai');

const openai = new OpenAI();

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE NPC (id TEXT PRIMARY KEY, name TEXT, bio TEXT, knowledge TEXT, lore TEXT, active INTEGER, ip TEXT)");
});

const activeNPCs = {};

async function createNPC(id, name, bio, knowledge, lore, ip) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM NPC WHERE ip = ?", [ip], (err, row) => {
            if (row) {
                return reject({ error: 'NPC creation limit reached for this IP' });
            }

            db.get("SELECT id FROM NPC WHERE id = ?", [id], (err, row) => {
                if (row) {
                    return reject({ error: 'NPC with this ID already exists' });
                }

                db.run("INSERT INTO NPC (id, name, bio, knowledge, lore, active, ip) VALUES (?, ?, ?, ?, ?, 1, ?)", [id, name, bio, knowledge, lore, ip], (err) => {
                    if (err) {
                        return reject({ error: 'Failed to create NPC' });
                    }

                    db.get("SELECT * FROM NPC WHERE id = ?", [id], (err, row) => {
                        if (row) {
                            activeNPCs[id] = row;
                        }
                        resolve({ message: 'NPC created and activated successfully' });
                    });
                });
            });
        });
    });
}

async function activateNPC(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM NPC WHERE id = ?", [id], (err, row) => {
            if (row) {
                activeNPCs[id] = row;
                db.run("UPDATE NPC SET active = 1 WHERE id = ?", [id]);
            }
            resolve({ message: 'NPC activated successfully' });
        });
    });
}

async function deactivateNPC(id) {
    return new Promise((resolve, reject) => {
        delete activeNPCs[id];
        db.run("UPDATE NPC SET active = 0 WHERE id = ?", [id]);
        resolve({ message: 'NPC deactivated successfully' });
    });
}

async function getActiveNPCs() {
    return new Promise((resolve, reject) => {
        resolve(Object.values(activeNPCs));
    });
}

async function getAllNPCs() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM NPC", (err, rows) => {
            if (err) {
                return reject({ error: 'Failed to retrieve NPCs' });
            }
            resolve(rows);
        });
    });
}

async function chatWithNPC(id, message, session) {
    console.log('chatWithNPC', id, message, session);
    const npc = activeNPCs[id];
    if (!npc) {
        throw { error: 'Active NPC not found' };
    }

    if (!session.chats) {
        session.chats = {};
    }

    if (!session.chats[id]) {
        session.chats[id] = [];
    }

    session.chats[id].push({ role: 'user', content: message });

    const chatHistory = [
        { 
            role: "system", 
            content: `You are the NPC ${npc.name}. Bio: ${npc.bio}. Knowledge: ${npc.knowledge}. Lore: ${npc.lore}.` 
        },
        ...session.chats[id]
    ];

    try {
        console.log('chatHistory', chatHistory);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: chatHistory,
        });

        const npcResponse = response.choices[0].message.content;
        session.chats[id].push({ role: 'assistant', content: npcResponse });

        return { response: npcResponse };
    } catch (error) {
        console.error(error, chatHistory);
        throw { error: 'Failed to communicate with NPC' };
    }
}

async function getChatHistory(id, session) {
    return new Promise((resolve, reject) => {
        const chatHistory = session.chats ? session.chats[id] : [];
        resolve(chatHistory);
    });
}

function addNPCRoutes(app) {
    app.post('/api/NPC/chat/create', async (req, res) => {
        const { id, name, bio, knowledge, lore } = req.body;
        const ip = Math.random()+'';//req.ip;
        try {
            const result = await createNPC(id, name, bio, knowledge, lore, ip);
            res.status(201).json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });

    app.post('/api/NPC/chat/activate', async (req, res) => {
        const { id } = req.body;
        try {
            const result = await activateNPC(id);
            res.json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });

    app.post('/api/NPC/chat/deactivate', async (req, res) => {
        const { id } = req.body;
        try {
            const result = await deactivateNPC(id);
            res.json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });

    app.get('/api/NPC/chat/active', async (req, res) => {
        try {
            const result = await getActiveNPCs();
            res.json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });

    app.get('/api/NPC/chat/all', async (req, res) => {
        try {
            const result = await getAllNPCs();
            res.json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });

    app.post('/api/NPC/chat', async (req, res) => {
        console.log('chat', req.body);
        const { id, message } = req.body;
        try {
            const result = await chatWithNPC(id, message, req.session);
            res.json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });

    app.get('/api/NPC/chat/history', async (req, res) => {
        const { id } = req.query;
        try {
            const result = await getChatHistory(id, req.session);
            res.json(result);
        } catch (err) {
            res.status(400).json(err);
        }
    });
}

module.exports = {
    addNPCRoutes,
    createNPC,
    activateNPC,
    deactivateNPC,
    getActiveNPCs,
    getAllNPCs,
    chatWithNPC,
    getChatHistory
};

// if this is the main file, then create the server or run tests depending on args
if (require.main === module) {
    if(process.argv.length > 2 && process.argv[2] === 'test'){
        const { createNPC, activateNPC, deactivateNPC, getActiveNPCs, getAllNPCs, chatWithNPC, getChatHistory } = module.exports;
        const session = {};
        async function test() {
            console.log('Creating NPC...');
            await createNPC('test-npc', 'Test NPC', 'Test bio', 'Test knowledge', 'Test lore', 'test-ip').then(result => console.log(result)).catch(err => console.log(err));
            console.log('Activating NPC...');
            await activateNPC('test-npc').then(result => console.log(result)).catch(err => console.log(err));
            console.log('Getting active NPCs...');
            await getActiveNPCs().then(result => console.log(result)).catch(err => console.log(err));
            console.log('Getting all NPCs...');
            await getAllNPCs().then(result => console.log(result)).catch(err => console.log(err));
            console.log('Chatting with NPC...');
            await chatWithNPC('test-npc', 'Hello, NPC!', session).then(result => console.log(result)).catch(err => console.log(err));
            console.log('Getting chat history...');
            await getChatHistory('test-npc', session).then(result => console.log(result)).catch(err => console.log(err));
            console.log('Deactivating NPC...');
            await deactivateNPC('test-npc').then(result => console.log(result)).catch(err => console.log(err));
            console.log('Getting active NPCs...');
            await getActiveNPCs().then(result => console.log(result)).catch(err => console.log(err));

            console.log('All tests complete');

        }
        test();
    } else {
        const app = express();
        app.use(express.json());
        const session = require('express-session');
        app.use(session({ secret:'secret', resave: false, saveUninitialized: true }));
        const { addNPCRoutes } = module.exports;
        addNPCRoutes(app);
        app.listen(5000, () => {
            console.log('Server running on port 5000');
        });
    }
}