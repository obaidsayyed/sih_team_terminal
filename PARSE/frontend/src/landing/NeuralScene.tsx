import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

// ------------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------------
const NODE_COUNT = 180;
const EDGE_MAX = 500;
const CURSOR_RADIUS = 4;
const CURSOR_STRENGTH = 0.08;
const CONNECTION_DIST = 2.8;

const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

// ------------------------------------------------------------------
// PHASE TARGETS — position generators for each scroll keyframe
// ------------------------------------------------------------------
function getSpherePosition(i: number, count: number): THREE.Vector3 {
  const phi = Math.acos(-1 + (2 * i) / count);
  const theta = Math.sqrt(count * Math.PI) * phi;
  const r = 6;
  return new THREE.Vector3(
    r * Math.cos(theta) * Math.sin(phi),
    r * Math.sin(theta) * Math.sin(phi),
    r * Math.cos(phi)
  );
}

function getTunnelPosition(i: number, count: number): THREE.Vector3 {
  const t = i / count;
  const angle = t * Math.PI * 12;
  const r = 2.5 + Math.sin(t * Math.PI * 3) * 0.5;
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r,
    t * 30 - 15
  );
}

function getGridPosition(i: number, count: number): THREE.Vector3 {
  const cols = 12;
  const row = Math.floor(i / cols);
  const col = i % cols;
  return new THREE.Vector3(
    (col - cols / 2) * 1.2,
    (row - Math.floor(count / cols) / 2) * 1.2,
    0
  );
}

function getRadialPosition(i: number, count: number): THREE.Vector3 {
  const rings = 5;
  const ring = i % rings;
  const indexInRing = Math.floor(i / rings);
  const countPerRing = Math.ceil(count / rings);
  const angle = (indexInRing / countPerRing) * Math.PI * 2;
  const r = (ring + 1) * 1.8;
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r,
    Math.sin(angle * 3) * 0.5
  );
}

function getConvergePosition(i: number, count: number): THREE.Vector3 {
  const t = i / count;
  const angle = t * Math.PI * 2;
  const layer = i % 3;
  const r = 0.5 + layer * 0.4;
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r * 1.4,
    layer * 0.15
  );
}

// ------------------------------------------------------------------
// SHARED DATA — positions array used by both nodes and edges
// ------------------------------------------------------------------
const sharedPositions: THREE.Vector3[] = [];
for (let i = 0; i < NODE_COUNT; i++) {
  sharedPositions.push(new THREE.Vector3());
}

// ------------------------------------------------------------------
// NEURAL NODES (Instanced glowing spheres)
// ------------------------------------------------------------------
function NeuralNodes({
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
  const actualCount = isMobile ? 80 : NODE_COUNT;

  // Pre-compute target positions for all 5 phases
  const phases = useMemo(() => {
    const sphere: THREE.Vector3[] = [];
    const tunnel: THREE.Vector3[] = [];
    const grid: THREE.Vector3[] = [];
    const radial: THREE.Vector3[] = [];
    const converge: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      sphere.push(getSpherePosition(i, NODE_COUNT));
      tunnel.push(getTunnelPosition(i, NODE_COUNT));
      grid.push(getGridPosition(i, NODE_COUNT));
      radial.push(getRadialPosition(i, NODE_COUNT));
      converge.push(getConvergePosition(i, NODE_COUNT));
    }
    return { sphere, tunnel, grid, radial, converge };
  }, []);

  // Node velocities for spring physics
  const velocities = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      arr.push(new THREE.Vector3());
    }
    return arr;
  }, []);

  // Initialize shared positions
  useMemo(() => {
    for (let i = 0; i < NODE_COUNT; i++) {
      sharedPositions[i].copy(phases.sphere[i]);
    }
  }, [phases]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    for (let i = 0; i < actualCount; i++) {
      // Determine morph target based on scroll progress
      let target: THREE.Vector3;
      if (isDiving) {
        target = tmpVec2.set(0, 0, 0);
      } else if (progress < 0.2) {
        target = phases.sphere[i];
      } else if (progress < 0.4) {
        const blend = (progress - 0.2) / 0.2;
        target = tmpVec2.copy(phases.sphere[i]).lerp(phases.tunnel[i], blend);
      } else if (progress < 0.6) {
        const blend = (progress - 0.4) / 0.2;
        target = tmpVec2.copy(phases.tunnel[i]).lerp(phases.grid[i], blend);
      } else if (progress < 0.8) {
        const blend = (progress - 0.6) / 0.2;
        target = tmpVec2.copy(phases.grid[i]).lerp(phases.radial[i], blend);
      } else {
        const blend = Math.min((progress - 0.8) / 0.2, 1);
        target = tmpVec2.copy(phases.radial[i]).lerp(phases.converge[i], blend);
      }

      // Idle float oscillation for organic feel
      const floatX = Math.sin(t * 0.5 + i * 0.3) * 0.12;
      const floatY = Math.cos(t * 0.4 + i * 0.7) * 0.12;

      // Spring physics toward target
      const pos = sharedPositions[i];
      const vel = velocities[i];
      const stiffness = isDiving ? 8 : 3;
      const damping = 0.88;

      vel.x += (target.x + floatX - pos.x) * stiffness * dt;
      vel.y += (target.y + floatY - pos.y) * stiffness * dt;
      vel.z += (target.z - pos.z) * stiffness * dt;

      // Cursor gravity well — nodes are attracted toward the cursor
      tmpVec.copy(cursorWorld.current).sub(pos);
      const distToCursor = tmpVec.length();
      if (distToCursor < CURSOR_RADIUS && distToCursor > 0.1) {
        const force = CURSOR_STRENGTH * (1 - distToCursor / CURSOR_RADIUS);
        vel.add(tmpVec.normalize().multiplyScalar(force));
      }

      vel.multiplyScalar(damping);
      pos.add(tmpVec.copy(vel).multiplyScalar(dt * 60));

      // Set instanced transform
      tmpObj.position.copy(pos);
      const scale = isDiving ? Math.max(0.01, 1 - progress * 2) : 1;
      tmpObj.scale.setScalar(scale);
      tmpObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tmpObj.matrix);

      // Color: pulse between dark greys
      const pulse = 0.6 + Math.sin(t * 2 + i * 0.5) * 0.4;
      tmpColor.setHSL(0, 0, 0.1 + pulse * 0.15);
      meshRef.current.setColorAt(i, tmpColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, NODE_COUNT]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color="#222222"
        roughness={0.1}
        metalness={0.9}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ------------------------------------------------------------------
// NEURAL EDGES (Dynamic line connections between nearby nodes)
// ------------------------------------------------------------------
function NeuralEdges() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const { size } = useThree();
  const isMobile = size.width < 700;
  const maxEdges = isMobile ? 180 : EDGE_MAX;
  const nodeCount = isMobile ? 80 : NODE_COUNT;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(maxEdges * 6);
    const colArr = new Float32Array(maxEdges * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [maxEdges]);

  useFrame(() => {
    if (!lineRef.current) return;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let edgeCount = 0;

    for (let i = 0; i < nodeCount && edgeCount < maxEdges; i++) {
      const a = sharedPositions[i];
      for (let j = i + 1; j < nodeCount && edgeCount < maxEdges; j++) {
        const b = sharedPositions[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < CONNECTION_DIST) {
          const idx = edgeCount * 6;
          posArr[idx] = a.x;
          posArr[idx + 1] = a.y;
          posArr[idx + 2] = a.z;
          posArr[idx + 3] = b.x;
          posArr[idx + 4] = b.y;
          posArr[idx + 5] = b.z;

          // Edge color fades with distance
          const alpha = (1 - dist / CONNECTION_DIST) * 0.8;
          colArr[idx] = 0.2 * alpha;
          colArr[idx + 1] = 0.2 * alpha;
          colArr[idx + 2] = 0.2 * alpha;
          colArr[idx + 3] = 0.2 * alpha;
          colArr[idx + 4] = 0.2 * alpha;
          colArr[idx + 5] = 0.2 * alpha;

          edgeCount++;
        }
      }
    }

    // Zero remaining
    for (let k = edgeCount * 6; k < maxEdges * 6; k++) {
      posArr[k] = 0;
      colArr[k] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geometry.setDrawRange(0, edgeCount * 2);
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </lineSegments>
  );
}

// ------------------------------------------------------------------
// SCENE ROOT
// ------------------------------------------------------------------
export default function NeuralScene({
  progress,
  isDiving,
}: {
  progress: number;
  isDiving: boolean;
}) {
  const { camera, pointer } = useThree();
  const cursorWorld = useRef(new THREE.Vector3());

  // Project cursor into world space
  const updateCursor = useCallback(() => {
    tmpVec.set(pointer.x, pointer.y, 0.5).unproject(camera);
    const dir = tmpVec.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    cursorWorld.current.copy(camera.position).add(dir.multiplyScalar(dist));
  }, [camera, pointer]);

  useFrame((_, delta) => {
    updateCursor();
    const dt = Math.min(delta, 0.05);

    if (isDiving) {
      // Warp zoom into center
      camera.position.z = THREE.MathUtils.damp(camera.position.z, -2, 6, dt);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 6, dt);
    } else if (progress < 0.2) {
      // Phase 1: Orbital — gentle orbit around the sphere
      const angle = progress * Math.PI * 2;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, Math.sin(angle) * 2, 2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, Math.cos(angle) * 1, 2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 14, 2, dt);
    } else if (progress < 0.4) {
      // Phase 2: Tunnel fly-through
      const t = (progress - 0.2) / 0.2;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 3, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 14 - t * 25, 2, dt);
    } else if (progress < 0.6) {
      // Phase 3: Grid view — pull back to see structure
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 3, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 18, 2, dt);
    } else if (progress < 0.8) {
      // Phase 4: Radial — wide view of rings
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 3, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 16, 2, dt);
    } else {
      // Phase 5: Converge — zoom into the shield
      const t = Math.min((progress - 0.8) / 0.2, 1);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 3, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 16 - t * 10, 2, dt);
    }

    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <fog attach="fog" args={['#f5f5f7', 8, 40]} />

      <Environment resolution={64}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Lightformer intensity={3} position={[0, 10, 0]} scale={[10, 10, 1]} color="#ffffff" />
          <Lightformer intensity={1.5} position={[-10, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 10, 1]} color="#e5e5ea" />
          <Lightformer intensity={1.5} position={[10, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 10, 1]} color="#d1d1d6" />
        </group>
      </Environment>

      <ambientLight intensity={1.5} color="#ffffff" />
      <pointLight position={[0, 0, 8]} intensity={2} color="#ffffff" />
      <pointLight position={[5, 5, 5]} intensity={1} color="#e5e5ea" />

      <NeuralNodes progress={progress} isDiving={isDiving} cursorWorld={cursorWorld} />
      <NeuralEdges />
    </>
  );
}
