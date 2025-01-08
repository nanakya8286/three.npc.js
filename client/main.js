import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Character } from './character.js';
import { NPC } from './NPC.js';
import { NPCPlacer } from './NPCPlacer.js';
import Networking from './networking.js';
import Chat from './chat.js';
import VoiceChat from './jsm/voicechat.js';
import { createTextSprite } from './jsm/names.js';
import { Water } from 'three/addons/objects/Water.js';
import Lighting from './jsm/lighting.js';
import Fireflies from './jsm/effects/fireflies.js';
import Grass from './jsm/effects/grass.js';

const loadingDiv = document.getElementById('loadingDiv');
const gameDiv = document.getElementById('gameDiv');
const chatHint = document.getElementById('chat-hint');
const username = document.getElementById('username');

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);

const lighting = new Lighting(scene);
const fireflies = new Fireflies(scene, 100);
var grass;

window.touchingNPC = false;

scene.userData.NPCs = [];

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const listener = window.audioListener = new THREE.AudioListener();
camera.add(listener);

const container = document.getElementById('container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
container.appendChild(stats.domElement);

const network = new Networking(scene);
window.network = network;
const chat = new Chat(network);
const voiceChat = new VoiceChat(network);
window.voiceChat = voiceChat;

const GRAVITY = 30;
const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;
const STEPS_PER_FRAME = 5;

const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xdede8d });

const spheres = [];
let sphereIdx = 0;

for (let i = 0; i < NUM_SPHERES; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
    spheres.push({
        mesh: sphere,
        collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
        velocity: new THREE.Vector3()
    });
}

const worldOctree = new Octree();
const playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let playerMoving = false;
let mouseTime = 0;
window.jumpTime = 0;

const keyStates = {};

const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
    if (event.target != document.body) {
        return;
    }
    keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    if (event.target != document.body) {
        return;
    }
    keyStates[event.code] = false;
    if (event.code === 'KeyE' && window.touchingNPC) {
        document.exitPointerLock();
        window.touchingNPC.interact();
    }
    if (event.code === 'KeyN') {
        npcPlacer.startPlacingNPC();
    }
    if (event.code === 'KeyP') {
        npcPlacer.placeNPC();
    }
});

container.addEventListener('mousedown', () => {
    document.body.requestPointerLock();
    mouseTime = performance.now();
});

document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
    }
});

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider);
    playerOnFloor = false;
    if (result) {
        playerOnFloor = result.normal.y > 0;
        if (!playerOnFloor) {
            playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));
        }
        if (result.depth >= 1e-10) {
            playerCollider.translate(result.normal.multiplyScalar(result.depth));
        }
    }
}

function updatePlayer(deltaTime) {
    let damping = Math.exp(-10 * deltaTime) - 1;
    if (!playerOnFloor) {
        playerVelocity.y -= GRAVITY * deltaTime;
        damping *= 0.1;
    }
    playerVelocity.addScaledVector(playerVelocity, damping);
    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);
    playerCollisions();
    playerMesh.position.copy(playerCollider.end);
    var playerDirection = new THREE.Vector3();
    camera.getWorldDirection(playerDirection);
    camera.position.copy(playerCollider.end).add(playerDirection.clone().multiplyScalar(-3));
    camera.lookAt(playerCollider.end);
    playerMesh.rotation.y = camera.rotation.y + Math.PI;
}

function getForwardVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    return playerDirection;
}

function getSideVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);
    return playerDirection;
}

function controls(deltaTime) {
    const speedDelta = deltaTime * (playerOnFloor ? 25 * 3 : 8);
    playerMoving = false;
    if (keyStates['KeyW'] || keyStates['KeyS'] || keyStates['KeyA'] || keyStates['KeyD']) {
        playerMoving = true;
    }
    if (keyStates['KeyW']) {
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
    }
    if (keyStates['KeyS']) {
        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
    }
    if (keyStates['KeyA']) {
        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
    }
    if (keyStates['KeyD']) {
        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
    }
    if (playerOnFloor) {
        if (keyStates['Space']) {
            playerVelocity.y = 15;
            window.jumpTime = 0.0;
        }
    }
}

const playerMesh = new THREE.Mesh();
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;

const loader = new GLTFLoader().setPath('./models/');
var npcPlacer;
const USE_NEW_MAP = true;
const mapglb = USE_NEW_MAP ? 'Game Map Baked.glb' : 'untitled.glb';
var water;
loader.load(mapglb, (gltf) => {
    gltf.scene.position.z = 15;
    scene.add(gltf.scene);
    if (!USE_NEW_MAP) {
        worldOctree.fromGraphNode(gltf.scene);
    } else {
        gltf.scene.position.y = -3;
        const allowList = ['Retopo_Icosphere', 'Retopo_Icosphere001', 'Cube027', 'Cube028'];
        const octreeObjects = gltf.scene.children.filter(child => allowList.includes(child.name));
        for (let i = 0; i < octreeObjects.length; i++) {
            if(octreeObjects[i].name === 'Retopo_Icosphere001')
                octreeObjects[i].position.y -= 0.5;
            worldOctree.fromGraphNode(octreeObjects[i]);
            if(octreeObjects[i].name === 'Retopo_Icosphere001')
                octreeObjects[i].position.y += 0.5;
        }
        //grass = new Grass(scene, 20000, gltf.scene.getObjectByName('Retopo_Icosphere'));
        const rectIsphere001 = gltf.scene.getObjectByName('Retopo_Icosphere001');

        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        rectIsphere001.getWorldPosition(worldPosition);
        rectIsphere001.getWorldQuaternion(worldQuaternion);
        rectIsphere001.getWorldScale(worldScale);
        gltf.scene.remove(rectIsphere001);
        const waterGeometry = rectIsphere001.geometry.clone();
        water = window.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('./models/waternormals.jpg', function (texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: scene.fog !== undefined
            }
        );

        water.position.copy(worldPosition);
        scene.add(water);
    }
    gltf.scene.traverse(child => {
        if (child.isMesh) {
        }
    });
    const helper = new OctreeHelper(worldOctree);
    helper.visible = false;
    scene.add(helper);
    const gui = new GUI({ width: 200 });
    gui.add({ debug: false }, 'debug')
        .onChange(function (value) {
            helper.visible = value;
        });
    loadingDiv.setAttribute('style', 'display:none !important');
    splashDiv.setAttribute('style', 'display:flex !important');
    npcPlacer = new NPCPlacer(scene, camera, gltf.scene, npc);
    window.npcPlacer = npcPlacer;
    renderer.setAnimationLoop(animate);
});

window.playing = false;
document.getElementById('playButton').addEventListener('click', () => {
    splashDiv.setAttribute('style', 'display:none !important');
    gameDiv.setAttribute('style', 'display:block !important');
    scene.add(playerMesh);
    window.playing = true;
});

window.exampleCharacter = new Character('./models/robot-idle.glb', [
    './models/run.glb',
    './models/jump.glb',
    './models/falling.glb',
]);
exampleCharacter.character.position.y = -1;
exampleCharacter.character.scale.set(0.5, 0.5, 0.5);
playerMesh.add(exampleCharacter.character);

window.createTextSprite = createTextSprite;
window.scene = scene;

window.npc = new NPC('./models/goat idle.glb', [
], 'npc1', 'NPC 1', 'This is a test NPC', 'This is a test knowledge', 'This is a test lore', function (npc) {
    npc.character.children[0].children[0].position.set(0, 13, 0);
    npc.removeFirstFrame(npc.animations['metarig.010Action.005']);
    npc.switchAnimation('metarig.010Action.005');
    window.npcNameTag = createTextSprite('NPC 1', { fontsize: 48 });
    window.npcNameTag.position.y = 3;
    npc.character.add(window.npcNameTag);
});
scene.userData.NPCs.push(npc);
npc.createNPC().then(result => console.log(result));

window.npc.character.position.x = 5;
window.npc.character.position.z = 5;
window.npc.character.position.y = 0.6;
if (USE_NEW_MAP) {
    window.npc.character.position.y = -2;
}
window.npc.character.scale.set(0.1, 0.1, 0.1);

scene.add(npc.character);

function teleportPlayerIfOob() {
    if (camera.position.y <= -25) {
        playerCollider.start.set(0, 0.35, 0);
        playerCollider.end.set(0, 1, 0);
        playerCollider.radius = 0.35;
        camera.position.copy(playerCollider.end);
        camera.rotation.set(0, 0, 0);
    }
}

let idx = 0;
let offFloorTime = 0;

function animate() {
    idx++;
    chatHint.style.display = 'none';
    for (let i = 0; i < scene.userData.NPCs.length; i++) {
        scene.userData.NPCs[i].interactive = false;
        if (playerMesh.position.distanceTo(scene.userData.NPCs[i].character.position) < 5) {
            window.touchingNPC = scene.userData.NPCs[i];
            chatHint.style.display = 'block';
            scene.userData.NPCs[i].interactive = true;
            break;
        }
    }
    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
    if (water) {
        water.material.uniforms.time.value += deltaTime;
    }
    window.jumpTime += deltaTime * STEPS_PER_FRAME;
    if (playerMoving && playerOnFloor) {
        window.exampleCharacter.switchAnimation('run');
        exampleCharacter.setAnimationSpeed(playerVelocity.length() / 5);
        offFloorTime = 0;
    } else if (!playerMoving && playerOnFloor) {
        window.exampleCharacter.switchAnimation('idle');
        exampleCharacter.setAnimationSpeed(1.0);
        offFloorTime = 0;
    } else if (!playerOnFloor) {
        offFloorTime += deltaTime * STEPS_PER_FRAME;
        if (window.jumpTime < 0.5) {
            window.exampleCharacter.switchAnimation('jump');
        } else if (offFloorTime > 0.1) {
            window.exampleCharacter.switchAnimation('falling');
        }
    }
    if (window.playing) {
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
            controls(deltaTime);
            updatePlayer(deltaTime);
            teleportPlayerIfOob();
        }
    }
    exampleCharacter.update(deltaTime * STEPS_PER_FRAME);
    npc.update(deltaTime * STEPS_PER_FRAME);
    npcPlacer.update(deltaTime * STEPS_PER_FRAME);
    if (idx % 5 == 0) {
        network.sendPlayerStateUpdate({
            position: {
                x: playerMesh.position.x,
                y: playerMesh.position.y,
                z: playerMesh.position.z
            },
            rotation: {
                x: playerMesh.rotation.x,
                y: playerMesh.rotation.y,
                z: playerMesh.rotation.z
            },
            username: username.value,
            animation: exampleCharacter.currentAnimation
        });
    }
    network.update(deltaTime * STEPS_PER_FRAME);
    fireflies.update(deltaTime * STEPS_PER_FRAME);
    if (grass)
        grass.update(deltaTime * STEPS_PER_FRAME);
    renderer.render(scene, camera);
    stats.update();
}
