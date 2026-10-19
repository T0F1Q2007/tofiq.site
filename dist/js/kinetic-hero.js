/**
 * KINETIC HERO 3D ENGINE — js/kinetic-hero.js
 * Spatial Layer 3: Interactive Three.js WebGL Cybernetic Particle Constellation
 * Features:
 *  - Dual-layer geometry: Wireframe geodesic icosahedron core + 1,400+ particle constellation field
 *  - Smooth cursor velocity & inertia damping
 *  - DevicePixelRatio clamping & ResizeObserver responsiveness
 *  - IntersectionObserver lifecycle management (pauses GPU loop when offscreen)
 *  - Graceful 2D Canvas fallback if WebGL or Three.js CDN is blocked
 */

(function () {
  'use strict';

  const canvas = document.getElementById('kineticHeroCanvas');
  const wrapper = document.getElementById('heroCanvasWrapper');
  if (!canvas || !wrapper) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pointer tracking state with spring-damped inertia
  const pointer = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    velocityX: 0,
    velocityY: 0
  };

  let isHeroVisible = true;
  let animationFrameId = null;

  /**
   * Initialize Three.js WebGL Scene if available, otherwise fallback to 2D Canvas
   */
  function initSpatialHero() {
    if (typeof window.THREE === 'undefined') {
      initCanvas2DFallback();
      return;
    }

    let renderer;
    try {
      renderer = new window.THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      initCanvas2DFallback();
      return;
    }

    const THREE = window.THREE;
    const scene = new THREE.Scene();

    const width = wrapper.clientWidth || window.innerWidth;
    const height = wrapper.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 26;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);

    // Master Root Group for Parallax Rotation
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Cybernetic Wireframe Icosahedron Core
    const coreGeo = new THREE.IcosahedronGeometry(7.5, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.13
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // 2. Inner Counter-Rotating Emerald Octahedron
    const innerGeo = new THREE.OctahedronGeometry(4.2, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    rootGroup.add(innerMesh);

    // 3. Spatial Particle Constellation Field
    const isLowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || width < 768;
    const particleCount = isLowPower ? 650 : 1450;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorCyan = new THREE.Color(0x06b6d4);
    const colorEmerald = new THREE.Color(0x10b981);
    const colorWhite = new THREE.Color(0xf8fafc);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Spherical Fibonacci / Shell distribution
      const radius = 6 + Math.pow(Math.random(), 0.75) * 22;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const mixChoice = Math.random();
      const chosenColor = mixChoice < 0.48 ? colorCyan : mixChoice < 0.85 ? colorEmerald : colorWhite;
      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: isLowPower ? 0.11 : 0.095,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    rootGroup.add(particleSystem);

    // Pointer Interaction Listeners
    function onPointerMove(e) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const nx = (clientX / window.innerWidth) * 2 - 1;
      const ny = -(clientY / window.innerHeight) * 2 + 1;

      pointer.velocityX = nx - pointer.targetX;
      pointer.velocityY = ny - pointer.targetY;
      pointer.targetX = nx;
      pointer.targetY = ny;
    }

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    // Responsive Resize Observer
    function handleResize() {
      const newWidth = wrapper.clientWidth || window.innerWidth;
      const newHeight = wrapper.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(wrapper);
    } else {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    // Pause WebGL loop when scrolled out of viewport
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            isHeroVisible = entry.isIntersecting;
            if (isHeroVisible && !animationFrameId && !prefersReducedMotion) {
              clock.getDelta();
              renderLoop();
            }
          });
        },
        { threshold: 0.02 }
      );
      observer.observe(wrapper);
    }

    const clock = new THREE.Clock();

    function renderLoop() {
      if (!isHeroVisible) {
        animationFrameId = null;
        return;
      }

      const elapsedTime = clock.getElapsedTime();

      // Smooth inertial damping (Emil Kowalski spring ethos)
      pointer.currentX += (pointer.targetX - pointer.currentX) * 0.055;
      pointer.currentY += (pointer.targetY - pointer.currentY) * 0.055;

      // Continuous orbital drift + pointer parallax
      coreMesh.rotation.y = elapsedTime * 0.11 + pointer.currentX * 0.45;
      coreMesh.rotation.x = elapsedTime * 0.07 - pointer.currentY * 0.35;

      innerMesh.rotation.y = -elapsedTime * 0.18 - pointer.currentX * 0.3;
      innerMesh.rotation.z = elapsedTime * 0.12 + pointer.currentY * 0.3;

      particleSystem.rotation.y = elapsedTime * 0.038 + pointer.currentX * 0.25;
      particleSystem.rotation.x = -pointer.currentY * 0.18;

      // Subtle breathing scale on core wireframe
      const pulse = 1 + Math.sin(elapsedTime * 1.4) * 0.035;
      coreMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(renderLoop);
      }
    }

    // Render initial frame immediately
    renderLoop();
  }

  /**
   * Graceful 2D Canvas Fallback if WebGL or CDN is unavailable
   */
  function initCanvas2DFallback() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = wrapper.clientWidth || window.innerWidth);
    let height = (canvas.height = wrapper.clientHeight || window.innerHeight);

    const nodes = Array.from({ length: 65 }, function () {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.8,
        color: Math.random() > 0.5 ? '#06b6d4' : '#10b981'
      };
    });

    function drawFallback() {
      if (!isHeroVisible) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        window.requestAnimationFrame(drawFallback);
      }
    }

    drawFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpatialHero);
  } else {
    initSpatialHero();
  }
})();