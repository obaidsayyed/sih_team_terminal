import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface VaultProps {
  isOpen: boolean;
  isShaking: boolean;
}

export default function Vault({ isOpen, isShaking }: VaultProps) {
  const hingeRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const wheelRef = useRef<THREE.Group>(null);
  const boltsRefs = useRef<(THREE.Group | null)[]>([]);
  const boltVelocity = useRef(0);
  const boltPos = useRef(0);
  const seamFlashRef = useRef<THREE.MeshBasicMaterial>(null);
  const hasSealed = useRef(false);
  
  const darkSteelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2c2e33',
    metalness: 0.8,
    roughness: 0.7,
  }), []);

  const heavyFrameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1c1e',
    metalness: 0.9,
    roughness: 0.85,
  }), []);

  const boltMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a4d52',
    metalness: 0.9,
    roughness: 0.5,
  }), []);

  useFrame((state, delta) => {
    if (hingeRef.current) {
      const targetRotation = isOpen ? -Math.PI / 1.5 : 0;
      hingeRef.current.rotation.y = THREE.MathUtils.damp(
        hingeRef.current.rotation.y,
        targetRotation,
        4,
        delta
      );

      const isClosed = hingeRef.current.rotation.y > -0.05;

      // Wheel animation
      if (wheelRef.current) {
        const wheelTarget = (isOpen || !isClosed) ? 0 : Math.PI * 0.75;
        wheelRef.current.rotation.z = THREE.MathUtils.damp(
          wheelRef.current.rotation.z,
          wheelTarget,
          6,
          delta
        );
      }

      // Bolts animation & Recoil
      const isLocking = !isOpen && isClosed && wheelRef.current && wheelRef.current.rotation.z > Math.PI * 0.4;
      const targetExtension = isLocking ? 0.3 : 0;
      
      const springForce = (targetExtension - boltPos.current) * 0.15;
      boltVelocity.current += springForce;
      boltVelocity.current *= 0.75; // friction/damping
      boltPos.current += boltVelocity.current;

      boltsRefs.current.forEach((bolt) => {
        if (bolt) bolt.position.y = boltPos.current;
      });

      // Seam Flash Trigger
      if (isLocking && !hasSealed.current && boltPos.current > 0.28) {
        hasSealed.current = true;
        if (seamFlashRef.current) seamFlashRef.current.opacity = 1.0;
      } else if (isOpen) {
        hasSealed.current = false;
      }

      // Decay Seam Flash
      if (seamFlashRef.current && seamFlashRef.current.opacity > 0) {
        seamFlashRef.current.opacity = THREE.MathUtils.damp(seamFlashRef.current.opacity, 0, 10, delta);
      }
    }
    
    if (groupRef.current) {
      if (isShaking) {
        const time = state.clock.getElapsedTime();
        groupRef.current.position.x = Math.sin(time * 50) * 0.1;
      } else {
        groupRef.current.position.x = THREE.MathUtils.damp(
          groupRef.current.position.x,
          0,
          10,
          delta
        );
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Heavy Housing/Frame */}
      <RoundedBox args={[8, 8, 2.0]} radius={0.5} smoothness={4} position={[0, 0, -1.0]}>
        <primitive object={heavyFrameMaterial} attach="material" />
      </RoundedBox>
      
      {/* Door Socket (Stepped Rim) */}
      <mesh position={[0, 0, -0.2]}>
        <cylinderGeometry args={[2.4, 2.6, 0.4, 64]} />
        <primitive object={heavyFrameMaterial} attach="material" />
      </mesh>
      
      {/* Deep Inner Chamber (Visible when open) */}
      <mesh position={[0, 0, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.3, 2.3, 1.0, 64]} />
        <meshStandardMaterial color="#020202" side={THREE.BackSide} />
      </mesh>

      {/* Inner Chamber Recessed UI Panel (Frames the Sign Up form perfectly) */}
      <group position={[0, 0, -0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.45, 1.45, 0.1, 64]} />
          <primitive object={heavyFrameMaterial} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.4, 1.4, 0.01, 64]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>

      {/* Door Assembly on Hinge */}
      <group ref={hingeRef} position={[-2.3, 0, 0]}>
        {/* Heavy Hinge Plates */}
        <mesh position={[0, 1.4, -0.2]}>
          <boxGeometry args={[0.6, 1.2, 0.6]} />
          <primitive object={heavyFrameMaterial} attach="material" />
        </mesh>
        <mesh position={[0, -1.4, -0.2]}>
          <boxGeometry args={[0.6, 1.2, 0.6]} />
          <primitive object={heavyFrameMaterial} attach="material" />
        </mesh>

        <group position={[2.3, 0, 0]}>
          {/* Main Vault Door Slab */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.3, 2.3, 0.6, 64]} />
            <primitive object={darkSteelMaterial} attach="material" />
          </mesh>

          {/* Stepped Concentric Rings & Rivets */}
          <mesh position={[0, 0, 0.31]}>
            <ringGeometry args={[1.9, 2.25, 64]} />
            <primitive object={heavyFrameMaterial} attach="material" />
          </mesh>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            return (
              <mesh key={`rivet-${i}`} position={[Math.cos(angle) * 2.08, Math.sin(angle) * 2.08, 0.32]} rotation={[Math.PI / 2, 0, angle]}>
                 <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
                 <primitive object={boltMaterial} attach="material" />
              </mesh>
            );
          })}

          <mesh position={[0, 0, 0.32]}>
            <ringGeometry args={[0.7, 1.1, 64]} />
            <primitive object={heavyFrameMaterial} attach="material" />
          </mesh>

          {/* Stepped Door Bevel/Details */}
          <mesh position={[0, 0, 0.3]}>
            <cylinderGeometry args={[1.8, 2, 0.1, 64]} />
            <primitive object={darkSteelMaterial} attach="material" />
          </mesh>

          {/* Glowing Seam Flash (triggers on lock) */}
          <mesh position={[0, 0, 0.28]}>
            <ringGeometry args={[2.28, 2.32, 64]} />
            <meshBasicMaterial ref={seamFlashRef} color="#44c9d8" transparent opacity={0} blending={THREE.AdditiveBlending} />
          </mesh>

          {/* Heavy Radial Bolts with Beveled Heads */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 2.3;
            return (
              <group
                key={`bolt-${i}`}
                position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
                rotation={[0, 0, angle]}
              >
                <group ref={(el) => (boltsRefs.current[i] = el)}>
                  {/* Heavy Bolt Shaft */}
                  <mesh>
                    <cylinderGeometry args={[0.15, 0.15, 0.8, 32]} />
                    <primitive object={boltMaterial} attach="material" />
                  </mesh>
                  {/* Heavy Hex Bolt Head */}
                  <mesh position={[0, 0.4, 0]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.1, 6]} />
                    <primitive object={darkSteelMaterial} attach="material" />
                  </mesh>
                </group>
              </group>
            );
          })}

          {/* Recessed Display Panel in Door Center for UI */}
          <group position={[0, 0, 0.35]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.45, 1.45, 0.1, 64]} />
              <primitive object={heavyFrameMaterial} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.4, 1.4, 0.01, 64]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Bevel/Frame around the screen */}
            <mesh position={[0, 0, 0.06]}>
              <torusGeometry args={[1.45, 0.04, 16, 64]} />
              <primitive object={boltMaterial} attach="material" />
            </mesh>
          </group>

          {/* Locking Wheel Assembly (Redesigned as an open ring frame) */}
          <group position={[0, 0, 0.45]} ref={wheelRef}>
            {/* Inner Ring (frames the screen) */}
            <mesh position={[0, 0, 0]}>
              <torusGeometry args={[1.5, 0.04, 16, 128]} />
              <primitive object={boltMaterial} attach="material" />
            </mesh>

            {/* Outer Ring */}
            <mesh position={[0, 0, 0]}>
              <torusGeometry args={[1.9, 0.06, 16, 128]} />
              <primitive object={boltMaterial} attach="material" />
            </mesh>

            {/* Wheel Spokes (between inner and outer ring) */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const innerR = 1.5;
              const outerR = 1.9;
              const midR = (innerR + outerR) / 2;
              const length = outerR - innerR;
              return (
                <mesh
                  key={`spoke-${i}`}
                  position={[Math.cos(angle) * midR, Math.sin(angle) * midR, 0]}
                  rotation={[0, 0, angle + Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.04, 0.04, length, 16]} />
                  <primitive object={darkSteelMaterial} attach="material" />
                </mesh>
              );
            })}
          </group>
        </group>
      </group>
    </group>
  );
}
