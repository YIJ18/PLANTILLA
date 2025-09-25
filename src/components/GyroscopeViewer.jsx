import React, { useRef, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Box, useProgress, Html } from '@react-three/drei';
import { Rotate3D, Upload, Video, Square } from 'lucide-react';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(1)} % cargado</Html>;
}

const CanSatModel = ({ modelUrl, gyroData }) => {
  const groupRef = useRef();
  const obj = useLoader(OBJLoader, modelUrl);

  const material = new THREE.MeshStandardMaterial({
    color: '#0xffffff',
    metalness: 0.8,
    roughness: 0.2,
  });

  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
    }
  });

  useEffect(() => {
    if (obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      
      obj.position.x = -center.x * scale;
      obj.position.y = -center.y * scale;
      obj.position.z = -center.z * scale;
      obj.scale.set(scale, scale, scale);
    }
  }, [obj]);

  useFrame(() => {
    if (groupRef.current && gyroData) {
      const pitch = THREE.MathUtils.degToRad(gyroData.x || 0);
      const roll = THREE.MathUtils.degToRad(gyroData.y || 0);
      const yaw = THREE.MathUtils.degToRad(gyroData.z || 0);
      groupRef.current.rotation.set(pitch, yaw, roll, 'YXZ');
    }
  });

  return <primitive object={obj} ref={groupRef} />;
};

const GyroscopeViewer = ({ gyroData, modelUrl, onModelUpload, currentFlight, onRecordingStatusChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef();

  const handleModelUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.obj')) {
      const url = URL.createObjectURL(file);
      onModelUpload(url);
      toast({ title: "Modelo 3D cargado", description: "El nuevo modelo se ha cargado correctamente." });
    } else {
      toast({ title: "Error de archivo", description: "Por favor, selecciona un archivo .obj válido.", variant: "destructive" });
    }
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentFlight || 'recording'}_${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      recordedChunksRef.current = [];
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    onRecordingStatusChange(true);
    toast({ title: "Grabación iniciada", description: "La vista 3D se está grabando." });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStatusChange(false);
      toast({ title: "Grabación detenida", description: "El video se está descargando." });
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Rotate3D className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Orientación 3D</h2>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" id="model-upload" accept=".obj" onChange={handleModelUpload} className="hidden" />
          <Button asChild variant="outline" size="sm" className="bg-transparent border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black">
            <label htmlFor="model-upload"><Upload className="w-4 h-4 mr-2" /> Cargar .obj</label>
          </Button>
          {isRecording ? (
            <Button onClick={stopRecording} variant="destructive" size="sm">
              <Square className="w-4 h-4 mr-2" /> Detener
            </Button>
          ) : (
            <Button onClick={startRecording} variant="outline" size="sm" className="bg-transparent border-green-400 text-green-400 hover:bg-green-400 hover:text-black">
              <Video className="w-4 h-4 mr-2" /> Grabar
            </Button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg overflow-hidden flex-grow">
        <Canvas ref={canvasRef} camera={{ position: [3, 3, 3], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
          
          <Suspense fallback={<Loader />}>
            <CanSatModel modelUrl={modelUrl} gyroData={gyroData} />
          </Suspense>
          
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate={false} maxDistance={15} minDistance={1} />
          <gridHelper args={[10, 10, '#444444', '#222222']} />
        </Canvas>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <motion.div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 text-center">
          <div className="text-red-400 text-sm font-semibold">Pitch (X)</div>
          <div className="text-white text-xl font-bold">{(gyroData?.x || 0).toFixed(1)}°</div>
        </motion.div>
        <motion.div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-green-400 text-sm font-semibold">Roll (Y)</div>
          <div className="text-white text-xl font-bold">{(gyroData?.y || 0).toFixed(1)}°</div>
        </motion.div>
        <motion.div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-center">
          <div className="text-blue-400 text-sm font-semibold">Yaw (Z)</div>
          <div className="text-white text-xl font-bold">{(gyroData?.z || 0).toFixed(1)}°</div>
        </motion.div>
      </div>
    </div>
  );
};

export default GyroscopeViewer;