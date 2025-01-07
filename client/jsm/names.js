import * as THREE from 'three';

function createTextSprite(message, parameters = {}) {
    const fontface = parameters.fontface || 'Arial';
    const fontsize = parameters.fontsize || 18;
    const borderThickness = parameters.borderThickness || 4;
    const borderColor = parameters.borderColor || { r: 0, g: 0, b: 0, a: 1.0 };
    const backgroundColor = parameters.backgroundColor || { r: 255, g: 255, b: 255, a: 0.0 };

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontsize}px ${fontface}`;

    // Measure text size
    const metrics = context.measureText(message);
    const textWidth = metrics.width;
    const textHeight = fontsize * 1.4; // Approximation for text height

    // Set canvas size to fit text with borders
    canvas.width = textWidth + borderThickness * 2;
    canvas.height = textHeight + borderThickness * 2;

    // Adjust the context font again as resizing clears it
    context.font = `${fontsize}px ${fontface}`;

    // Fill background
    context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.a})`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text centered in the canvas
    context.fillStyle = 'rgba(0, 0, 0, 1.0)';
    const x = borderThickness;
    const y = canvas.height / 2 + fontsize / 2 - borderThickness; // Vertically centering text
    context.fillText(message, x, y);

    // Create texture from canvas
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.0, 1.0, 1.0);

    return sprite;
}

export { createTextSprite };
