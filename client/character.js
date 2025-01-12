import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createTextSprite} from './jsm/names.js';

class Character {
    constructor(baseGLBPath, animationGLBPaths, onload) {
        this.loader = new GLTFLoader();
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.currentAnimation = null;
        this.character = new THREE.Object3D();

        
        this.loaded = false;
        this.animationSpeed = 1.0;

        this.loadBaseGLB(baseGLBPath).then(() => {
            this.loadAnimationGLBs(animationGLBPaths).then(() => {
                this.loaded = true;
                if (onload) {
                    console.log(onload);
                    onload( this );
                }
            });
        });
    }

    loadBaseGLB(baseGLBPath) {
        return new Promise((resolve, reject) => {
            this.loader.load(baseGLBPath, (gltf) => {
                this.model = gltf.scene;
                this.mixer = new THREE.AnimationMixer(this.model);
                // find all animations
                gltf.animations.forEach((clip) => {
                    this.animations[clip.name] = clip;
                });
                this.character.add(this.model);
                resolve();
            }, undefined, reject);
        });
    }

    loadAnimationGLBs(animationGLBPaths) {
        const promises = animationGLBPaths.map((path) => {
            return new Promise((resolve, reject) => {
                this.loader.load(path, (gltf) => {
                    gltf.animations.forEach((clip) => {
                        this.animations[clip.name] = clip;
                    });
                    resolve();
                }, undefined, reject);
            });
        });

        return Promise.all(promises);
    }

    switchAnimation(animationName) {
        if (this.animations[animationName]) {
            if (this.currentAnimation === animationName) {
                return;
            }
            console.log(`Switching to animation ${animationName}`);
            const action = this.mixer.clipAction(this.animations[animationName]);
            if (this.currentAction) {
                this.currentAction.fadeOut(0.5);
            }
            action.reset().fadeIn(0.5).play();
            this.currentAction = action;
            this.currentAnimation = animationName;
        } else {
            console.warn(`Animation ${animationName} not found`);
        }
    }
    renameAnimation(animationName, newName) {
        if (this.animations[animationName]) {
            this.animations[newName] = this.animations[animationName];
            delete this.animations[animationName];
        } else {
            console.warn(`Animation ${animationName} not found`);
        }
    }
    removeFirstFrame(clip) {
        console.log('removing first frame');
        window.removedFirstFrame = clip;
        // Remove the first frame by trimming the times and values arrays of each keyframe track
        clip.tracks.forEach((track) => {
            if (track.times.length > 1) {
                track.times = track.times.slice(1);
                track.values = track.values.slice(track.getValueSize());
            }
        });
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        if (this.currentAction) {
            this.currentAction.setEffectiveTimeScale(speed);
        }
    }

    getAvailableAnimations() {
        return Object.keys(this.animations);
    }

    update(deltaTime) {
        if (this.mixer) {
            // log the animation speed
            this.mixer.update(deltaTime);
        }
    }
}

export { Character };