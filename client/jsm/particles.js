import * as THREE from 'three';

class ParticleSystem {
    constructor(scene, particleCount = 1000, particleSize = 0.1) {
        this.scene = scene;
        this.particleCount = particleCount;
        this.particleSize = particleSize;
        this.particles = null;
        this.material = null;
        this.geometry = null;

        this.init();
    }

    init() {
        // Create geometry for particles
        this.geometry = new THREE.BufferGeometry();

        // Initialize positions and velocities
        const positions = new Float32Array(this.particleCount * 3); // x, y, z for each particle
        const velocities = new Float32Array(this.particleCount * 3); // vx, vy, vz for each particle

        for (let i = 0; i < this.particleCount; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;

            positions.set([x, y, z], i * 3);

            const vx = (Math.random() - 0.5) * 0.1;
            const vy = (Math.random() - 0.5) * 0.1;
            const vz = (Math.random() - 0.5) * 0.1;

            velocities.set([vx, vy, vz], i * 3);
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        // Create particle material
        this.material = new THREE.PointsMaterial({
            size: this.particleSize,
            color: 0xffffff,
        });

        // Create particle system
        this.particles = new THREE.Points(this.geometry, this.material);

        // Add to the scene
        this.scene.add(this.particles);
    }

    update(deltaTime) {
        const positions = this.geometry.attributes.position.array;
        const velocities = this.geometry.attributes.velocity.array;

        for (let i = 0; i < this.particleCount; i++) {
            const index = i * 3;

            // Update positions based on velocities
            positions[index] += velocities[index] * deltaTime;
            positions[index + 1] += velocities[index + 1] * deltaTime;
            positions[index + 2] += velocities[index + 2] * deltaTime;

            // Add some boundary constraints or reset behavior
            if (positions[index] > 5 || positions[index] < -5) velocities[index] *= -1;
            if (positions[index + 1] > 5 || positions[index + 1] < -5) velocities[index + 1] *= -1;
            if (positions[index + 2] > 5 || positions[index + 2] < -5) velocities[index + 2] *= -1;
        }

        // Mark position attribute as needing an update
        this.geometry.attributes.position.needsUpdate = true;
    }
}

export default ParticleSystem;