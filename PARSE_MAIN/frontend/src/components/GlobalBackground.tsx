import { Suspense, useRef, useState, useEffect, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Box, Sphere, Cylinder, Icosahedron } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { bgStore } from '../bgStore';

// PBR Materials
const nodeMaterial = new THREE.MeshPhysicalMaterial({
  color: '#080a0f',
  roughness: 0.2,
  metalness: 0.9,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});

const frameMaterial = new THREE.MeshStandardMaterial({
  color: '#12151c',
  roughness: 0.7,
  metalness: 0.5,
});

const emissiveMaterial = new THREE.MeshStandardMaterial({
  color: '#44C9D8',
  emissive: '#209DAA',
  emissiveIntensity: 2.5,
  toneMapped: false,
});

function CoreNode({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Icosahedron args={[1, 0]} material={nodeMaterial} />
      <Icosahedron args={[1.05, 0]} material={frameMaterial} />
      <Sphere args={[0.3, 16, 16]} material={emissiveMaterial} />
    </group>
  );
}

function ChainLink({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder args={[0.2, 0.2, 3, 6]} material={frameMaterial} />
      <Cylinder args={[0.05, 0.05, 3.1, 6]} material={emissiveMaterial} />
    </group>
  );
}

function SecurityMesh({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [mouse, setMouse] = useState(new THREE.Vector2());

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setMouse(new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      ));
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Base rotation
    groupRef.current.rotation.y += delta * 0.08;
    groupRef.current.rotation.x += delta * 0.03;

    // We apply base rotation here but the lerp below overrides z, and x/y are overridden by choreography.
    // We will keep z parallax as originally implemented.
    const targetZ = mouse.x * -0.15;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.05);

    // Camera choreography based on progress
    // Progress ranges:
    // 0.0 - 0.2: Hero (wide establishing shot)
    // 0.2 - 0.4: Threat Tunnel (closer/rotated angle)
    // 0.4 - 0.6: Capabilities (pulled back and re-angled)
    // 0.6 - 0.8: Metrics (dramatic low angle)
    // 0.8 - 1.0: Portal (close up on core)

    let tX = 0, tY = 0, tZ = 0, tRotX = 0, tRotY = 0;

    if (progress < 0.2) {
      // Hero (wide, centered)
      tX = 0; tY = 0; tZ = 0;
      tRotX = 0; tRotY = 0;
    } else if (progress < 0.4) {
      // Threat Tunnel
      tX = 3; tY = -2; tZ = 4;
      tRotX = 0.4; tRotY = 0.8;
    } else if (progress < 0.6) {
      // Capabilities
      tX = -4; tY = 1; tZ = -3;
      tRotX = -0.2; tRotY = -0.5;
    } else if (progress < 0.8) {
      // Metrics
      tX = 0; tY = -4; tZ = 2;
      tRotX = -0.8; tRotY = 0.3;
    } else {
      // Portal
      tX = 0; tY = 0; tZ = 8;
      tRotX = 0; tRotY = 3.14;
    }

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, tX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, tY, 0.05);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, tZ + 12, 0.05); // Base distance + offset
    
    // Cursor Parallax (±5 degrees max = ~0.087 radians)
    const targetParallaxX = mouse.y * 0.087; 
    const targetParallaxY = mouse.x * 0.087;
    
    // Group offset rotation for choreography + cursor parallax
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tRotX + targetParallaxX, 0.05);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, tRotY + targetParallaxY + (state.clock.elapsedTime * 0.08), 0.05);
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <CoreNode position={[0, 0, 0]} scale={2} />
        
        {/* Orbital ring 1 */}
        <group rotation={[Math.PI / 4, 0, 0]}>
          <CoreNode position={[4, 0, 0]} scale={0.5} />
          <CoreNode position={[-4, 0, 0]} scale={0.5} />
          <ChainLink position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <ChainLink position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        </group>

        {/* Orbital ring 2 */}
        <group rotation={[0, Math.PI / 4, Math.PI / 4]}>
          <CoreNode position={[0, 5, 0]} scale={0.6} />
          <CoreNode position={[0, -5, 0]} scale={0.6} />
          <ChainLink position={[0, 2.5, 0]} rotation={[0, 0, 0]} />
          <ChainLink position={[0, -2.5, 0]} rotation={[0, 0, 0]} />
        </group>
        
        {/* Decorative blocks */}
        {[...Array(8)].map((_, i) => (
          <Box 
            key={i} 
            args={[0.4, 0.4, 0.4]} 
            position={[Math.cos(i * Math.PI / 4) * 6, Math.sin(i * Math.PI / 4) * 6, Math.sin(i * Math.PI) * 2]}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
            material={frameMaterial}
          />
        ))}
      </Float>
    </group>
  );
}

export default function GlobalBackground() {
  const { progress } = useSyncExternalStore(
    (l) => bgStore.subscribe(l),
    () => bgStore.getSnapshot()
  );
  
  const location = useLocation();
  if (location.pathname.startsWith('/app') || location.pathname.startsWith('/report')) return null;

  return (
    <div className="v8-canvas-layer" style={{ zIndex: 0, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#050608' }}>
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <SecurityMesh progress={progress} />
          
          {/* Multi-point lighting setup: Key, Fill, Rim */}
          <ambientLight intensity={0.2} color="#ffffff" />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#EBEADF" /> {/* Key */}
          <directionalLight position={[-10, -5, 5]} intensity={0.8} color="#209DAA" /> {/* Fill */}
          <spotLight position={[0, 5, -10]} intensity={3} color="#44C9D8" angle={0.5} penumbra={1} /> {/* Rim */}
          
          <Environment preset="studio" />
          
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
