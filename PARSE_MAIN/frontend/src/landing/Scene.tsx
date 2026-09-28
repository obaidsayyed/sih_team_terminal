import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// ------------------------------------------------------------------
// HERO CAPSULE (The single sealed object)
// ------------------------------------------------------------------
function HeroCapsule({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const { size, pointer } = useThree();
  const isMobile = size.width < 700;

  useFrame((state, delta) => {
    if (!group.current) return;
    
    // Parallax on hover (reduced motion check usually done globally, we assume smooth here)
    const targetX = pointer.x * 0.25;
    const targetY = pointer.y * 0.25;
    
    // Smooth damp towards target
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, (isMobile ? 0 : 2) + targetX, 4, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, (isMobile ? -2 : 0) + targetY, 4, delta);
    
    // Slow idle rotation + pointer rotation
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, state.clock.elapsedTime * 0.2 + pointer.x * 0.5, 4, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, pointer.y * 0.5, 4, delta);

    // Fade into the background field during scroll progress > 0.1
    if (progress > 0.1) {
       const scaleTarget = Math.max(0.2, 1 - (progress - 0.1) * 2);
       group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scaleTarget, 4, delta));
    } else {
       group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, 1, 4, delta));
    }
  });

  return (
    <group ref={group}>
      <RoundedBox args={[2.2, 1.2, 0.5]} radius={0.25} smoothness={4}>
        <meshPhysicalMaterial 
          transmission={1} 
          roughness={0.5} 
          thickness={1} 
          ior={1.3} 
          clearcoat={1} 
          attenuationColor="#222" 
          attenuationDistance={1}
          color="#ffffff"
        />
      </RoundedBox>
      {/* End Caps */}
      <RoundedBox args={[2.25, 0.2, 0.55]} radius={0.05} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#333" roughness={0.8} metalness={0.2} />
      </RoundedBox>
      <RoundedBox args={[2.25, 0.2, 0.55]} radius={0.05} position={[0, -0.55, 0]}>
        <meshStandardMaterial color="#333" roughness={0.8} metalness={0.2} />
      </RoundedBox>
      
      {/* Internal Metadata Bars */}
      <group position={[0, 0, 0]}>
        {[...Array(5)].map((_, i) => (
          <mesh key={i} position={[(i - 2) * 0.4, 0, 0]}>
             <boxGeometry args={[0.2, 0.8, 0.1]} />
             <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------------------
// FIELD (Instanced smaller capsules)
// ------------------------------------------------------------------
const COUNT = 320;
const tempObject = new THREE.Object3D();
const tempVec = new THREE.Vector3();

function Field({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { size, pointer, camera } = useThree();
  const isMobile = size.width < 700;
  const actualCount = isMobile ? 90 : COUNT;

  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40 - 10;
      data.push({ x, y, z, factor: Math.random(), speed: Math.random() });
    }
    return data;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Repulsion cursor in world space
    tempVec.set(pointer.x, pointer.y, 0.5).unproject(camera);
    const dir = tempVec.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    particles.forEach((particle, i) => {
      if (i >= actualCount) return;

      let { x, y, z } = particle;
      
      // Idle float
      const t = state.clock.elapsedTime + particle.factor * 10;
      const yOffset = Math.sin(t * particle.speed) * 0.5;
      
      tempObject.position.set(x, y + yOffset, z);
      
      // Cursor repulsion
      const distToCursor = tempObject.position.distanceTo(pos);
      if (distToCursor < 5) {
         const force = (5 - distToCursor) * 0.1;
         tempObject.position.x += (x - pos.x) * force;
         tempObject.position.y += (y - pos.y) * force;
         tempObject.rotation.x += force * delta;
         tempObject.rotation.y += force * delta;
      } else {
         // Return to base rotation
         tempObject.rotation.x = THREE.MathUtils.damp(tempObject.rotation.x, 0, 2, delta);
         tempObject.rotation.y = THREE.MathUtils.damp(tempObject.rotation.y, particle.factor * Math.PI, 2, delta);
      }

      // Scroll alignment effect (beats 2/3)
      if (progress > 0.3) {
         const alignFactor = Math.min((progress - 0.3) * 5, 1);
         const targetX = (i % 4) * 4 - 6;
         const targetY = Math.floor(i / 4) * 0.5 - 10;
         tempObject.position.x = THREE.MathUtils.lerp(tempObject.position.x, targetX, alignFactor);
         tempObject.position.y = THREE.MathUtils.lerp(tempObject.position.y, targetY, alignFactor);
      }

      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, COUNT]}>
      <boxGeometry args={[0.5, 0.3, 0.1]} />
      <meshStandardMaterial 
        color="#888" 
        roughness={0.2} 
        transparent 
        opacity={0.8} 
      />
    </instancedMesh>
  );
}

// ------------------------------------------------------------------
// SCENE ROOT
// ------------------------------------------------------------------
export default function Scene({ progress, isDiving }: { progress: number, isDiving: boolean }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    // Camera spline path based on progress
    if (isDiving) {
       // Pushing directly into the glass
       camera.position.z = THREE.MathUtils.damp(camera.position.z, 0.1, 4, delta);
    } else {
       // Regular scroll path
       const z = THREE.MathUtils.lerp(10, -5, progress);
       camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 2, delta);
       camera.position.y = THREE.MathUtils.damp(camera.position.y, progress * -5, 2, delta);
    }
  });

  return (
    <>
      <color attach="background" args={['#0a0a0a']} />
      <fog attach="fog" args={['#0a0a0a', 5, 30]} />
      
      <Environment resolution={128}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Lightformer intensity={4} position={[0, 10, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={2} position={[-10, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={2} position={[10, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 10, 1]} />
        </group>
      </Environment>

      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 5]} intensity={0.5} />

      <HeroCapsule progress={progress} />
      <Field progress={progress} />
    </>
  );
}
