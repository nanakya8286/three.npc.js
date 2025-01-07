import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class Grass {
    constructor(scene, bladeCount, mesh) {
        this.scene = scene;
        this.bladeCount = bladeCount;
        this.mesh = mesh;
        this.startTime = Date.now();
        this.timeUniform = { type: 'f', value: 0.0 };

        this.grassTexture = new THREE.TextureLoader().load('../../assets/grass.jpg');
        this.cloudTexture = new THREE.TextureLoader().load('../../assets/cloud.jpg');
        this.cloudTexture.wrapS = this.cloudTexture.wrapT = THREE.RepeatWrapping;

        this.grassUniforms = {
            textures: { value: [this.grassTexture, this.cloudTexture] },
            iTime: this.timeUniform
        };

        this.grassMaterial = new THREE.ShaderMaterial({
            uniforms: this.grassUniforms,
            vertexShader: `varying vec2 vUv;
varying vec2 cloudUV;

varying vec3 vColor;
uniform float iTime;

void main() {
  vUv = uv;
  cloudUV = uv;
  vColor = color;
  vec3 cpos = position;

  float waveSize = 10.0f;
  float tipDistance = 0.3f;
  float centerDistance = 0.1f;

  if (color.x > 0.6f) {
    cpos.x += sin((iTime / 500.) + (uv.x * waveSize)) * tipDistance;
  } else if (color.x > 0.0f) {
    cpos.x += sin((iTime / 500.) + (uv.x * waveSize)) * centerDistance;
  }

  float diff = position.x - cpos.x;
  cloudUV.x += iTime / 20000.;
  cloudUV.y += iTime / 10000.;

  vec4 worldPosition = vec4(cpos, 1.);
  vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4(cpos, 1.0);
  gl_Position = mvPosition;
}`,
            fragmentShader: `uniform sampler2D texture1;
uniform sampler2D textures[4];

varying vec2 vUv;
varying vec2 cloudUV;
varying vec3 vColor;

void main() {
  float contrast = 1.5;
  float brightness = 0.01;
  vec3 color = texture2D(textures[0], vUv).rgb * contrast;
  color = color + vec3(brightness, brightness, brightness);
  color = mix(color, texture2D(textures[1], cloudUV).rgb, 0.4);
  gl_FragColor.rgb = color;
  gl_FragColor.a = 1.;
}`,
            vertexColors: true,
            side: THREE.DoubleSide
        });

        this.generateField();
    }

    generateField() {
        const positions = [];
        const uvs = [];
        const indices = [];
        const colors = [];

        const raycaster = new THREE.Raycaster();
        const down = new THREE.Vector3(0, -1, 0);

        for (let i = 0; i < this.bladeCount; i++) {
            const VERTEX_COUNT = 5;
            const surfaceMin = -30 / 2;
            const surfaceMax = 30 / 2;
            const radius = 30 / 2;

            const r = radius * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);

            const origin = new THREE.Vector3(x, 10, z);
            raycaster.set(origin, down);

            const intersects = raycaster.intersectObject(this.mesh);

            if (intersects.length > 0) {
                const intersection = intersects[0];
                const pos = intersection.point;
                const uv = [intersection.uv.x, intersection.uv.y];

                const blade = this.generateBlade(pos, i * VERTEX_COUNT, uv);
                blade.verts.forEach(vert => {
                    positions.push(...vert.pos);
                    uvs.push(...vert.uv);
                    colors.push(...vert.color);
                });
                blade.indices.forEach(indice => indices.push(indice));
            }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        // scale by 0.25
        geom.setIndex(indices);
        geom.computeVertexNormals();

        const mesh = new THREE.Mesh(geom, this.grassMaterial);
        
        this.scene.add(mesh);
    }

    generateBlade(center, vArrOffset, uv) {
        const BLADE_WIDTH = 0.2*0.25;
        const BLADE_HEIGHT = 0.8*0.25;
        const BLADE_HEIGHT_VARIATION = 0.6;
        const MID_WIDTH = BLADE_WIDTH * 0.5;
        const TIP_OFFSET = 0.1;
        const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);

        const yaw = Math.random() * Math.PI * 2;
        const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
        const tipBend = Math.random() * Math.PI * 2;
        const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

        const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1));
        const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1));
        const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
        const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
        const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));

        tl.y += height / 2;
        tr.y += height / 2;
        tc.y += height;

        const black = [0, 0, 0];
        const gray = [0.5, 0.5, 0.5];
        const white = [1.0, 1.0, 1.0];

        const verts = [
            { pos: bl.toArray(), uv: uv, color: black },
            { pos: br.toArray(), uv: uv, color: black },
            { pos: tr.toArray(), uv: uv, color: gray },
            { pos: tl.toArray(), uv: uv, color: gray },
            { pos: tc.toArray(), uv: uv, color: white }
        ];

        const indices = [
            vArrOffset,
            vArrOffset + 1,
            vArrOffset + 2,
            vArrOffset + 2,
            vArrOffset + 4,
            vArrOffset + 3,
            vArrOffset + 3,
            vArrOffset,
            vArrOffset + 2
        ];

        return { verts, indices };
    }

    update() {
        const elapsedTime = Date.now() - this.startTime;
        this.grassUniforms.iTime.value = elapsedTime*0.25;
    }
}

export default Grass;
