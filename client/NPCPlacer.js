import * as THREE from 'three';
import { Character } from './character.js';
import { NPC } from './NPC.js';
import { exp } from 'three/tsl';

class NPCPlacer {
    constructor(scene, camera, groundPlane, npcClass) {
        this.scene = scene;
        this.camera = camera;
        this.groundPlane = groundPlane;
        this.npcClass = npcClass;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.placingNPC = false;
        this.placementIndicator = new THREE.Object3D();
        this.validIntersect = false;
        this.particleSystem = new THREE.Object3D();
        this.spawningNPC = false;

        this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });
        this.placementCharacter = new Character('./models/robot-idle.glb', [], (character) => {
            character.character.traverse((child) => {
                if (child.isMesh) {
                    child.material = this.material;
                }
            });
            character.character.scale.set(0.5, 0.5, 0.5);
            this.placementIndicator.add(character.character);
        });
        this.placementIndicator.visible = false;
        this.scene.add(this.placementIndicator);
        this.scene.add(this.particleSystem);
        this.groundPlane.addEventListener('click', (event) => {
            this.placeNPC(event);
        });
        this.groundPlane.addEventListener('mousemove', (event) => {
            this.moveNPC(event);
        });

        this.initNPCForm();
    }

    initNPCForm() {
        this.npcForm = document.getElementById('npcForm');
        this.npcCreationModal = document.getElementById('npc-creation');
        this.saveNPCButton = document.getElementById('saveNPC');
        this.cancelNPCButton = document.getElementById('cancelNPC');
        this.closeNPCCreationButton = document.getElementById('closeNPCCreation');

        this.saveNPCButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.createNPCFromForm();
        });

        this.cancelNPCButton.addEventListener('click', () => {
            this.npcCreationModal.style.display = 'none';
        });

        this.closeNPCCreationButton.addEventListener('click', () => {
            this.npcCreationModal.style.display = 'none';
        });
    }

    createNPCFromForm() {
        const id = document.getElementById('npcId').value;
        const name = document.getElementById('npcName').value;
        const bio = document.getElementById('npcBio').value;
        const knowledge = document.getElementById('npcKnowledge').value;
        const lore = document.getElementById('npcLore').value;
        const characterType = document.getElementById('npcCharacter').value;

        if (!id || !name || !characterType) {
            alert('Please fill in all required fields.');
            return;
        }
        const that = this;

        const npc = new NPC('./models/robot-idle.glb', [], id, name, bio, knowledge, lore, (npc) => {
            npc.character.scale.set(0.5, 0.5, 0.5);
            npc.character.children[0].children[0].children[1].children[3].material.color.set(0xff0000);
            npc.switchAnimation('idle');
            window.npcNameTag = createTextSprite(name, { fontsize: 48 });
            window.npcNameTag.position.y = 3;
            npc.character.add(window.npcNameTag);
            npc.character.position.copy(that.validIntersect);
            that.scene.add(npc.character);
            that.stopPlacingNPC();
            npc.createNPC().then((apiResponse) => {
            
                that.scene.userData.NPCs.push(npc);
            });
            that.spawningNPC = false;
        });

        

        this.npcCreationModal.style.display = 'none';
    }

    placeNPC() {
        if (!this.placingNPC) {
            return;
        }
        if (this.validIntersect) {
            this.spawningNPC = true;
            this.npcCreationModal.style.display = 'block';
            document.exitPointerLock();
        }
    }

    moveNPC() {
        if (!this.placingNPC) {
            return;
        }
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);
        if (intersects.length > 0) {
            const position = intersects[0].point;
            const normal = intersects[0].face.normal;
            if (normal.y < 0.9) {
                this.material.color.setHex(0xff0000);
                this.validIntersect = false;
            } else {
                this.material.color.setHex(0x00ff00);
                this.validIntersect = new THREE.Vector3().copy(position);
            }
            this.placementIndicator.position.copy(position);
            this.placementIndicator.visible = true;
        } else {
            this.placementIndicator.visible = false;
        }
    }

    startPlacingNPC() {
        this.placingNPC = true;
        this.placementIndicator.visible = true;
    }

    stopPlacingNPC() {
        this.placingNPC = false;
        this.spawningNPC = false;
        this.placementIndicator.visible = false;
    }

    update() {
        if (this.spawningNPC) {
            this.placementIndicator.rotation.y += 0.1;
        } else {
            this.moveNPC();
            this.placementIndicator.rotation.y = 0;
        }
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            const velocities = this.particles.geometry.attributes.velocity.array;

            for (let i = 0; i < this.particleCount; i++) {
                positions[i * 3] += velocities[i * 3];
                positions[i * 3 + 1] += velocities[i * 3 + 1];
                positions[i * 3 + 2] += velocities[i * 3 + 2];

                if (positions[i * 3 + 1] < -10) {
                    positions[i * 3] = (Math.random() - 0.5) * 10;
                    positions[i * 3 + 1] = 10;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
                }
            }

            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
}


export { NPCPlacer };