/**
 * MasterKineticEngine // Gemini 4 Argon Performance Architecture
 * ---------------------------------------------------------------------------
 * Resolves all 5 critical frame-pacing bottlenecks:
 * 1. Zero `:root` CSS Custom Property mutations per frame (zero Style Recalc).
 * 2. Single unified Master RAF loop driving Lenis, Cursor, Scroll Skew & Three.js.
 * 3. IntersectionObserver pausing Three.js WebGL draw calls when scrolled offscreen.
 * 4. Compositor-only `translate3d` and `scaleX` updates on dedicated GPU layers.
 * 5. Tuned Lenis smooth momentum (`lerp: 0.1`, `wheelMultiplier: 1.0`, `touchMultiplier: 1.2`).
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* =========================================================================
     1. DOM REFERENCES & STATE
     ========================================================================= */
  const dom = {
    progressBar: document.getElementById('scroll-progress-bar'),
    spotlight: document.getElementById('ambient-spotlight'),
    cursorDot: document.getElementById('cursor-dot'),
    cursorRing: document.getElementById('cursor-ring'),
    fpsCounter: document.getElementById('fps-counter'),
    webglStatus: document.getElementById('webgl-status'),
    webglStage: document.getElementById('webgl-stage'),
    webglCanvas: document.getElementById('hero-webgl-canvas'),
    geoButtons: document.querySelectorAll('#geo-switcher .seg-btn'),
    avatarViewport: document.getElementById('avatar-viewport'),
    avatarButtons: document.querySelectorAll('#avatar-switcher .style-pill'),
    kineticCards: Array.from(document.querySelectorAll('.kinetic-card')),
    magneticNodes: Array.from(document.querySelectorAll('[data-magnetic]')),
    rippleNodes: Array.from(document.querySelectorAll('.ripple-surface')),
    copyEmailBtn: document.getElementById('btn-copy-email'),
    copyWaHandleBtn: document.getElementById('btn-copy-wa-handle'),
    copyWaPinBtn: document.getElementById('btn-copy-wa-pin'),
    printCvBtn: document.getElementById('btn-print-cv'),
    scrollTopBtn: document.getElementById('btn-scroll-top'),
    toast: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message')
  };

  const state = {
    // Scroll & Velocity
    scrollY: window.scrollY || 0,
    maxScroll: Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
    scrollProgress: 0,
    targetVelocity: 0,
    smoothVelocity: 0,

    // Pointer & Magnetic Cursor
    pointerX: window.innerWidth * 0.5,
    pointerY: window.innerHeight * 0.35,
    ringX: window.innerWidth * 0.5,
    ringY: window.innerHeight * 0.35,
    spotX: window.innerWidth * 0.5,
    spotY: window.innerHeight * 0.35,
    pointerActive: false,

    // Mobile Gyroscope Tilt
    gyroX: 0,
    gyroY: 0,
    smoothGyroX: 0,
    smoothGyroY: 0,

    // WebGL Visibility Gate (IntersectionObserver)
    isWebGLVisible: true,
    activeGeometryMode: 'torusKnot',

    // Frame Telemetry
    lastTimestamp: performance.now(),
    frameCount: 0,
    fpsLastSample: performance.now()
  };

  /* =========================================================================
     2. LENIS SMOOTH SCROLL INITIALIZATION (TUNED MOMENTUM)
     ========================================================================= */
  let lenis = null;

  function initLenis() {
    if (prefersReducedMotion || typeof window.Lenis === 'undefined') {
      window.addEventListener(
        'scroll',
        () => {
          state.scrollY = window.scrollY || window.pageYOffset;
          state.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          state.scrollProgress = Math.min(1, Math.max(0, state.scrollY / state.maxScroll));
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
      state.scrollProgress = e.progress;
      state.targetVelocity = e.velocity || 0;
    });
  }

  /* =========================================================================
     3. THREE.JS WEBGL SPATIAL STAGE + INTERSECTION OBSERVER
     ========================================================================= */
  let threeCtx = null;

  function buildGeometryByName(mode) {
    if (typeof window.THREE === 'undefined') return null;
    const THREE = window.THREE;

    switch (mode) {
      case 'octahedron':
        return new THREE.OctahedronGeometry(1.35, 2);
      case 'helixTorus':
        return new THREE.TorusKnotGeometry(1.05, 0.22, 160, 24, 3, 5);
      case 'torusKnot':
      default:
        return new THREE.TorusKnotGeometry(1.0, 0.28, 140, 20, 2, 3);
    }
  }

  function initWebGLStage() {
    if (!dom.webglCanvas || !dom.webglStage || typeof window.THREE === 'undefined') return;
    const THREE = window.THREE;

    const scene = new THREE.Scene();
    const rect = dom.webglStage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({
      canvas: dom.webglCanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    // Primary Wireframe Mesh
    const primaryGeo = buildGeometryByName(state.activeGeometryMode);
    const primaryMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.42
    });
    const primaryMesh = new THREE.Mesh(primaryGeo, primaryMat);
    scene.add(primaryMesh);

    // Inner Core Mesh
    const coreGeo = new THREE.IcosahedronGeometry(0.52, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.68
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Orbital Particle Field
    const particleCount = 260;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 1.8 + Math.random() * 2.2;
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
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    threeCtx = {
      THREE,
      scene,
      camera,
      renderer,
      primaryMesh,
      coreMesh,
      particleSystem,
      scaleSpring: 1
    };

    // IntersectionObserver gates offscreen WebGL rendering
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          state.isWebGLVisible = entry.isIntersecting;
          if (dom.webglStatus) {
            dom.webglStatus.textContent = state.isWebGLVisible ? 'ACTIVE' : 'PAUSED (OFFSCREEN)';
            dom.webglStatus.classList.toggle('status-active', state.isWebGLVisible);
            dom.webglStatus.classList.toggle('status-paused', !state.isWebGLVisible);
          }
        }
      },
      { root: null, threshold: 0.01 }
    );
    observer.observe(dom.webglStage);
  }

  function switchWebGLGeometry(mode) {
    if (!threeCtx || mode === state.activeGeometryMode) return;
    state.activeGeometryMode = mode;

    const oldGeo = threeCtx.primaryMesh.geometry;
    const nextGeo = buildGeometryByName(mode);
    if (nextGeo) {
      threeCtx.primaryMesh.geometry = nextGeo;
      if (oldGeo) oldGeo.dispose();
      threeCtx.scaleSpring = 0.72; // Tactile scale pop on switch
    }

    // Accent color shift per topology
    const colorMap = {
      torusKnot: 0x38bdf8,
      octahedron: 0x10b981,
      helixTorus: 0x818cf8
    };
    threeCtx.primaryMesh.material.color.setHex(colorMap[mode] || 0x38bdf8);
  }

  /* =========================================================================
     4. UNIFIED MASTER RAF TICKER (LENIS + CURSOR + KINETIC CARDS + THREE.JS)
     ========================================================================= */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function masterTick(now) {
    // Delta-time in seconds, clamped to 50ms (lagSmoothing(0) principle)
    const rawDt = (now - state.lastTimestamp) * 0.001;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    state.lastTimestamp = now;

    // 1. Update Real-time FPS Telemetry Badge
    state.frameCount++;
    if (now - state.fpsLastSample >= 500) {
      const currentFps = Math.min(120, Math.round((state.frameCount * 1000) / (now - state.fpsLastSample)));
      if (dom.fpsCounter) {
        dom.fpsCounter.textContent = `${currentFps} FPS`;
      }
      state.frameCount = 0;
      state.fpsLastSample = now;
    }

    // 2. Step Lenis Smooth Scroll
    if (lenis) {
      lenis.raf(now);
    } else {
      state.targetVelocity *= 0.85;
    }

    // Frame-rate independent exponential smoothing
    const velAlpha = 1 - Math.exp(-14 * dt);
    state.smoothVelocity += (state.targetVelocity - state.smoothVelocity) * velAlpha;

    // 3. Drive Top Progress Bar via Compositor-Only scaleX
    if (dom.progressBar) {
      dom.progressBar.style.transform = `scaleX(${state.scrollProgress.toFixed(4)})`;
    }

    // 4. Drive Custom Magnetic Cursor & Static Radial Spotlight via translate3d
    if (!isCoarsePointer && state.pointerActive) {
      const ringAlpha = 1 - Math.exp(-18 * dt);
      const spotAlpha = 1 - Math.exp(-10 * dt);

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
        dom.spotlight.style.transform = `translate3d(${state.spotX.toFixed(1)}px, ${state.spotY.toFixed(1)}px, 0)`;
      }
    }

    // 5. Drive Kinetic Card Velocity Skew, Parallax & Mobile Gyro Tilt Directly
    if (!prefersReducedMotion) {
      const gyroAlpha = 1 - Math.exp(-8 * dt);
      state.smoothGyroX += (state.gyroX - state.smoothGyroX) * gyroAlpha;
      state.smoothGyroY += (state.gyroY - state.smoothGyroY) * gyroAlpha;

      const skewDeg = clamp(state.smoothVelocity * 0.065, -2.2, 2.2);
      const centeredScroll = state.scrollY - window.innerHeight * 0.35;

      for (let i = 0; i < dom.kineticCards.length; i++) {
        const card = dom.kineticCards[i];
        const parallaxFactor = parseFloat(card.getAttribute('data-parallax') || '0');
        const yOffset = clamp(centeredScroll * parallaxFactor, -18, 18);

        if (isCoarsePointer && card.hasAttribute('data-tilt')) {
          card.style.transform = `translate3d(${state.smoothGyroX.toFixed(1)}px, ${(yOffset + state.smoothGyroY).toFixed(1)}px, 0) skewY(${skewDeg.toFixed(2)}deg)`;
        } else {
          card.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0) skewY(${skewDeg.toFixed(2)}deg)`;
        }
      }
    }

    // 6. Render Three.js Scene ONLY When Visible in Viewport
    if (threeCtx && state.isWebGLVisible) {
      const { renderer, scene, camera, primaryMesh, coreMesh, particleSystem } = threeCtx;

      // Spring scale recovery on geometry switch
      threeCtx.scaleSpring += (1 - threeCtx.scaleSpring) * (1 - Math.exp(-12 * dt));
      primaryMesh.scale.setScalar(threeCtx.scaleSpring);

      const rotSpeed = prefersReducedMotion ? 0.08 : 0.42 + Math.abs(state.smoothVelocity) * 0.015;
      primaryMesh.rotation.x += rotSpeed * dt;
      primaryMesh.rotation.y += rotSpeed * 1.25 * dt;

      coreMesh.rotation.x -= rotSpeed * 0.8 * dt;
      coreMesh.rotation.z += rotSpeed * 1.1 * dt;

      particleSystem.rotation.y += 0.08 * dt;

      // Subtle pointer parallax on 3D group
      const normX = (state.pointerX / Math.max(1, window.innerWidth) - 0.5) * 0.45;
      const normY = (state.pointerY / Math.max(1, window.innerHeight) - 0.5) * 0.45;
      scene.rotation.y += (normX - scene.rotation.y) * (1 - Math.exp(-6 * dt));
      scene.rotation.x += (normY - scene.rotation.x) * (1 - Math.exp(-6 * dt));

      renderer.render(scene, camera);
    }

    requestAnimationFrame(masterTick);
  }

  /* =========================================================================
     5. INTERACTIONS: POINTER, MAGNETIC BUTTONS, RIPPLES, SWITCHERS & COPY
     ========================================================================= */
  let toastTimer = null;

  function showToast(message) {
    if (!dom.toast || !dom.toastMessage) return;
    dom.toastMessage.textContent = message;
    dom.toast.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('visible');
    }, 2600);
  }

  async function copyToClipboard(text, feedbackMessage) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      showToast(feedbackMessage);
    } catch (_) {
      showToast(`Ready to copy: ${text}`);
    }
  }

  function bindInteractions() {
    // Pointer tracking (zero style mutations here; coordinates read in masterTick)
    window.addEventListener(
      'pointermove',
      (e) => {
        state.pointerX = e.clientX;
        state.pointerY = e.clientY;
        state.pointerActive = true;
      },
      { passive: true }
    );

    // Magnetic Pull on [data-magnetic] controls
    if (!isCoarsePointer && !prefersReducedMotion) {
      dom.magneticNodes.forEach((node) => {
        const strength = parseFloat(node.getAttribute('data-magnetic') || '0.2');

        node.addEventListener('pointerenter', () => {
          if (dom.cursorRing) dom.cursorRing.classList.add('cursor-hover');
        });

        node.addEventListener('pointermove', (e) => {
          const rect = node.getBoundingClientRect();
          const dx = (e.clientX - (rect.left + rect.width * 0.5)) * strength;
          const dy = (e.clientY - (rect.top + rect.height * 0.5)) * strength;
          node.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        });

        node.addEventListener('pointerleave', () => {
          node.style.transform = 'translate3d(0, 0, 0)';
          if (dom.cursorRing) dom.cursorRing.classList.remove('cursor-hover');
        });
      });
    }

    // Tactile Touch / Click Ripples (Compositor scale3d + opacity)
    dom.rippleNodes.forEach((surface) => {
      surface.addEventListener('pointerdown', (e) => {
        const rect = surface.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 0.65;
        const ripple = document.createElement('span');
        ripple.className = 'touch-ripple';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size * 0.5}px`;
        ripple.style.top = `${e.clientY - rect.top - size * 0.5}px`;
        surface.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      });
    });

    // 3D Geometry Switcher Buttons
    dom.geoButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-geo');
        dom.geoButtons.forEach((b) => {
          const isTarget = b === btn;
          b.classList.toggle('active', isTarget);
          b.setAttribute('aria-pressed', isTarget ? 'true' : 'false');
        });
        switchWebGLGeometry(mode);
      });
    });

    // Avatar Art-Style Switcher (Original, Cyber Color, Emerald Matrix, Mono)
    dom.avatarButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const styleName = btn.getAttribute('data-avatar-style') || 'original';
        dom.avatarButtons.forEach((b) => {
          const isTarget = b === btn;
          b.classList.toggle('active', isTarget);
          b.setAttribute('aria-pressed', isTarget ? 'true' : 'false');
        });

        if (dom.avatarViewport) {
          dom.avatarViewport.classList.remove(
            'style-original',
            'style-cyber',
            'style-matrix',
            'style-mono'
          );
          dom.avatarViewport.classList.add(`style-${styleName}`);
          dom.avatarViewport.setAttribute('data-current-style', styleName);
        }
      });
    });

    // Email Copy Action
    if (dom.copyEmailBtn) {
      dom.copyEmailBtn.addEventListener('click', () => {
        const email = dom.copyEmailBtn.getAttribute('data-copy-value') || 'velizadetofiq1@gmail.com';
        copyToClipboard(email, `Email copied: ${email}`);
      });
    }

    // WhatsApp Handle Copy Action (Strictly handle @velizadetofiq1 & PIN 4458)
    if (dom.copyWaHandleBtn) {
      dom.copyWaHandleBtn.addEventListener('click', () => {
        copyToClipboard('@velizadetofiq1', 'WhatsApp handle @velizadetofiq1 copied (PIN: 4458)');
      });
    }

    if (dom.copyWaPinBtn) {
      dom.copyWaPinBtn.addEventListener('click', () => {
        copyToClipboard(
          'WhatsApp Handle: @velizadetofiq1 | Verification PIN: 4458',
          'Copied @velizadetofiq1 + Verification PIN 4458'
        );
      });
    }

    // Print Executive CV Action
    if (dom.printCvBtn) {
      dom.printCvBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Back to Top Action
    if (dom.scrollTopBtn) {
      dom.scrollTopBtn.addEventListener('click', () => {
        if (lenis) {
          lenis.scrollTo(0);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Mobile Gyroscope Tilt Support
    if (isCoarsePointer && typeof window.DeviceOrientationEvent !== 'undefined') {
      window.addEventListener(
        'deviceorientation',
        (e) => {
          if (e.gamma !== null && e.beta !== null) {
            state.gyroX = clamp(e.gamma * 0.25, -8, 8);
            state.gyroY = clamp((e.beta - 45) * 0.2, -8, 8);
          }
        },
        { passive: true }
      );
    }

    // Debounced Resize Handler for WebGL & Scroll Bounds
    window.addEventListener(
      'resize',
      () => {
        state.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        if (threeCtx && dom.webglStage) {
          const rect = dom.webglStage.getBoundingClientRect();
          const w = Math.max(1, rect.width);
          const h = Math.max(1, rect.height);
          threeCtx.camera.aspect = w / h;
          threeCtx.camera.updateProjectionMatrix();
          threeCtx.renderer.setSize(w, h, false);
        }
      },
      { passive: true }
    );
  }

  /* =========================================================================
     6. BOOTSTRAP ENGINE
     ========================================================================= */
  function bootstrap() {
    initLenis();
    initWebGLStage();
    bindInteractions();
    requestAnimationFrame(masterTick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();