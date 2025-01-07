import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Character } from './character.js';

class NPC extends Character {
    constructor(baseGLBPath, animationGLBPaths, id, name, bio, knowledge, lore, onload) {
        super(baseGLBPath, animationGLBPaths, onload);
        this.id = id;
        this.name = name;
        this.bio = bio;
        this.knowledge = knowledge;
        this.lore = lore;
        this.chatElem = null;
    }

    async interact() {
        document.getElementById('npc-chat').style.display = 'block';
        this.chatElem = document.getElementById('npc-chat-messages');
        this.chatElem.innerHTML = '<div class="text-start p-2 mb-2 rounded" style="background-color: #e8e8e8; max-width: 70%; color: #333;"><strong>NPC:</strong> Hello, traveler! How can I assist you today?</div>';
        this.chatInput = document.getElementById('npc-chat-input');
        this.chatInput.focus();
        this.keyUpListener = (event) => {
            if (event.key === 'Enter') {
                (async () => {
                    const message = this.chatInput.value;
                    this.chatInput.value = '';
                    this.chatElem.innerHTML += `<div class="text-end p-2 mb-2 rounded" style="background-color: #d1e7dd; max-width: 70%; color: #333; align-self: flex-end; margin-left: auto;"><strong>You:</strong> ${message}</div>`;
                    const response = await this.chat(message);
                    if (response.error) {
                        this.chatElem.innerHTML += `<div class="text-start p-2 mb-2 rounded" style="background-color: #f8d7da; max-width: 70%; color: #333;"><strong>NPC:</strong> I'm sorry, I don't understand.</div>`;
                    } else {
                        this.chatElem.innerHTML += `<div class="text-start p-2 mb-2 rounded" style="background-color: #e8e8e8; max-width: 70%; color: #333;"><strong>NPC:</strong> ${response.response}</div>`;
                    }
                    this.chatElem.scrollTop = this.chatElem.scrollHeight;
                })();
            }
        };
        this.chatInput.addEventListener('keyup', this.keyUpListener);
        this.chatCloseButton = document.getElementById('closeNPCChat');
        this.chatCloseListener = () => {
            this.closeChat();
        }
        this.chatCloseButton.addEventListener('click', this.chatCloseListener);
    }

    closeChat() {
        this.chatInput.removeEventListener('keyup', this.keyUpListener);
        this.chatCloseButton.removeEventListener('click', this.chatCloseListener);
        this.chatElem = null;
        this.chatInput = null;
        this.chatCloseButton = null;
        document.getElementById('npc-chat').style.display = 'none';
    }

    async createNPC() {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + '/api/NPC/chat/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: this.id,
                name: this.name,
                bio: this.bio,
                knowledge: this.knowledge,
                lore: this.lore
            })
        });
        return response.json();
    }

    async activateNPC() {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + '/api/NPC/chat/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: this.id })
        });
        return response.json();
    }

    async deactivateNPC() {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + '/api/NPC/chat/deactivate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: this.id })
        });
        return response.json();
    }

    async chat(message) {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + '/api/NPC/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: this.id,
                message: message
            })
        });
        return response.json();
    }

    async getChatHistory(sessionId) {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + `/api/NPC/chat/history?sessionId=${sessionId}`);
        return response.json();
    }

    static async getActiveNPCs() {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + '/api/NPC/chat/active');
        return response.json();
    }

    static async getAllNPCs() {
        const response = await fetch(import.meta.env.VITE_SOCKET_URL + '/api/NPC/chat/all');
        return response.json();
    }
}
export { NPC };
