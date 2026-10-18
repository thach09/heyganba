import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GrowthStage, PetId, PetMood, PetQuote } from '../types';
import { PET_DEFINITIONS } from '../petData';
import { create3DFoodModel, create3DPetModel } from './Pet3DModels';

interface Companion3DCanvasProps {
  petId: PetId;
  stage: GrowthStage;
  mood?: PetMood;
  size?: number; // Canvas size in px (e.g. 220)
  interactive?: boolean;
  showSpeechBubble?: boolean;
  onPetClick?: () => void;
  className?: string;
}

export function Companion3DCanvas({
  petId,
  stage,
  mood = 'idle',
  size = 200,
  interactive = true,
  showSpeechBubble = true,
  onPetClick,
  className = '',
}: Companion3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentQuote, setCurrentQuote] = useState<PetQuote>(() => {
    const pet = PET_DEFINITIONS[petId] || PET_DEFINITIONS.panda;
    const quotes = pet?.quotes?.[mood] || PET_DEFINITIONS.panda.quotes.idle;
    return quotes[0] || { zh: '今天一起加油！', vi: 'Hôm nay cùng cố gắng nhé!' };
  });

  // Track quote changes
  useEffect(() => {
    const pet = PET_DEFINITIONS[petId] || PET_DEFINITIONS.panda;
    const quotes = pet?.quotes?.[mood] || PET_DEFINITIONS.panda.quotes.idle;
    if (quotes && quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      queueMicrotask(() => {
        setCurrentQuote(randomQuote);
      });
    }
  }, [mood, petId]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean previous children if any
    container.innerHTML = '';

    const width = size;
    const height = size;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 4.2);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Lighting (Authentic Oriental Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xfff6ea, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2.5, 4, 3);
    scene.add(keyLight);

    // Warm Golden Rim Light (Guochao Gold Glow)
    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    // Jade Fill Light from below
    const fillLight = new THREE.DirectionalLight(0x2e7d6b, 0.6);
    fillLight.position.set(0, -2, 2);
    scene.add(fillLight);

    // 3. 3D Pet Model
    const petModelGroup = create3DPetModel(petId, stage);
    scene.add(petModelGroup);

    // Optional 3D Food Item (drops down when eating)
    let foodMesh: THREE.Group | null = null;
    if (mood === 'eating') {
      const petDef = PET_DEFINITIONS[petId];
      foodMesh = create3DFoodModel(petDef.foodIcon || 'bamboo');
      foodMesh.position.set(0, 2.2, 0.8);
      scene.add(foodMesh);
    }

    // 4. Interactive Drag & Spin Variables
    let isDragging = false;
    let prevMouseX = 0;
    let rotationY = 0.35;
    let targetRotationY = 0.35;
    let squashY = 1;
    let squashVel = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      prevMouseX = clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - prevMouseX;
      targetRotationY += deltaX * 0.012;
      prevMouseX = clientX;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      if (!interactive) return;
      // Trigger 3D Squash bounce
      squashVel = -0.35;

      // Pick new quote
      const pet = PET_DEFINITIONS[petId] || PET_DEFINITIONS.panda;
      const quotes = pet?.quotes?.[mood] || PET_DEFINITIONS.panda.quotes.idle;
      if (quotes && quotes.length > 0) {
        setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      }

      if (onPetClick) {
        onPetClick();
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
    dom.addEventListener('click', onClick);

    // 5. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth Rotation Damping
      if (!isDragging) {
        // Slow gentle idle auto-turn
        targetRotationY += 0.003;
      }
      rotationY += (targetRotationY - rotationY) * 0.08;
      petModelGroup.rotation.y = rotationY;

      // Floating Bobbing & Breathing
      const floatOffset = Math.sin(elapsed * 2.4) * 0.05;
      const breathScale = 1 + Math.sin(elapsed * 3.2) * 0.012;

      // Squash and stretch physics
      squashY += squashVel;
      squashVel += (1 - squashY) * 0.25;
      squashVel *= 0.72; // friction damping

      petModelGroup.position.y = -0.15 + floatOffset;
      petModelGroup.scale.set(
        breathScale * (1 / Math.sqrt(Math.max(0.2, squashY))),
        squashY * breathScale,
        breathScale * (1 / Math.sqrt(Math.max(0.2, squashY)))
      );

      // Handle Food animation during eating mood
      if (foodMesh) {
        foodMesh.position.y = Math.max(0.8, foodMesh.position.y - 0.025);
        foodMesh.rotation.y += 0.04;
        foodMesh.rotation.x += 0.02;
        if (foodMesh.position.y <= 0.85) {
          foodMesh.scale.multiplyScalar(0.92);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, [petId, stage, mood, size, interactive, onPetClick]);

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Speech Bubble */}
      {showSpeechBubble && (
        <div
          className={`pointer-events-none mb-2 max-w-[210px] rounded-xl border border-rule bg-card/95 px-3 py-1.5  backdrop-blur-md transition-all duration-300 ${
            mood === 'happy' ? 'border-gold/60 ' : ''
          }`}
        >
          <p className="font-serif text-[12.5px] font-medium tracking-wide text-fg">
            {currentQuote.zh}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-tight text-fg-60">
            {currentQuote.vi}
          </p>
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b border-rule bg-card" />
        </div>
      )}

      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        title="Bấm hoặc kéo để tương tác với Linh Thú 3D"
        className={`relative cursor-grab active:cursor-grabbing transition-transform duration-200 active:scale-95 ${
          interactive ? 'hover:scale-105' : ''
        }`}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export default Companion3DCanvas;
