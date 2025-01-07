import * as THREE from 'three';

class Fireflies {
    constructor(scene, count = 100) {
        this.scene = scene;
        this.count = count;
        this.fireflies = [];
        this.velocities = [];
        this.initFireflies();
    }

    initFireflies() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);

        for (let i = 0; i < this.count; i++) {
            // Set initial positions
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            // Assign yellowish glow color
            colors[i * 3] = 1.0; // Red
            colors[i * 3 + 1] = 0.8; // Green
            colors[i * 3 + 2] = 0.3; // Blue

            // Assign random initial velocities
            this.velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 5
            ));
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load('../../assets/dot.png') }
            },
            vertexShader: `
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 1.0 * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: true, // Enable depth testing
            transparent: true
        });

        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);
    }

    update(dt) {
        const positions = this.points.geometry.attributes.position.array;

        for (let i = 0; i < this.count; i++) {
            // Update positions based on velocity
            positions[i * 3] += this.velocities[i].x * dt;
            positions[i * 3 + 1] += this.velocities[i].y * dt;
            positions[i * 3 + 2] += this.velocities[i].z * dt;

            // Gradually adjust velocities for smooth, natural motion
            this.velocities[i].x += (Math.random() - 0.5) * 0.2;
            this.velocities[i].y += (Math.random() - 0.5) * 0.02;
            this.velocities[i].z += (Math.random() - 0.5) * 0.2;

            // Keep fireflies within bounds
            positions[i * 3] = this.wrapPosition(positions[i * 3], -50, 50);
            positions[i * 3 + 1] = this.wrapPosition(positions[i * 3 + 1], -50, 50);
            positions[i * 3 + 2] = this.wrapPosition(positions[i * 3 + 2], -50, 50);
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }

    wrapPosition(value, min, max) {
        if (value < min) return max;
        if (value > max) return min;
        return value;
    }
}

export default Fireflies;
