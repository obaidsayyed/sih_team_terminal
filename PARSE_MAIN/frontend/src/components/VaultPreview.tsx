import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const brushedSteelMaterial = new THREE.MeshStandardMaterial({
  color: '#888888',
  metalness: 0.85,
  roughness: 0.4,
});

const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: '#222222',
  metalness: 0.9,
  roughness: 0.5,
});

const frameMaterial = new THREE.MeshStandardMaterial({
  color: '#444444',
  metalness: 0.7,
  roughness: 0.6,
});

function Vault() {
  const doorRef = useRef<THREE.Group>(null);

  return (
    <group position={[0, 0, 0]}>
      {/* Housing/Frame */}
      <mesh position={[0, 0, -0.5]}>
        <boxGeometry args={[6, 6, 1]} />
        <primitive object={frameMaterial} attach="material" />
      </mesh>
      
      {/* Inner Chamber dark background */}
      <mesh position={[0, 0, -0.49]}>
        <circleGeometry args={[2.1, 128]} />
        <meshStandardMaterial color="#050505" />
      </mesh>

      {/* Door Assembly */}
      <group ref={doorRef} position={[0, 0, 0]}>
        {/* Main Vault Door */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2, 2, 0.4, 128]} />
          <primitive object={brushedSteelMaterial} attach="material" />
        </mesh>

        {/* Door Bevel/Details */}
        <mesh position={[0, 0, 0.2]}>
          <torusGeometry args={[1.8, 0.05, 16, 64]} />
          <primitive object={darkMetalMaterial} attach="material" />
        </mesh>

        {/* Radial Bolts */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 2; // Position slightly sticking out
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
              rotation={[0, 0, angle]}
            >
              <cylinderGeometry args={[0.08, 0.08, 0.4, 6]} /> {/* Hex bolts */}
              <primitive object={brushedSteelMaterial} attach="material" />
            </mesh>
          );
        })}

        {/* Locking Wheel Assembly */}
        <group position={[0, 0, 0.3]}>
          {/* Center Hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 64]} />
            <primitive object={brushedSteelMaterial} attach="material" />
          </mesh>

          {/* Wheel Ring */}
          <mesh position={[0, 0, 0.2]}>
            <torusGeometry args={[0.8, 0.05, 16, 128]} />
            <primitive object={brushedSteelMaterial} attach="material" />
          </mesh>

          {/* Wheel Spokes */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0.1]}
                rotation={[0, 0, angle]}
              >
                <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
                <primitive object={brushedSteelMaterial} attach="material" />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

export default function VaultPreview() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
        {/* Environment & Lighting */}
        <Environment preset="studio" />
        <ambientLight intensity={0.2} />
        
        {/* Key Light */}
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.5} 
          castShadow
        />
        
        {/* Fill Light */}
        <directionalLight 
          position={[-5, 2, 2]} 
          intensity={0.5} 
        />
        
        {/* Rim Light */}
        <directionalLight 
          position={[0, 5, -5]} 
          intensity={2} 
        />

        <Vault />

        <ContactShadows 
          position={[0, -3, 0]} 
          opacity={0.7} 
          scale={15} 
          blur={2.5} 
          far={4} 
        />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
