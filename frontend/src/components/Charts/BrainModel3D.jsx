import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, OrbitControls } from '@react-three/drei';

const BrainSphere = ({ riskLevel, stress }) => {
  const meshRef = useRef();
  const innerRef = useRef();

  const riskColors = {
    HIGH: { main: '#ff3d71', inner: '#ff6b6b', emissive: '#ff0040' },
    MEDIUM: { main: '#ffaa00', inner: '#ffd700', emissive: '#ff8800' },
    LOW: { main: '#00f5ff', inner: '#00ff88', emissive: '#00d4ff' },
  };

  const colors = riskColors[riskLevel] || riskColors.LOW;
  const distort = riskLevel === 'HIGH' ? 0.6 : riskLevel === 'MEDIUM' ? 0.4 : 0.25;
  const speed = riskLevel === 'HIGH' ? 3 : riskLevel === 'MEDIUM' ? 2 : 1;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= 0.006;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * speed) * 0.08;
      innerRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Outer Brain */}
      <Sphere ref={meshRef} args={[1.3, 64, 64]}>
        <MeshDistortMaterial
          color={colors.main}
          emissive={colors.emissive}
          emissiveIntensity={0.4}
          distort={distort}
          speed={speed}
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.85}
          wireframe={false}
        />
      </Sphere>
      {/* Inner Glowing Core */}
      <Sphere ref={innerRef} args={[0.7, 32, 32]}>
        <MeshDistortMaterial
          color={colors.inner}
          emissive={colors.inner}
          emissiveIntensity={1.0}
          distort={distort * 0.8}
          speed={speed * 1.5}
          transparent
          opacity={0.7}
        />
      </Sphere>
      {/* Particle Ring */}
      <Sphere args={[1.8, 8, 8]}>
        <MeshDistortMaterial
          color={colors.main}
          emissive={colors.emissive}
          emissiveIntensity={0.2}
          distort={0.1}
          speed={0.5}
          wireframe
          transparent
          opacity={0.2}
        />
      </Sphere>
    </group>
  );
};

const BrainModel3D = ({ riskLevel = 'LOW', stress = 0 }) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#00f5ff" />
        <pointLight position={[-5, -5, -5]} intensity={1.0} color="#ff3d71" />
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#00ff88" />
        <BrainSphere riskLevel={riskLevel} stress={stress} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

export default BrainModel3D;
