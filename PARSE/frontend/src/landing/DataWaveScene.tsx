import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

const GRID_SIZE = 50;
const SPACING = 1.4;
const NODE_COUNT = GRID_SIZE * GRID_SIZE;
const CURSOR_RADIUS = 6;
const CURSOR_STRENGTH = 3;

const tmpVec = new THREE.Vector3();
const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

function DataGrid({
  progress,
  isDiving,
  cursorWorld,
}: {
  progress: number;
  isDiving: boolean;
  cursorWorld: React.MutableRefObject<THREE.Vector3>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { size } = useThree();
  const isMobile = size.width < 700;
  
  // Use fewer nodes on mobile to keep 60fps
  const activeSize = isMobile ? 35 : GRID_SIZE;
  const activeCount = activeSize * activeSize;

  // Pre-calculate base positions (X, Z) centered around origin
  const basePositions = useMemo(() => {
    const pos = [];
    const offset = (activeSize * SPACING) / 2;
    for (let i = 0; i < activeSize; i++) {
      for (let j = 0; j < activeSize; j++) {
        pos.push({
          x: i * SPACING - offset,
          z: j * SPACING - offset,
        });
      }
    }
    return pos;
  }, [activeSize]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < activeCount; i++) {
      const { x, z } = basePositions[i];

      // Math for data wave: overlapping sine waves
      // Wave 1: Forward rolling wave
      const wave1 = Math.sin(z * 0.4 + t * 1.5) * 1.2;
      // Wave 2: Side-to-side sweeping interference
      const wave2 = Math.cos(x * 0.3 - t * 1.0) * 0.8;
      // Wave 3: High frequency detail / static
      const wave3 = Math.sin((x + z) * 0.7 + t * 2.5) * 0.4;

      let y = wave1 + wave2 + wave3;
      let lightness = 0.1;

      if (isDiving) {
        // Secure Matrix mode: nodes flatten into a rigid grid, breathing softly
        y = Math.sin(t * 2 + x * 0.1 + z * 0.1) * 0.3;
        lightness = 0.05 + Math.sin(t * 3 + x * 0.2) * 0.05;
      } else {
        // Cursor interaction only applies when NOT diving
        const distToCursor = Math.hypot(cursorWorld.current.x - x, cursorWorld.current.z - z);
        
        if (distToCursor < CURSOR_RADIUS) {
          const force = Math.pow(1 - distToCursor / CURSOR_RADIUS, 2) * CURSOR_STRENGTH;
          y += force;
        }

        // Black/Grey mapping for active waves
        const heightPercent = (y + 2.4) / 4.8; 
        lightness = THREE.MathUtils.lerp(0.02, 0.3, Math.min(1, heightPercent));
      }

      // Shift entire grid down by 5 so it's a "floor" below the camera
      tmpObj.position.set(x, y - 5, z);
      
      // Scale nodes based on height (peaks are larger)
      const scale = 0.4 + (y + 2) * 0.2;
      tmpObj.scale.setScalar(Math.max(0.1, scale));
      
      tmpObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tmpObj.matrix);

      tmpColor.setHSL(0, 0, lightness);
      meshRef.current.setColorAt(i, tmpColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, NODE_COUNT]}>
      {/* Use slightly elongated bars for a digital telemetry look instead of perfect cubes */}
      <boxGeometry args={[0.1, 0.3, 0.1]} />
      <meshStandardMaterial
        color="#222222"
        roughness={0.1}
        metalness={0.9}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export default function DataWaveScene({
  progress,
  isDiving,
}: {
  progress: number;
  isDiving: boolean;
}) {
  const { camera, pointer } = useThree();
  const cursorWorld = useRef(new THREE.Vector3());

  // Raycast cursor onto the virtual ground plane (Y = -5)
  const updateCursor = useCallback(() => {
    tmpVec.set(pointer.x, pointer.y, 0.5).unproject(camera);
    const dir = tmpVec.sub(camera.position).normalize();
    // Intersection with plane Y = -5
    if (dir.y !== 0) {
      const distance = (-5 - camera.position.y) / dir.y;
      if (distance > 0) {
        cursorWorld.current.copy(camera.position).add(dir.multiplyScalar(distance));
      }
    }
  }, [camera, pointer]);

  useFrame((_, delta) => {
    updateCursor();
    const dt = Math.min(delta, 0.05);

    if (isDiving) {
      // Secure Matrix mode: Camera pulls up and frames the Auth modal over the clean grid
      camera.position.z = THREE.MathUtils.damp(camera.position.z, -10, 4, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 6, 4, dt);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 4, dt);
      camera.lookAt(0, -2, -20);
    } else {
      // Cinematic flyover based on scroll progress (0 to 1)
      const startZ = 25;
      const endZ = -15;
      const targetZ = startZ + (endZ - startZ) * progress;
      
      const startY = 8;
      const endY = 2;
      const targetY = startY + (endY - startY) * progress;

      // Slight banking left and right based on scroll
      const bankX = Math.sin(progress * Math.PI * 1.5) * 6;

      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3, dt);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, bankX, 2, dt);
      
      // Always look slightly ahead and down into the wave
      camera.lookAt(camera.position.x * 0.3, -5, camera.position.z - 15);
    }
  });

  return (
    <>
      <fog attach="fog" args={['#f5f5f7', 5, 35]} />

      <Environment resolution={64}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Lightformer intensity={4} position={[0, 10, 0]} scale={[20, 20, 1]} color="#ffffff" />
          <Lightformer intensity={2} position={[-10, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[20, 20, 1]} color="#e5e5ea" />
          <Lightformer intensity={2} position={[10, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[20, 20, 1]} color="#d1d1d6" />
        </group>
      </Environment>

      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight position={[10, 20, 5]} intensity={3} color="#ffffff" />

      <DataGrid progress={progress} isDiving={isDiving} cursorWorld={cursorWorld} />
    </>
  );
}
