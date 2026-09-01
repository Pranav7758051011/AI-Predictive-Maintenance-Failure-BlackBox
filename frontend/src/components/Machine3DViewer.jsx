import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stage, Float } from '@react-three/drei';
import { FiRotateCw, FiZoomIn, FiEye, FiActivity, FiSliders } from 'react-icons/fi';

// Spindle tool rotation animation
function RotatingSpindle({ isRunning = true }) {
  const spindleRef = useRef();
  useFrame((_, delta) => {
    if (spindleRef.current && isRunning) {
      spindleRef.current.rotation.y += delta * 6;
    }
  });

  return (
    <group ref={spindleRef} position={[0, 1.4, 0]}>
      {/* Toolholder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 32]} />
        <meshStandardMaterial color="#A5B4FC" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Carbide End Mill */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.05} />
      </mesh>
    </group>
  );
}

// Interactive 3D Sensor Node
function SensorPoint({ position, label, value, status = 'normal', onClick }) {
  const [hovered, setHovered] = useState(false);
  
  let color = '#2E7D5B'; // success
  if (status === 'warning') color = '#D99520';
  if (status === 'critical' || status === 'high') color = '#C73E3A';

  return (
    <group position={position}>
      {/* Outer pulse ring */}
      <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onClick}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          roughness={0.2}
        />
      </mesh>

      {/* HTML Tooltip overlay */}
      {(hovered || status !== 'normal') && (
        <Html position={[0, 0.25, 0]} center distanceFactor={8}>
          <div className={`px-2.5 py-1.5 rounded-md shadow-md text-xs font-semibold backdrop-blur-md transition-all border whitespace-nowrap ${
            status === 'critical' 
              ? 'bg-red-900/90 text-white border-red-500' 
              : status === 'warning'
              ? 'bg-amber-900/90 text-white border-amber-500'
              : 'bg-slate-900/90 text-white border-slate-700'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: color }} />
              <span className="uppercase text-[10px] text-gray-300 font-bold">{label}</span>
            </div>
            <div className="text-sm font-mono text-white mt-0.5">{value}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Procedural 3D CNC Machine Mesh Assembly
function IndustrialCNCMachine({ machineData, showSensors }) {
  const groupRef = useRef();

  const tempStatus = machineData?.temperature > 80 ? 'critical' : machineData?.temperature > 74 ? 'warning' : 'normal';
  const vibStatus = machineData?.vibration > 4.5 ? 'critical' : machineData?.vibration > 3.2 ? 'warning' : 'normal';
  const pressStatus = machineData?.pressure > 6.0 ? 'warning' : 'normal';
  const currStatus = machineData?.current > 24 ? 'warning' : 'normal';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Base Machine Chassis */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[3.2, 0.8, 2.2]} />
        <meshStandardMaterial color="#183746" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Heavy Rubber Anti-vibration Feet */}
      {[-1.4, 1.4].map((x) =>
        [-0.9, 0.9].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -1.05, z]}>
            <cylinderGeometry args={[0.18, 0.22, 0.15, 16]} />
            <meshStandardMaterial color="#172126" roughness={0.8} />
          </mesh>
        ))
      )}

      {/* T-Slot Machine Bed (Worktable) */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[2.4, 0.2, 1.4]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* Workpiece Aluminum Block */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.8, 0.4, 0.6]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical Column Backing */}
      <mesh position={[0, 1.1, -0.7]}>
        <boxGeometry args={[1.8, 2.4, 0.6]} />
        <meshStandardMaterial color="#234B63" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Heavy Spindle Motor Carriage */}
      <mesh position={[0, 1.6, -0.2]}>
        <boxGeometry args={[0.9, 1.1, 0.8]} />
        <meshStandardMaterial color="#E85D25" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Rotating CNC Spindle */}
      <RotatingSpindle isRunning={true} />

      {/* Glass Enclosure Frame */}
      <mesh position={[0, 0.8, 0.9]}>
        <boxGeometry args={[3.0, 2.0, 0.05]} />
        <meshStandardMaterial color="#38BDF8" transparent opacity={0.25} metalness={0.9} roughness={0.05} />
      </mesh>

      {/* Control Console HMI Arm */}
      <group position={[1.7, 0.6, 0.6]} rotation={[0, -0.4, 0]}>
        {/* Support Pillar */}
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 16]} />
          <meshStandardMaterial color="#59656A" metalness={0.7} />
        </mesh>
        {/* Screen Box */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.7, 0.5, 0.1]} />
          <meshStandardMaterial color="#172126" roughness={0.3} />
        </mesh>
        {/* Display Screen */}
        <mesh position={[0, 0.2, 0.06]}>
          <planeGeometry args={[0.6, 0.4]} />
          <meshStandardMaterial color="#234B63" emissive="#234B63" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Interactive 3D Sensor Nodes */}
      {showSensors && (
        <group>
          {/* Spindle Temperature Sensor */}
          <SensorPoint
            position={[0, 1.8, -0.2]}
            label="Spindle Temp"
            value={`${machineData?.temperature || 68.4} °C`}
            status={tempStatus}
          />
          {/* Axis Vibration Sensor */}
          <SensorPoint
            position={[0, 0.0, 0.6]}
            label="Vibration"
            value={`${machineData?.vibration || 2.4} mm/s`}
            status={vibStatus}
          />
          {/* Hydraulic Pressure Sensor */}
          <SensorPoint
            position={[-1.2, 0.1, -0.5]}
            label="Hydraulic Pressure"
            value={`${machineData?.pressure || 4.8} bar`}
            status={pressStatus}
          />
          {/* Spindle RPM Sensor */}
          <SensorPoint
            position={[0, 1.2, 0.3]}
            label="Spindle Speed"
            value={`${machineData?.rpm || 2850} RPM`}
            status="normal"
          />
          {/* Electrical Current Sensor */}
          <SensorPoint
            position={[1.5, 0.6, 0.5]}
            label="Current Load"
            value={`${machineData?.current || 18.4} A`}
            status={currStatus}
          />
        </group>
      )}
    </group>
  );
}

export default function Machine3DViewer({ machineData, height = 'h-[420px]' }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const controlsRef = useRef();

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className={`relative w-full ${height} rounded-lg overflow-hidden border border-industrial-border bg-slate-900 shadow-industrial`}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [4.2, 2.8, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={['#0F172A']} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} color="#38BDF8" />
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#FFF" />

        <IndustrialCNCMachine machineData={machineData} showSensors={showSensors} />

        {/* Floor Grid */}
        <gridHelper args={[20, 20, '#334155', '#1E293B']} position={[0, -1.1, 0]} />

        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          enablePan={true}
          enableZoom={true}
          minDistance={2.5}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />
      </Canvas>

      {/* Floating Header Info */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-700 text-white">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Asset</div>
          <div className="text-sm font-semibold text-white">{machineData?.name || 'CNC-204 Milling Center'}</div>
        </div>
      </div>

      {/* Floating 3D Control Bar */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 text-white">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition ${
            autoRotate ? 'bg-steel-blue text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Toggle Auto Rotation"
        >
          <FiRotateCw className={autoRotate ? 'animate-spin' : ''} />
          <span>Rotate</span>
        </button>

        <button
          onClick={() => setShowSensors(!showSensors)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition ${
            showSensors ? 'bg-industrial-orange text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Toggle 3D Sensor Overlays"
        >
          <FiActivity />
          <span>Sensors</span>
        </button>

        <button
          onClick={handleResetView}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white transition"
          title="Reset Camera"
        >
          <FiEye />
          <span>Reset</span>
        </button>
      </div>

      {/* Quick Telemetry Bar at Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-4 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300">
        <div>
          <span className="text-slate-400">TEMP: </span>
          <span className={`font-mono font-bold ${machineData?.temperature > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
            {machineData?.temperature || 68.4}°C
          </span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          <span className="text-slate-400">VIB: </span>
          <span className={`font-mono font-bold ${machineData?.vibration > 4.5 ? 'text-red-400' : 'text-emerald-400'}`}>
            {machineData?.vibration || 2.4} mm/s
          </span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          <span className="text-slate-400">HEALTH: </span>
          <span className="font-mono font-bold text-white">
            {machineData?.health || 92}%
          </span>
        </div>
      </div>
    </div>
  );
}
