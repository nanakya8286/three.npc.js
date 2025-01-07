import * as THREE from 'three';
class Lighting {
    constructor(scene) {

        const textureLoader = new THREE.TextureLoader();
        const skyboxTexture = textureLoader.load('../assets/night.webp', () => {
            const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
            const skyboxMaterial = new THREE.MeshBasicMaterial({
            map: skyboxTexture,
            side: THREE.BackSide
            });
            const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
            scene.add(skybox);
        });
        
        // Dim hemisphere light for a subtle ambient glow
        const fillLight1 = new THREE.HemisphereLight(0x3a6b8f, 0x001b33, 0.5);
        fillLight1.position.set(2, 1, 1);
        scene.add(fillLight1);

        // Moon-like directional light with softer intensity
        const directionalLight = new THREE.DirectionalLight(0x8bbcd4, 0.8);
        directionalLight.position.set(-5, 15, -1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = -0.00006;
        scene.add(directionalLight);

        // Add some spotlights for glowing crystal or tree effects
        const spotLight1 = new THREE.SpotLight(0xff66cc, 0.7, 50, Math.PI / 6, 0.5, 2);
        spotLight1.position.set(3, 2, -2);
        scene.add(spotLight1);

        const spotLight2 = new THREE.SpotLight(0x66ccff, 0.5, 50, Math.PI / 6, 0.5, 2);
        spotLight2.position.set(-2, 3, 5);
        scene.add(spotLight2);
    }
}

export default Lighting;
