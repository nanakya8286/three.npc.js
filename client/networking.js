import io from 'socket.io-client';
import * as THREE from 'three';
import { Character } from './character.js';
import { createTextSprite } from './jsm/names.js';


class Networking {
    constructor(scene) {
        this.socket = io(import.meta.env.VITE_SOCKET_URL);
        this.players = {};
        this.models = {};
        this.scene = scene;

        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
        });

        this.socket.on('currentPlayers', (currentPlayers) => {
            Object.keys(currentPlayers).forEach((id) => {
                this.players[id] = currentPlayers[id];
                this.addPlayerToGame(id, currentPlayers[id]);
            });
        });

        this.socket.on('newPlayer', (newPlayer) => {
            this.players[newPlayer.id] = newPlayer;
            this.addPlayerToGame(newPlayer.id, newPlayer);
        });

        this.socket.on('updateState', (updatedPlayer) => {
            if (this.players[updatedPlayer.id]) {
                this.players[updatedPlayer.id] = updatedPlayer;
                this.updatePlayerState(updatedPlayer.id, updatedPlayer);
            }
        });

        this.socket.on('playerDisconnected', (id) => {
            delete this.players[id];
            this.removePlayerFromGame(id);
        });
    }

    sendPlayerStateUpdate(state) {
        this.socket.emit('updateState', state);
    }

    addPlayerToGame(id, player) {
        console.log(`Player ${id} added to the game`, player);
        if (id !== this.socket.id) {
            const model = new THREE.Object3D();
            const character = new Character('./models/robot-idle.glb', [
                './models/run.glb',
                './models/jump.glb',
                './models/falling.glb',
            ]);
            character.character.position.y = -1;
            character.character.scale.set(0.5, 0.5, 0.5);
            model.userData.character = character;
            model.userData.oldPosition = new THREE.Vector3();
            model.userData.targetPosition = new THREE.Vector3();
            model.userData.oldRotation = new THREE.Quaternion();
            model.userData.targetRotation = new THREE.Quaternion();


            var npcNameTag = createTextSprite(player.name, { fontsize: 48 });
            npcNameTag.position.y = 3;
            character.character.add(npcNameTag);

            // add positional audio with window.audioListener as listener
            const sound1 = new THREE.PositionalAudio( window.audioListener );
            model.add(sound1);
            model.userData.sound1 = sound1;


            model.add(character.character);
            this.models[id] = model;
            this.scene.add(model);
        }
    }

    updatePlayerState(id, state) {
        //console.log(`Player ${id} state updated`, state);
        if (this.socket.id !== id) {
            const model = this.models[id];
            // model.position.set(state.position.x, state.position.y, state.position.z);
            model.userData.oldPosition.copy(model.position);
            model.userData.targetPosition.set(state.position.x, state.position.y, state.position.z);
            model.userData.oldRotation.copy(model.rotation);
            model.userData.targetRotation.setFromEuler(new THREE.Euler(state.rotation.x, state.rotation.y, state.rotation.z));
            // model.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
            model.userData.character.switchAnimation(state.animation);
        }
    }

    update(deltaTime){
        Object.keys(this.models).forEach((id) => {
            const model = this.models[id];
            const character = model.userData.character;
            const oldPosition = model.userData.oldPosition;
            const targetPosition = model.userData.targetPosition;
            // lerp between positions
            model.position.lerp(targetPosition, 0.1);
            // use quaternion to lerp between rotations
            model.quaternion.slerp(model.userData.targetRotation, 0.1);
            character.update(deltaTime);
        });
    }

    removePlayerFromGame(id) {
        console.log(`Player ${id} removed from the game`);
        if (this.socket.id !== id) {
            this.scene.remove(this.models[id]);
        }
    }
}

export default Networking;