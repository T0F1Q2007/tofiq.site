/**
 * MasterSpatialEngine // Gemini 4 Argon (Commit e2d7cbf Restored + 120fps Compositor Engine)
 * ------------------------------------------------------------------------------------------
 * - Unified Hero Spatial Deck: 3D WebGL viewport seamlessly merged with 4-style Avatar Chassis.
 * - Full Kinetic Suite: Fluid Magnetic Cursor with dynamic labels, Aceternity 3D Perspective
 *   Tilt Cards with multi-layer translateZ, Perimeter Border Beam, Reveal Sheen Sweeps,
 *   Scroll-Coupled Three.js Centerpiece, Velocity Skew, Mobile Touch Ripples & Gyroscope 3D.
 * - 120fps Hardware Acceleration: Single synchronized RAF loop, GPU-translated spotlight,
 *   compositor scaleX progress bar, and IntersectionObserver offscreen WebGL culling.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* =========================================================================
     1. DOM REFERENCES & ENGINE STATE
     ========================================================================= */
  const dom = {
    progressBar: document.getElementById('scroll-progress-bar'),
    spotlight: document.getElementById('ambient-spotlight'),
    cursorDot: document.getElementById('cursor-dot'),
    cursorRing: document.getElementById('cursor-ring'),
    cursorLabel: document.getElementById('cursor-label'),
    hudScr: document.getElementById('hud-scr'),
    hudVel: document.getElementById('hud-vel'),
    hudGyro: document.getElementById('hud-gyro'),
    gyroToggleBtn: document.getElementById('btn-gyro-toggle'),
    gyroToggleLabel: document.getElementById('gyro-toggle-label'),
    webglStage: document.getElementById('webgl-stage'),
    webglCanvas: document.getElementById('hero-webgl-canvas'),
    geoButtons: document.querySelectorAll('.geo-mode-btn'),
    avatarViewport: document.getElementById('avatar-viewport'),
    avatarLayers: document.querySelectorAll('.avatar-render-layer'),
    avatarStyleButtons: document.querySelectorAll('.style-switch-btn'),
    tiltCards: Array.from(document.querySelectorAll('[data-tilt-card="true"]')),
    skewNodes: Array.from(document.querySelectorAll('.velocity-skew-node')),
    magneticNodes: Array.from(document.querySelectorAll('[data-magnetic]')),
    tactileTargets: Array.from(document.querySelectorAll('.tactile-target')),
    copyEmailBtn: document.getElementById('btn-copy-email'),
    copyWaHandleBtn: document.getElementById('btn-copy-wa-handle'),
    copyWaPinBtn: document.getElementById('btn-copy-wa-pin'),
    printCvBtn: document.getElementById('btn-print-cv'),
    backToTopBtn: document.getElementById('btn-back-to-top'),
    toastBanner: document.getElementById('toast-banner'),
    toastText: document.getElementById('toast-text')
  };

  // Per-card 3D tilt state for smooth spring interpolation inside Master RAF
  const cardStates = dom.tiltCards.map((el) => ({
    el,
    targetRotX: 0,
    targetRotY: 0,
    currentRotX: 0,
    currentRotY: 0,
    isHovered: false
  }));

  const state = {
    scrollY: window.scrollY || 0,
    maxScroll: Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
    progress: 0,
    rawVelocity: 0,
    smoothVelocity: 0,

    // Cursor & Spotlight Coordinates
    pointerX: window.innerWidth * 0.5,
    pointerY: window.innerHeight * 0.3,
    ringX: window.innerWidth * 0.5,
    ringY: window.innerHeight * 0.3,
    spotX: window.innerWidth * 0.5,
    spotY: window.innerHeight * 0.3,
    pointerMoved: false,

    // 3D Motion & Mobile Gyroscope State
    motionEnabled: !prefersReducedMotion,
    gyroActive: false,
    gyroBeta: 0,
    gyroGamma: 0,
    smoothGyroX: 0,
    smoothGyroY: 0,

    // WebGL Culling & Geometry State
    isWebGLVisible: true,
    geometryMode: 'torusKnot',
    lastTime: performance.now()
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /* =========================================================================
     2. LENIS SMOOTH MOMENTUM SCROLLING
     ========================================================================= */
  let lenis = null;

  function initLenis() {
    if (prefersReducedMotion || typeof window.Lenis === 'undefined') {
      window.addEventListener(
        'scroll',
        () => {
          state.scrollY = window.scrollY || window.pageYOffset;
          state.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          state.progress = clamp(state.scrollY / state.maxScroll, 0, 1);
        },
        { passive: true }
      );
      return;
    }

    lenis = new window.Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2
    });

    lenis.on('scroll', (e) => {
      state.scrollY = e.scroll;
      state.maxScroll = Math.max(1, e.limit);
      state.progress = clamp(e.progress, 0, 1);
      state.rawVelocity = e.velocity || 0;
    });
  }

  /* =========================================================================
     3. SCROLL-COUPLED THREE.JS WEBGL CENTERPIECE + OFFSCREEN CULLING
     ========================================================================= */
  let webgl = null;

  function createGeometry(mode) {
    if (typeof window.THREE === 'undefined') return null;
    const THREE = window.THREE;
    switch (mode) {
      case 'octahedron':
        return new THREE.OctahedronGeometry(1.38, 2);
      case 'helixTorus':
        return new THREE.TorusKnotGeometry(1.06, 0.22, 160, 24, 3, 5);
      case 'torusKnot':
      default:
        return new THREE.TorusKnotGeometry(1.02, 0.28, 150, 22, 2, 3);
    }
  }

  function initWebGL() {
    if (!dom.webglCanvas || !dom.webglStage || typeof window.THREE === 'undefined') return;
    const THREE = window.THREE;

    const scene = new THREE.Scene();
    const rect = dom.webglStage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const renderer = new THREE.WebGLRenderer({
      canvas: dom.webglCanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    // Outer Wireframe Centerpiece
    const mainGeo = createGeometry(state.geometryMode);
    const mainMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.46
    });
    const mainMesh = new THREE.Mesh(mainGeo, mainMat);
    scene.add(mainMesh);

    // Inner Counter-Rotating Geodesic Core
    const coreGeo = new THREE.IcosahedronGeometry(0.54, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.72
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Spatial Starfield Particles
    const particleCount = 280;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 1.7 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.028,
      transparent: true,
      opacity: 0.65
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    webgl = {
      scene,
      camera,
      renderer,
      mainMesh,
      coreMesh,
      particles,
      morphScale: 1
    };

    // Offscreen WebGL Culling via IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          state.isWebGLVisible = entry.isIntersecting;
        }
      },
      { root: null, threshold: 0.01 }
    );
    observer.observe(dom.webglStage);
  }

  function setGeometryMode(mode) {
    if (!webgl || mode === state.geometryMode) return;
    state.geometryMode = mode;

    const prevGeo = webgl.mainMesh.geometry;
    const nextGeo = createGeometry(mode);
    if (nextGeo) {
      webgl.mainMesh.geometry = nextGeo;
      if (prevGeo) prevGeo.dispose();
      webgl.morphScale = 0.7;
    }

    const palette = {
      torusKnot: 0x38bdf8,
      octahedron: 0x10b981,
      helixTorus: 0x818cf8
    };
    webgl.mainMesh.material.color.setHex(palette[mode] || 0x38bdf8);
  }

  /* =========================================================================
     4. UNIFIED MASTER RAF LOOP (120FPS COMPOSITOR PIPELINE)
     ========================================================================= */
  function masterRAF(now) {
    const rawDt = (now - state.lastTime) * 0.001;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    state.lastTime = now;

    // 1. Step Lenis Smooth Scroll
    if (lenis) {
      lenis.raf(now);
    } else {
      state.rawVelocity *= 0.85;
    }

    // Exponential velocity damping
    const velDecay = 1 - Math.exp(-14 * dt);
    state.smoothVelocity += (state.rawVelocity - state.smoothVelocity) * velDecay;

    // 2. Update Top Hairline Progress Bar via GPU scaleX
    if (dom.progressBar) {
      dom.progressBar.style.transform = `scaleX(${state.progress.toFixed(4)})`;
    }

    // 3. Update Telemetry HUD Readouts
    if (dom.hudScr) {
      const pct = String(Math.round(state.progress * 100)).padStart(3, '0');
      dom.hudScr.textContent = `${pct}%`;
    }
    if (dom.hudVel) {
      dom.hudVel.textContent = Math.abs(state.smoothVelocity).toFixed(2);
    }

    // 4. Update Custom Magnetic Cursor & GPU-Translated Ambient Spotlight
    if (!isCoarsePointer && state.pointerMoved) {
      const ringAlpha = 1 - Math.exp(-18 * dt);
      const spotAlpha = 1 - Math.exp(-9 * dt);

      state.ringX += (state.pointerX - state.ringX) * ringAlpha;
      state.ringY += (state.pointerY - state.ringY) * ringAlpha;
      state.spotX += (state.pointerX - state.spotX) * spotAlpha;
      state.spotY += (state.pointerY - state.spotY) * spotAlpha;

      if (dom.cursorDot) {
        dom.cursorDot.style.transform = `translate3d(${state.pointerX.toFixed(1)}px, ${state.pointerY.toFixed(1)}px, 0)`;
      }
      if (dom.cursorRing) {
        dom.cursorRing.style.transform = `translate3d(${state.ringX.toFixed(1)}px, ${state.ringY.toFixed(1)}px, 0)`;
      }
      if (dom.spotlight) {
        // Translate spotlight center (-400px offset for 800x800 element)
        dom.spotlight.style.transform = `translate3d(${(state.spotX - 400).toFixed(1)}px, ${(state.spotY - 400).toFixed(1)}px, 0)`;
      }
    }

    // 5. Smooth Gyroscope Interpolation
    const gyroAlpha = 1 - Math.exp(-8 * dt);
    state.smoothGyroX += (state.gyroGamma - state.smoothGyroX) * gyroAlpha;
    state.smoothGyroY += (state.gyroBeta - state.smoothGyroY) * gyroAlpha;

    // 6. Apply Velocity-Reactive Skew & Aceternity 3D Perspective Card Tilt
    const skewY = state.motionEnabled ? clamp(state.smoothVelocity * 0.06, -2.4, 2.4) : 0;
    const tiltAlpha = 1 - Math.exp(-14 * dt);

    if (dom.skewNodes.length > 0 && dom.skewNodes[0]) {
      // Hero Spatial Deck velocity skew
      dom.skewNodes[0].style.transform = `translate3d(0, 0, 0) skewY(${(skewY * 0.45).toFixed(2)}deg)`;
    }

    for (let i = 0; i < cardStates.length; i++) {
      const c = cardStates[i];
      let goalX = c.targetRotX;
      let goalY = c.targetRotY;

      if (state.motionEnabled && state.gyroActive && !c.isHovered) {
        goalX = clamp(state.smoothGyroY * 0.35, -7, 7);
        goalY = clamp(state.smoothGyroX * 0.35, -7, 7);
      } else if (!state.motionEnabled) {
        goalX = 0;
        goalY = 0;
      }

      c.currentRotX += (goalX - c.currentRotX) * tiltAlpha;
      c.currentRotY += (goalY - c.currentRotY) * tiltAlpha;

      c.el.style.transform = `perspective(1200px) rotateX(${c.currentRotX.toFixed(2)}deg) rotateY(${c.currentRotY.toFixed(2)}deg) skewY(${skewY.toFixed(2)}deg) translate3d(0, 0, 0)`;
    }

    // 7. Scroll-Coupled Three.js Render (Only when visible in viewport)
    if (webgl && state.isWebGLVisible) {
      const { renderer, scene, camera, mainMesh, coreMesh, particles } = webgl;

      webgl.morphScale += (1 - webgl.morphScale) * (1 - Math.exp(-12 * dt));
      mainMesh.scale.setScalar(webgl.morphScale);

      const baseSpeed = state.motionEnabled ? 0.45 : 0.05;
      const scrollBoost = state.motionEnabled ? Math.abs(state.smoothVelocity) * 0.035 : 0;
      const angularVel = baseSpeed + scrollBoost;

      mainMesh.rotation.x += angularVel * dt;
      mainMesh.rotation.y += angularVel * 1.3 * dt;

      coreMesh.rotation.x -= angularVel * 0.85 * dt;
      coreMesh.rotation.z += angularVel * 1.15 * dt;

      particles.rotation.y += 0.09 * dt;

      // Scroll-coupled camera depth & pitch
      const targetCamZ = 4.5 - Math.min(0.65, state.progress * 1.4);
      camera.position.z += (targetCamZ - camera.position.z) * (1 - Math.exp(-8 * dt));

      // Pointer + Gyroscope 3D spatial parallax on scene
      const pointerNormX = (state.pointerX / Math.max(1, window.innerWidth) - 0.5) * 0.55;
      const pointerNormY = (state.pointerY / Math.max(1, window.innerHeight) - 0.5) * 0.55;
      const targetSceneY = pointerNormX + (state.gyroActive ? state.smoothGyroX * 0.03 : 0);
      const targetSceneX = pointerNormY + (state.gyroActive ? state.smoothGyroY * 0.03 : 0);

      scene.rotation.y += (targetSceneY - scene.rotation.y) * (1 - Math.exp(-6 * dt));
      scene.rotation.x += (targetSceneX - scene.rotation.x) * (1 - Math.exp(-6 * dt));

      renderer.render(scene, camera);
    }

    requestAnimationFrame(masterRAF);
  }

  /* =========================================================================
     5. INTERACTIONS: CURSOR LABELS, 3D CARD TILT, RIPPLES, SWITCHERS & GYRO
     ========================================================================= */
  let toastTimeout = null;

  function triggerToast(text) {
    if (!dom.toastBanner || !dom.toastText) return;
    dom.toastText.textContent = text;
    dom.toastBanner.classList.add('is-visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      dom.toastBanner.classList.remove('is-visible');
    }, 2600);
  }

  async function copyClipboard(value, message) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      triggerToast(message);
    } catch (_) {
      triggerToast(`Copied: ${value}`);
    }
  }

  function setupInteractions() {
    // Pointer move tracking
    window.addEventListener(
      'pointermove',
      (e) => {
        state.pointerX = e.clientX;
        state.pointerY = e.clientY;
        state.pointerMoved = true;
      },
      { passive: true }
    );

    // Dynamic Cursor Ring Expansion + Contextual Labels
    if (!isCoarsePointer) {
      const labeledElements = document.querySelectorAll('[data-cursor-label]');
      labeledElements.forEach((el) => {
        el.addEventListener('pointerenter', () => {
          const labelText = el.getAttribute('data-cursor-label') || '';
          if (dom.cursorLabel) dom.cursorLabel.textContent = labelText;
          if (dom.cursorRing && labelText) dom.cursorRing.classList.add('is-expanded');
        });
        el.addEventListener('pointerleave', () => {
          if (dom.cursorRing) dom.cursorRing.classList.remove('is-expanded');
        });
      });

      // Magnetic button attraction
      dom.magneticNodes.forEach((node) => {
        const pull = parseFloat(node.getAttribute('data-magnetic') || '0.2');
        node.addEventListener('pointermove', (e) => {
          if (!state.motionEnabled) return;
          const rect = node.getBoundingClientRect();
          const dx = (e.clientX - (rect.left + rect.width * 0.5)) * pull;
          const dy = (e.clientY - (rect.top + rect.height * 0.5)) * pull;
          node.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        });
        node.addEventListener('pointerleave', () => {
          node.style.transform = 'translate3d(0, 0, 0)';
        });
      });
    }

    // Aceternity 3D Perspective Tilt Calculation per Card
    cardStates.forEach((c) => {
      c.el.addEventListener('pointerenter', () => {
        c.isHovered = true;
      });
      c.el.addEventListener('pointermove', (e) => {
        if (!state.motionEnabled || isCoarsePointer) return;
        const rect = c.el.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const normY = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        c.targetRotX = clamp(-normY * 11, -8, 8);
        c.targetRotY = clamp(normX * 11, -8, 8);
      });
      c.el.addEventListener('pointerleave', () => {
        c.isHovered = false;
        c.targetRotX = 0;
        c.targetRotY = 0;
      });
    });

    // Tactile Touch Ripples & Haptic Spring Compression
    dom.tactileTargets.forEach((target) => {
      target.addEventListener('pointerdown', (e) => {
        target.classList.add('is-pressed');
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 0.55;
        const ripple = document.createElement('span');
        ripple.className = 'tactile-ripple';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size * 0.5}px`;
        ripple.style.top = `${e.clientY - rect.top - size * 0.5}px`;
        target.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      });

      const releasePress = () => target.classList.remove('is-pressed');
      target.addEventListener('pointerup', releasePress);
      target.addEventListener('pointerleave', releasePress);
      target.addEventListener('pointercancel', releasePress);
    });

    // 3D Geometry Switcher (Torus Knot, Cyber Octa, Helix Torus)
    dom.geoButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-geo-mode') || 'torusKnot';
        dom.geoButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        setGeometryMode(mode);
      });
    });

    // Avatar 4-Style Cross-Fade Switcher (Original, Cyber Color, Matrix Emerald, Monolith Mono)
    dom.avatarStyleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetMode = btn.getAttribute('data-avatar-mode') || 'original';

        dom.avatarStyleButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-checked', active ? 'true' : 'false');
        });

        if (dom.avatarViewport) {
          dom.avatarViewport.classList.remove(
            'mode-original',
            'mode-cyber',
            'mode-emerald',
            'mode-mono'
          );
          dom.avatarViewport.classList.add(`mode-${targetMode}`);
        }

        // Cross-fade image layers; if a specific render file is missing offline, gracefully filter the available portrait
        let matchedValidLayer = false;
        dom.avatarLayers.forEach((img) => {
          const isMatch = img.getAttribute('data-style-id') === targetMode;
          const isBroken = img.dataset.broken === 'true';
          if (isMatch && !isBroken) {
            matchedValidLayer = true;
            img.classList.add('is-active');
          } else {
            img.classList.remove('is-active');
          }
        });

        if (!matchedValidLayer && dom.avatarLayers.length > 0) {
          const primaryImg = dom.avatarLayers[0];
          if (primaryImg.dataset.broken !== 'true') {
            primaryImg.classList.add('is-active');
          }
        }
      });
    });

    // Mobile Gyroscope 3D Parallax & 3D MOTION Toggle
    function attachGyroListener() {
      window.addEventListener(
        'deviceorientation',
        (e) => {
          if (!state.motionEnabled) return;
          if (e.gamma !== null && e.beta !== null) {
            state.gyroActive = true;
            state.gyroGamma = clamp(e.gamma * 0.35, -14, 14);
            state.gyroBeta = clamp((e.beta - 45) * 0.35, -14, 14);
            if (dom.hudGyro) dom.hudGyro.textContent = 'LOCK';
          }
        },
        { passive: true }
      );
    }

    if (typeof window.DeviceOrientationEvent !== 'undefined' && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
      attachGyroListener();
    }

    if (dom.gyroToggleBtn) {
      dom.gyroToggleBtn.addEventListener('click', async () => {
        if (
          typeof window.DeviceOrientationEvent !== 'undefined' &&
          typeof window.DeviceOrientationEvent.requestPermission === 'function' &&
          !state.gyroActive
        ) {
          try {
            const res = await window.DeviceOrientationEvent.requestPermission();
            if (res === 'granted') attachGyroListener();
          } catch (_) {
            // Permission declined or unavailable
          }
        }

        state.motionEnabled = !state.motionEnabled;
        dom.gyroToggleBtn.setAttribute('aria-pressed', state.motionEnabled ? 'true' : 'false');
        if (dom.gyroToggleLabel) {
          dom.gyroToggleLabel.textContent = state.motionEnabled ? '3D MOTION: ON' : '3D MOTION: OFF';
        }
        if (dom.hudGyro) {
          dom.hudGyro.textContent = state.motionEnabled ? (state.gyroActive ? 'LOCK' : 'SYNC') : 'OFF';
        }
      });
    }

    // Direct Copy & Utility Endpoints
    if (dom.copyWaHandleBtn) {
      dom.copyWaHandleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyClipboard('@velizadetofiq1', 'WhatsApp handle @velizadetofiq1 copied (PIN: 4458)');
      });
    }

    if (dom.copyWaPinBtn) {
      dom.copyWaPinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyClipboard(
          'WhatsApp Handle: @velizadetofiq1 | Verification PIN: 4458',
          'Copied @velizadetofiq1 + Verification PIN 4458'
        );
      });
    }

    if (dom.copyEmailBtn) {
      dom.copyEmailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyClipboard('velizadetofiq1@gmail.com', 'Email copied: velizadetofiq1@gmail.com');
      });
    }

    if (dom.printCvBtn) {
      dom.printCvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.print();
      });
    }

    if (dom.backToTopBtn) {
      dom.backToTopBtn.addEventListener('click', () => {
        if (lenis) {
          lenis.scrollTo(0);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Resize Observer / Window Resize
    window.addEventListener(
      'resize',
      () => {
        state.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        if (webgl && dom.webglStage) {
          const rect = dom.webglStage.getBoundingClientRect();
          const w = Math.max(1, rect.width);
          const h = Math.max(1, rect.height);
          webgl.camera.aspect = w / h;
          webgl.camera.updateProjectionMatrix();
          webgl.renderer.setSize(w, h, false);
        }
      },
      { passive: true }
    );
  }

  /* =========================================================================
     6. BOOTSTRAP
     ========================================================================= */
  function init() {
    initLenis();
    initWebGL();
    setupInteractions();
    requestAnimationFrame(masterRAF);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();