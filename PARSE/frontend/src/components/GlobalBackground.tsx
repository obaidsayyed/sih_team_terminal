import { Suspense, useSyncExternalStore, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useLocation } from 'react-router-dom';
import DataWaveScene from '../landing/DataWaveScene';
import NeuralScene from '../landing/NeuralScene';
import ParticleNebula from '../landing/ParticleNebula';
import { bgStore } from '../bgStore';
import '../landing/landing-v8.css';

export default function GlobalBackground() {
  const { progress, isDiving } = useSyncExternalStore(
    (l) => bgStore.subscribe(l),
    () => bgStore.getSnapshot()
  );
  const [dpr, setDpr] = useState(1);
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');

  return (
    <>
      <Suspense fallback={null}>
        <ParticleNebula scrollProgress={progress} />
      </Suspense>

      <div className="v8-canvas-layer">
        <Suspense
          fallback={
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#050510',
              }}
            />
          }
        >
          <Canvas
            camera={{ position: [0, 0, 14], fov: 50 }}
            dpr={dpr}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            eventSource={document.body}
            eventPrefix="client"
          >
            <PerformanceMonitor
              onIncline={() => setDpr(2)}
              onDecline={() => setDpr(1)}
            />
            {/* 3D Scenes have been removed per user request */}
          </Canvas>
        </Suspense>
      </div>
    </>
  );
}
