import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateE8RootSystem, projectTo3D } from '../lib/e8';

interface E8Visualization3DProps {
  className?: string;
}

const E8Visualization3D: React.FC<E8Visualization3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const animationRef = useRef<number>(0);
  
  const [autoRotate, setAutoRotate] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const [colorMode, setColorMode] = useState<'rainbow' | 'depth' | 'pulse'>('rainbow');
  const [particleSize, setParticleSize] = useState(3);
  const [manualAngles, setManualAngles] = useState<number[]>(Array(8).fill(0));
  
  // Use refs to access current state values in animation loop
  const autoRotateRef = useRef(autoRotate);
  const colorModeRef = useRef(colorMode);
  const showConnectionsRef = useRef(showConnections);
  const manualAnglesRef = useRef(manualAngles);
  
  // Keep refs in sync with state
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);
  useEffect(() => { showConnectionsRef.current = showConnections; }, [showConnections]);
  useEffect(() => { manualAnglesRef.current = manualAngles; }, [manualAngles]);
  
  // 8D rotation angles for animation (auto rotate adds to these)
  const rotationAnglesRef = useRef<number[]>(Array(8).fill(0));
  
  // Create 8D rotation matrix using 8 rotation planes
  // Each dimension pairs with another to form a rotation plane
  const createRotationMatrix8D = useCallback((angles: number[]): number[][] => {
    const matrix = Array(8).fill(0).map((_, i) => 
      Array(8).fill(0).map((_, j) => i === j ? 1 : 0)
    );
    
    // 8 rotation planes - each angle controls rotation in one plane
    // Planes: (0,1), (2,3), (4,5), (6,7), (0,4), (1,5), (2,6), (3,7)
    const planes = [
      [0, 1], // D1-D2
      [2, 3], // D3-D4
      [4, 5], // D5-D6
      [6, 7], // D7-D8
      [0, 4], // D1-D5
      [1, 5], // D2-D6
      [2, 6], // D3-D7
      [3, 7], // D4-D8
    ];
    
    planes.forEach((plane, idx) => {
      if (idx < angles.length) {
        const [i, j] = plane;
        const angle = angles[idx];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Apply rotation in this plane - need to save original values first
        for (let k = 0; k < 8; k++) {
          const oldI = matrix[k][i];
          const oldJ = matrix[k][j];
          matrix[k][i] = oldI * cos - oldJ * sin;
          matrix[k][j] = oldI * sin + oldJ * cos;
        }
      }
    });
    
    return matrix;
  }, []);
  
  // Apply 8D rotation to coordinates
  const applyRotation8D = useCallback((coords: number[], matrix: number[][]): number[] => {
    return coords.map((_, i) => 
      coords.reduce((sum, c, j) => sum + c * matrix[j][i], 0)
    );
  }, []);

  // Create vertex shader for particles
  const vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    varying float vDistance;
    
    void main() {
      vColor = customColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vDistance = -mvPosition.z;
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  // Create fragment shader for glowing particles
  const fragmentShader = `
    varying vec3 vColor;
    varying float vDistance;
    
    void main() {
      float r = distance(gl_PointCoord, vec2(0.5, 0.5));
      if (r > 0.5) discard;
      
      float intensity = 1.0 - (r * 2.0);
      intensity = pow(intensity, 1.5);
      
      vec3 glow = vColor * intensity;
      float alpha = intensity * 0.9;
      
      gl_FragColor = vec4(glow, alpha);
    }
  `;

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 8;
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000011, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controlsRef.current = controls;
    
    // Add starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starsPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      starsPositions[i] = (Math.random() - 0.5) * 100;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    // Generate E8 root system
    const e8System = generateE8RootSystem();
    
    // Create projection matrix for 3D visualization
    const projectionMatrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      [0.3, 0.3, 0.3],
      [-0.3, 0.3, -0.3]
    ];
    
    // Project to 3D
    const projected3D = projectTo3D(e8System.roots, projectionMatrix);
    
    // Scale factor
    const scale = 2.5;
    
    // Create particle geometry
    const particleCount = projected3D.length;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    projected3D.forEach((point, i) => {
      positions[i * 3] = point[0] * scale;
      positions[i * 3 + 1] = point[1] * scale;
      positions[i * 3 + 2] = point[2] * scale;
      
      // Rainbow colors based on position
      const hue = (i / particleCount) * 360;
      const color = new THREE.Color().setHSL(hue / 360, 0.9, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = particleSize;
    });
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create shader material
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const points = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(points);
    pointsRef.current = points;
    
    // Create connections between nearby points
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    const threshold = 1.2 * scale;
    
    for (let i = 0; i < projected3D.length; i++) {
      for (let j = i + 1; j < projected3D.length; j++) {
        const dx = (projected3D[i][0] - projected3D[j][0]) * scale;
        const dy = (projected3D[i][1] - projected3D[j][1]) * scale;
        const dz = (projected3D[i][2] - projected3D[j][2]) * scale;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < threshold && dist > 0.1) {
          linePositions.push(
            projected3D[i][0] * scale, projected3D[i][1] * scale, projected3D[i][2] * scale,
            projected3D[j][0] * scale, projected3D[j][1] * scale, projected3D[j][2] * scale
          );
          
          const hue1 = (i / particleCount) * 360;
          const hue2 = (j / particleCount) * 360;
          const color1 = new THREE.Color().setHSL(hue1 / 360, 0.8, 0.5);
          const color2 = new THREE.Color().setHSL(hue2 / 360, 0.8, 0.5);
          
          lineColors.push(color1.r, color1.g, color1.b, color2.r, color2.g, color2.b);
        }
      }
    }
    
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);
    linesRef.current = lines;
    
    // Add ambient glow
    const glowGeometry = new THREE.SphereGeometry(6, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0033ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);
    
    // Store original positions for animation
    const originalPositions = new Float32Array(positions);
    
    // Animation loop
    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.005;
      
      // Update shader time uniform
      if (pointsRef.current) {
        (pointsRef.current.material as THREE.ShaderMaterial).uniforms.time.value = time;
      }
      
      const positionAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = particleGeometry.getAttribute('customColor') as THREE.BufferAttribute;
      
      // Auto rotation in 8D space - update positions
      if (autoRotateRef.current) {
        rotationAnglesRef.current = rotationAnglesRef.current.map((angle, i) => 
          angle + (0.002 + i * 0.0003)
        );
      }
      
      // Combine auto rotation with manual angles
      const combinedAngles = rotationAnglesRef.current.map((angle, i) => 
        angle + manualAnglesRef.current[i]
      );
      
      // Always update positions and colors based on current rotation
      const rotMatrix = createRotationMatrix8D(combinedAngles);
      
      e8System.roots.forEach((root, i) => {
        const rotated = applyRotation8D(root.coordinates, rotMatrix);
        let projected = [0, 0, 0];
        for (let d = 0; d < 3; d++) {
          for (let j = 0; j < 8; j++) {
            projected[d] += rotated[j] * projectionMatrix[j][d];
          }
        }
        
        positionAttr.setXYZ(i, projected[0] * scale, projected[1] * scale, projected[2] * scale);
        
        // Update colors based on mode
        const currentColorMode = colorModeRef.current;
        if (currentColorMode === 'rainbow') {
          const hue = ((i / particleCount) + time * 0.1) % 1;
          const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
          colorAttr.setXYZ(i, color.r, color.g, color.b);
        } else if (currentColorMode === 'depth') {
          const depth = (projected[2] + 2) / 4;
          const color = new THREE.Color().setHSL(0.6 - depth * 0.3, 0.9, 0.4 + depth * 0.3);
          colorAttr.setXYZ(i, color.r, color.g, color.b);
        } else if (currentColorMode === 'pulse') {
          const pulse = Math.sin(time * 3 + i * 0.05) * 0.5 + 0.5;
          const color = new THREE.Color().setHSL(0.85 - pulse * 0.3, 0.9, 0.3 + pulse * 0.5);
          colorAttr.setXYZ(i, color.r, color.g, color.b);
        }
      });
      
      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      
      // Update line positions
      if (linesRef.current && showConnectionsRef.current) {
        const linePositionAttr = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        let lineIdx = 0;
        
        for (let i = 0; i < e8System.roots.length && lineIdx < linePositionAttr.count; i++) {
          for (let j = i + 1; j < e8System.roots.length && lineIdx < linePositionAttr.count; j++) {
            const p1 = [
              positionAttr.getX(i),
              positionAttr.getY(i),
              positionAttr.getZ(i)
            ];
            const p2 = [
              positionAttr.getX(j),
              positionAttr.getY(j),
              positionAttr.getZ(j)
            ];
            
            const dx = p1[0] - p2[0];
            const dy = p1[1] - p2[1];
            const dz = p1[2] - p2[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist < threshold && dist > 0.1) {
              linePositionAttr.setXYZ(lineIdx * 2, p1[0], p1[1], p1[2]);
              linePositionAttr.setXYZ(lineIdx * 2 + 1, p2[0], p2[1], p2[2]);
              lineIdx++;
            }
          }
        }
        linePositionAttr.needsUpdate = true;
      }
      
      // Update controls
      controls.update();
      
      // Render
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);
  
  // Update particle size
  useEffect(() => {
    if (pointsRef.current) {
      const sizes = pointsRef.current.geometry.getAttribute('size') as THREE.BufferAttribute;
      for (let i = 0; i < sizes.count; i++) {
        sizes.setX(i, particleSize);
      }
      sizes.needsUpdate = true;
    }
  }, [particleSize]);
  
  // Update line visibility
  useEffect(() => {
    if (linesRef.current) {
      linesRef.current.visible = showConnections;
    }
  }, [showConnections]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-4 text-white space-y-4 min-w-[240px] max-h-[calc(100vh-32px)] overflow-y-auto">
        <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          E8 Controls
        </h3>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="w-4 h-4 accent-cyan-500"
          />
          <span className="text-sm">Auto Rotate (8D)</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showConnections}
            onChange={(e) => setShowConnections(e.target.checked)}
            className="w-4 h-4 accent-cyan-500"
          />
          <span className="text-sm">Show Connections</span>
        </label>
        
        <div className="space-y-1">
          <span className="text-sm text-gray-300">Color Mode</span>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as 'rainbow' | 'depth' | 'pulse')}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value="rainbow">Rainbow Flow</option>
            <option value="depth">Depth Gradient</option>
            <option value="pulse">Pulse</option>
          </select>
        </div>
        
        <div className="space-y-1">
          <span className="text-sm text-gray-300">Particle Size: {particleSize}</span>
          <input
            type="range"
            min="1"
            max="8"
            step="0.5"
            value={particleSize}
            onChange={(e) => setParticleSize(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>
        
        {/* 8D Rotation Sliders */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-cyan-400">8D Rotation</span>
            <button
              onClick={() => setManualAngles(Array(8).fill(0))}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="space-y-2">
            {[
              { label: 'D1-D2', desc: 'Plane 1-2' },
              { label: 'D3-D4', desc: 'Plane 3-4' },
              { label: 'D5-D6', desc: 'Plane 5-6' },
              { label: 'D7-D8', desc: 'Plane 7-8' },
              { label: 'D1-D5', desc: 'Cross 1-5' },
              { label: 'D2-D6', desc: 'Cross 2-6' },
              { label: 'D3-D7', desc: 'Cross 3-7' },
              { label: 'D4-D8', desc: 'Cross 4-8' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-cyan-400 font-mono">
                    {(manualAngles[idx] * 180 / Math.PI).toFixed(0)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step={0.01}
                  value={manualAngles[idx]}
                  onChange={(e) => {
                    const newAngles = [...manualAngles];
                    newAngles[idx] = parseFloat(e.target.value);
                    setManualAngles(newAngles);
                  }}
                  className="w-full h-1 accent-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-4 text-white max-w-md">
        <h4 className="font-semibold text-cyan-400 mb-2">E8 Lie Group</h4>
        <p className="text-xs text-gray-300 leading-relaxed">
          The E8 root system contains <span className="text-cyan-400 font-bold">248 roots</span> in 
          8-dimensional space. This visualization projects the structure into 3D while performing 
          continuous rotations in higher dimensions, revealing the extraordinary symmetry of this 
          exceptional Lie group.
        </p>
      </div>
      
      {/* Stats */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-3 text-white text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span>248 Roots</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span>8 Dimensions</span>
        </div>
      </div>
    </div>
  );
};

export default E8Visualization3D;
