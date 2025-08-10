import * as THREE from 'three';
import { ColorUtils, MathUtils } from './utils.js';

export class Visualizer3D {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.audioAnalyzer = null;
        
        // 3D Objects
        this.visualObjects = [];
        this.particles = null;
        this.geometryType = 'bars'; // bars, sphere, tunnel, wave
        
        // Animation
        this.animationId = null;
        this.isRunning = false;
        this.time = 0;
        
        // Visual properties
        this.colorPalette = ColorUtils.generateMoodPalette('neutral');
        this.beatIntensity = 0;
        this.beatDecay = 0.95;
        
        // Camera controls
        this.cameraRotation = { x: 0, y: 0 };
        this.targetRotation = { x: 0, y: 0 };
        this.autoRotate = true;
        
        this.initialize();
    }

    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0f0f23, 1, 1000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 50);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Add lights
        this.setupLights();
        
        // Create initial geometry
        this.createBarsGeometry();
        
        // Add event listeners
        this.addEventListeners();
        
        // Handle resize
        this.handleResize();
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(10, 10, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        // Point lights for dynamic effects
        this.pointLights = [];
        for (let i = 0; i < 4; i++) {
            const light = new THREE.PointLight(0xffffff, 0.5, 100);
            light.position.set(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );
            this.pointLights.push(light);
            this.scene.add(light);
        }
    }

    createBarsGeometry() {
        this.clearScene();
        
        const barCount = 64;
        const radius = 25;
        
        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            
            const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setRGB(...this.colorPalette[i % this.colorPalette.length].map(c => c / 255)),
                transparent: true,
                opacity: 0.8
            });
            
            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = Math.cos(angle) * radius;
            bar.position.z = Math.sin(angle) * radius;
            bar.position.y = 0;
            
            bar.userData = { 
                originalY: 0, 
                angle: angle,
                index: i,
                baseHeight: 1
            };
            
            this.visualObjects.push(bar);
            this.scene.add(bar);
        }
        
        this.geometryType = 'bars';
    }

    createSphereGeometry() {
        this.clearScene();
        
        const sphereCount = 100;
        const radius = 30;
        
        for (let i = 0; i < sphereCount; i++) {
            const phi = Math.acos(-1 + (2 * i) / sphereCount);
            const theta = Math.sqrt(sphereCount * Math.PI) * phi;
            
            const geometry = new THREE.SphereGeometry(0.3, 8, 8);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setRGB(...this.colorPalette[i % this.colorPalette.length].map(c => c / 255)),
                transparent: true,
                opacity: 0.7
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.x = radius * Math.sin(phi) * Math.cos(theta);
            sphere.position.y = radius * Math.sin(phi) * Math.sin(theta);
            sphere.position.z = radius * Math.cos(phi);
            
            sphere.userData = {
                originalPosition: sphere.position.clone(),
                index: i,
                baseScale: 1
            };
            
            this.visualObjects.push(sphere);
            this.scene.add(sphere);
        }
        
        this.geometryType = 'sphere';
    }

    createTunnelGeometry() {
        this.clearScene();
        
        const ringCount = 20;
        const pointsPerRing = 32;
        
        for (let ring = 0; ring < ringCount; ring++) {
            const z = (ring - ringCount / 2) * 5;
            const radius = 15 + Math.sin(ring * 0.5) * 5;
            
            for (let point = 0; point < pointsPerRing; point++) {
                const angle = (point / pointsPerRing) * Math.PI * 2;
                
                const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 6);
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color().setRGB(...this.colorPalette[ring % this.colorPalette.length].map(c => c / 255)),
                    transparent: true,
                    opacity: 0.6
                });
                
                const cylinder = new THREE.Mesh(geometry, material);
                cylinder.position.x = Math.cos(angle) * radius;
                cylinder.position.y = Math.sin(angle) * radius;
                cylinder.position.z = z;
                
                cylinder.lookAt(0, 0, z);
                
                cylinder.userData = {
                    ring: ring,
                    point: point,
                    baseRadius: radius,
                    angle: angle
                };
                
                this.visualObjects.push(cylinder);
                this.scene.add(cylinder);
            }
        }
        
        this.geometryType = 'tunnel';
    }

    createWaveGeometry() {
        this.clearScene();
        
        const gridSize = 32;
        const spacing = 2;
        
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color().setRGB(...this.colorPalette[(x + z) % this.colorPalette.length].map(c => c / 255)),
                    transparent: true,
                    opacity: 0.7
                });
                
                const cube = new THREE.Mesh(geometry, material);
                cube.position.x = (x - gridSize / 2) * spacing;
                cube.position.z = (z - gridSize / 2) * spacing;
                cube.position.y = 0;
                
                cube.userData = {
                    gridX: x,
                    gridZ: z,
                    baseY: 0
                };
                
                this.visualObjects.push(cube);
                this.scene.add(cube);
            }
        }
        
        this.geometryType = 'wave';
    }

    clearScene() {
        this.visualObjects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            this.scene.remove(obj);
        });
        this.visualObjects = [];
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        this.time += 0.016; // ~60fps
        
        // Get audio analysis
        if (this.audioAnalyzer) {
            const analysis = this.audioAnalyzer.analyze();
            const visualData = this.audioAnalyzer.getVisualizationData(64);
            
            this.updateVisuals(visualData, analysis);
            this.updateLights(analysis);
            this.updateCamera(analysis);
        }
        
        // Update beat effects
        this.beatIntensity *= this.beatDecay;
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    updateVisuals(visualData, analysis) {
        if (analysis.beat) {
            this.beatIntensity = 1;
            // Randomly switch geometry on strong beats
            if (Math.random() < 0.05) {
                this.switchGeometry();
            }
        }
        
        switch (this.geometryType) {
            case 'bars':
                this.updateBars(visualData, analysis);
                break;
            case 'sphere':
                this.updateSphere(visualData, analysis);
                break;
            case 'tunnel':
                this.updateTunnel(visualData, analysis);
                break;
            case 'wave':
                this.updateWave(visualData, analysis);
                break;
        }
    }

    updateBars(visualData, analysis) {
        this.visualObjects.forEach((bar, index) => {
            const dataIndex = Math.floor((index / this.visualObjects.length) * visualData.length);
            const amplitude = visualData[dataIndex] || 0;
            
            // Update height
            const targetHeight = 1 + amplitude * 20;
            bar.scale.y = MathUtils.lerp(bar.scale.y, targetHeight, 0.1);
            
            // Update position
            bar.position.y = (bar.scale.y - 1) / 2;
            
            // Update color intensity
            const intensity = 0.5 + amplitude * 0.5;
            bar.material.emissive.setRGB(
                ...this.colorPalette[index % this.colorPalette.length].map(c => (c / 255) * intensity * 0.3)
            );
            
            // Beat effect
            if (analysis.beat && amplitude > 0.7) {
                bar.position.y += this.beatIntensity * 2;
            }
            
            // Rotation
            bar.rotation.y += amplitude * 0.02;
        });
    }

    updateSphere(visualData, analysis) {
        this.visualObjects.forEach((sphere, index) => {
            const dataIndex = Math.floor((index / this.visualObjects.length) * visualData.length);
            const amplitude = visualData[dataIndex] || 0;
            
            // Update scale
            const targetScale = 1 + amplitude * 2;
            sphere.scale.setScalar(MathUtils.lerp(sphere.scale.x, targetScale, 0.1));
            
            // Update position (pulsing outward)
            const direction = sphere.userData.originalPosition.clone().normalize();
            const distance = sphere.userData.originalPosition.length();
            const newDistance = distance + amplitude * 10;
            sphere.position.copy(direction.multiplyScalar(newDistance));
            
            // Update color
            const intensity = 0.3 + amplitude * 0.7;
            sphere.material.emissive.setRGB(
                ...this.colorPalette[index % this.colorPalette.length].map(c => (c / 255) * intensity * 0.5)
            );
            
            // Beat effect
            if (analysis.beat) {
                sphere.position.multiplyScalar(1 + this.beatIntensity * 0.3);
            }
        });
    }

    updateTunnel(visualData, analysis) {
        this.visualObjects.forEach((cylinder, index) => {
            const dataIndex = Math.floor((cylinder.userData.ring / 20) * visualData.length);
            const amplitude = visualData[dataIndex] || 0;
            
            // Update scale
            const targetScale = 1 + amplitude * 3;
            cylinder.scale.setScalar(MathUtils.lerp(cylinder.scale.x, targetScale, 0.15));
            
            // Update position (radial movement)
            const baseRadius = cylinder.userData.baseRadius;
            const newRadius = baseRadius + amplitude * 5;
            cylinder.position.x = Math.cos(cylinder.userData.angle) * newRadius;
            cylinder.position.y = Math.sin(cylinder.userData.angle) * newRadius;
            
            // Move tunnel forward
            cylinder.position.z += analysis.energy * 0.1;
            if (cylinder.position.z > 50) {
                cylinder.position.z -= 100;
            }
            
            // Update color
            const intensity = 0.2 + amplitude * 0.8;
            cylinder.material.emissive.setRGB(
                ...this.colorPalette[cylinder.userData.ring % this.colorPalette.length].map(c => (c / 255) * intensity * 0.4)
            );
        });
    }

    updateWave(visualData, analysis) {
        const gridSize = Math.sqrt(this.visualObjects.length);
        
        this.visualObjects.forEach((cube, index) => {
            const x = cube.userData.gridX;
            const z = cube.userData.gridZ;
            
            // Create wave effect
            const distance = Math.sqrt(Math.pow(x - gridSize / 2, 2) + Math.pow(z - gridSize / 2, 2));
            const waveHeight = Math.sin(distance * 0.3 - this.time * 3) * 5;
            
            // Add audio influence
            const dataIndex = Math.floor((distance / gridSize) * visualData.length);
            const amplitude = visualData[dataIndex] || 0;
            const audioHeight = amplitude * 10;
            
            // Update position
            cube.position.y = waveHeight + audioHeight;
            
            // Update scale
            const targetScale = 1 + amplitude * 2;
            cube.scale.setScalar(MathUtils.lerp(cube.scale.x, targetScale, 0.1));
            
            // Update color
            const intensity = 0.3 + amplitude * 0.7;
            cube.material.emissive.setRGB(
                ...this.colorPalette[Math.floor(distance) % this.colorPalette.length].map(c => (c / 255) * intensity * 0.3)
            );
            
            // Beat effect
            if (analysis.beat) {
                cube.position.y += this.beatIntensity * 5;
            }
        });
    }

    updateLights(analysis) {
        // Update point lights based on audio
        this.pointLights.forEach((light, index) => {
            const dataIndex = Math.floor((index / this.pointLights.length) * 4);
            const bands = analysis.bands || {};
            const bandValues = Object.values(bands);
            const intensity = bandValues[dataIndex] || 0;
            
            light.intensity = 0.3 + intensity * 1.5;
            
            // Color based on frequency band
            const color = this.colorPalette[index % this.colorPalette.length];
            light.color.setRGB(...color.map(c => c / 255));
            
            // Movement
            const time = this.time + index * 2;
            light.position.x = Math.cos(time * 0.5) * 30;
            light.position.y = Math.sin(time * 0.7) * 20;
            light.position.z = Math.sin(time * 0.3) * 25;
        });
    }

    updateCamera(analysis) {
        if (this.autoRotate) {
            this.targetRotation.y += analysis.energy * 0.01;
            this.targetRotation.x = Math.sin(this.time * 0.5) * 0.1;
        }
        
        // Smooth camera movement
        this.cameraRotation.x = MathUtils.lerp(this.cameraRotation.x, this.targetRotation.x, 0.02);
        this.cameraRotation.y = MathUtils.lerp(this.cameraRotation.y, this.targetRotation.y, 0.02);
        
        // Apply rotation
        this.camera.position.x = Math.cos(this.cameraRotation.y) * 50;
        this.camera.position.z = Math.sin(this.cameraRotation.y) * 50;
        this.camera.position.y = this.cameraRotation.x * 20;
        
        this.camera.lookAt(0, 0, 0);
        
        // Beat zoom effect
        if (analysis.beat) {
            this.camera.position.multiplyScalar(1 - this.beatIntensity * 0.1);
        }
    }

    switchGeometry() {
        const geometries = ['bars', 'sphere', 'tunnel', 'wave'];
        const currentIndex = geometries.indexOf(this.geometryType);
        const nextIndex = (currentIndex + 1) % geometries.length;
        
        switch (geometries[nextIndex]) {
            case 'bars':
                this.createBarsGeometry();
                break;
            case 'sphere':
                this.createSphereGeometry();
                break;
            case 'tunnel':
                this.createTunnelGeometry();
                break;
            case 'wave':
                this.createWaveGeometry();
                break;
        }
    }

    updateColorPalette(mood, energy = 0.5) {
        this.colorPalette = ColorUtils.generateMoodPalette(mood, energy);
        
        // Update existing materials
        this.visualObjects.forEach((obj, index) => {
            if (obj.material) {
                const color = this.colorPalette[index % this.colorPalette.length];
                obj.material.color.setRGB(...color.map(c => c / 255));
            }
        });
    }

    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    addEventListeners() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Mouse controls
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        
        this.container.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
            this.autoRotate = false;
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                const deltaX = e.clientX - mouseX;
                const deltaY = e.clientY - mouseY;
                
                this.targetRotation.y += deltaX * 0.01;
                this.targetRotation.x -= deltaY * 0.01;
                
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        });
        
        this.container.addEventListener('mouseup', () => {
            isMouseDown = false;
            setTimeout(() => {
                this.autoRotate = true;
            }, 5000); // Resume auto-rotate after 5 seconds
        });
        
        // Touch controls
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isMouseDown = true;
                mouseX = e.touches[0].clientX;
                mouseY = e.touches[0].clientY;
                this.autoRotate = false;
            }
        });
        
        this.container.addEventListener('touchmove', (e) => {
            if (isMouseDown && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - mouseX;
                const deltaY = e.touches[0].clientY - mouseY;
                
                this.targetRotation.y += deltaX * 0.01;
                this.targetRotation.x -= deltaY * 0.01;
                
                mouseX = e.touches[0].clientX;
                mouseY = e.touches[0].clientY;
            }
        });
        
        this.container.addEventListener('touchend', () => {
            isMouseDown = false;
            setTimeout(() => {
                this.autoRotate = true;
            }, 5000);
        });
    }

    setAudioAnalyzer(analyzer) {
        this.audioAnalyzer = analyzer;
    }

    dispose() {
        this.stop();
        
        // Dispose of Three.js objects
        this.clearScene();
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}