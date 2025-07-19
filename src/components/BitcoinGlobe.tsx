import React, { useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Constants for visualization
const EARTH_RADIUS = 100;
const LINE_DURATION = 2000;
const MAX_LINES = 50;

export default function BitcoinGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`]);
  };

  useLayoutEffect(() => {
    addDebugInfo('Layout effect started');
    
    if (!containerRef.current) {
      addDebugInfo('No container ref in init');
      return;
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    addDebugInfo(`Container dimensions: ${width}x${height}`);

    if (width === 0 || height === 0) {
      addDebugInfo('Invalid dimensions, retrying...');
      requestAnimationFrame(() => {
        // Force reflow
        container.getBoundingClientRect();
      });
      return;
    }

    try {
      addDebugInfo('Starting setup...');

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      // Camera setup
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.z = 300;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 150;
      controls.maxDistance = 400;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;

      // Earth setup
      const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
      const textureLoader = new THREE.TextureLoader();

      // Create lines group
      const linesGroup = new THREE.Group();
      scene.add(linesGroup);

      // Function to create glowing line material
      const createGlowMaterial = () => {
        return new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(0xff6b00) },
            glowColor: { value: new THREE.Color(0xff9500) },
            opacity: { value: 1.0 }
          },
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            uniform vec3 glowColor;
            uniform float opacity;
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
              vec3 finalColor = mix(color, glowColor, intensity);
              gl_FragColor = vec4(finalColor, opacity * (intensity + 0.3));
            }
          `,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      };

      // Function to create a curved line
      const createCurvedLine = (startPoint: THREE.Vector3, endPoint: THREE.Vector3) => {
        try {
          // Calculate control point for the curve
          const midPoint = startPoint.clone().add(endPoint).multiplyScalar(0.5);
          const distance = startPoint.distanceTo(endPoint);
          const heightFactor = Math.min(1, distance / (EARTH_RADIUS * 2)) * EARTH_RADIUS;
          const controlPoint = midPoint.normalize().multiplyScalar(EARTH_RADIUS + heightFactor);

          // Create curve
          const curve = new THREE.QuadraticBezierCurve3(startPoint, controlPoint, endPoint);
          const points = curve.getPoints(50);

          // Create tube geometry for better visual effect
          const tubeGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            50,
            1,
            8,
            false
          );

          // Create glowing material
          const material = createGlowMaterial();
          const line = new THREE.Mesh(tubeGeometry, material);
          line.renderOrder = 1;

          // Remove the coordinate debug text
          addDebugInfo(`New transaction line added`);
          return line;
        } catch (error) {
          addDebugInfo(`Error creating line: ${error}`);
          return null;
        }
      };

      // Function to convert lat/lng to 3D position
      const latLngToVector3 = (lat: number, lng: number, radius: number) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
      };

      // Load Earth texture
      textureLoader.load(
        '/earth-4k.jpg',
        (texture) => {
          const material = new THREE.MeshPhongMaterial({
            map: texture,
            bumpScale: 0.5,
          });
          const earth = new THREE.Mesh(earthGeometry, material);
          scene.add(earth);

          // Add ambient light
          const ambientLight = new THREE.AmbientLight(0x404040, 1);
          scene.add(ambientLight);

          // Add directional light
          const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
          directionalLight.position.set(1, 1, 1);
          scene.add(directionalLight);

          setLoadingProgress(100);
          setIsLoading(false);

          // Start receiving transactions
          const ws = new WebSocket('wss://ws.blockchain.info/inv');
          
          ws.onopen = () => {
            addDebugInfo('WebSocket connected');
            ws.send(JSON.stringify({ "op": "unconfirmed_sub" }));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.op === 'utx') {
              // Generate random points for demonstration
              const startLat = (Math.random() * 180) - 90;
              const startLng = (Math.random() * 360) - 180;
              const endLat = (Math.random() * 180) - 90;
              const endLng = (Math.random() * 360) - 180;

              const startPoint = latLngToVector3(startLat, startLng, EARTH_RADIUS);
              const endPoint = latLngToVector3(endLat, endLng, EARTH_RADIUS);

              const line = createCurvedLine(startPoint, endPoint);
              if (line) {
                linesGroup.add(line);
                
                // Remove old lines
                if (linesGroup.children.length > MAX_LINES) {
                  const oldestLine = linesGroup.children[0];
                  linesGroup.remove(oldestLine);
                }

                // Animate line
                const startTime = Date.now();
                const animate = () => {
                  const progress = (Date.now() - startTime) / LINE_DURATION;
                  if (progress < 1) {
                    if (line.material instanceof THREE.ShaderMaterial) {
                      line.material.uniforms.opacity.value = Math.sin(progress * Math.PI) * 0.7 + 0.3;
                    }
                    requestAnimationFrame(animate);
                  } else {
                    linesGroup.remove(line);
                  }
                };
                animate();
              }
            }
          };

          // Animation loop
          const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          };
          animate();
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          setLoadingProgress(Math.round(percent));
        },
        (error) => {
          addDebugInfo(`Error loading texture: ${error}`);
          setError('Failed to load Earth texture');
        }
      );

      // Cleanup
      return () => {
        controls.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addDebugInfo(`Setup error: ${errorMsg}`);
      setError(`Setup failed: ${errorMsg}`);
      setIsLoading(false);
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: '100vh' }}>
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%'
        }}
      />
      {/* Debug Panel - Always visible */}
      <div className="absolute top-0 right-0 bg-black/70 text-white p-4 m-4 rounded-lg max-w-md max-h-[80vh] overflow-y-auto">
        <h3 className="font-bold mb-2">Debug Info</h3>
        <div className="text-xs space-y-1">
          {debugInfo.map((info, i) => (
            <p key={i} className="font-mono">{info}</p>
          ))}
        </div>
      </div>
      {(error || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="text-center p-4">
            {error ? (
              <div className="text-red-500">
                <h2 className="text-xl mb-2">Error</h2>
                <p>{error}</p>
              </div>
            ) : (
              <div className="text-white">
                <p className="mb-2">Loading Earth...</p>
                <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-400">{loadingProgress}%</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 