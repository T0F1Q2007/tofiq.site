/**
 * KINETIC-BIO.JS : Lenis Momentum Scroll, Scroll-Coupled 3D WebGL, Gyroscope Parallax,
 * Velocity-Reactive Card Skew, Tactile Touch Ripples & Identity Controller.
 * Engineered for https://tofiq.site (Root Instagram & Social Referral Portal)
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  /* Shared Reactive Telemetry State across Lenis, Three.js, Gyroscope & DOM */
  const kineticState = {
    scrollY: 0,
    scrollProgress: 0,
    rawVelocity: 0,
    smoothVelocity: 0,
    gyroActive: false,
    gyroNormX: 0, // -1 to 1 (gamma roll)
    gyroNormY: 0, // -1 to 1 (beta pitch relative to neutral holding angle)
    pointerNormX: 0,
    pointerNormY: 0
  };

  /* ==========================================================================
     1. Procedural SVG Fallback Avatar Generator (Resilience for Local Previews)
     ========================================================================== */
  function createFallbackAvatarDataURI(styleKey) {
    const palettes = {
      original: { bg: '#0b131e', primary: '#00f0ff', secondary: '#10b981', label: 'TV // OPTICAL' },
      cyber: { bg: '#090d16', primary: '#00f0ff', secondary: '#ec4899', label: 'ASCII // CYBER' },
      emerald: { bg: '#06140e', primary: '#10b981', secondary: '#34d399', label: 'MATRIX // 0x44' },
      mono: { bg: '#0f1115', primary: '#f8fafc', secondary: '#94a3b8', label: 'MONO // RAW' }
    };
    const p = palettes[styleKey] || palettes.original;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <rect width="160" height="160" fill="${p.bg}"/>
      <circle cx="80" cy="80" r="68" fill="none" stroke="${p.primary}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.55"/>
      <circle cx="80" cy="64" r="24" fill="none" stroke="${p.primary}" stroke-width="2"/>
      <path d="M40 132 C40 102 120 102 120 132" fill="none" stroke="${p.secondary}" stroke-width="2"/>
      <text x="80" y="70" text-anchor="middle" fill="${p.primary}" font-family="monospace" font-size="15" font-weight="bold">TV</text>
      <text x="80" y="148" text-anchor="middle" fill="${p.secondary}" font-family="monospace" font-size="8">${p.label}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* ==========================================================================
     2. Lenis Decoupled Smooth Momentum Scroll & Velocity-Reactive Card Skew
     ========================================================================== */
  function initLenisAndScrollTelemetry() {
    const hudPill = document.getElementById('scroll-hud-pill');
    const hudPct = document.getElementById('hud-scroll-pct');
    const hudVel = document.getElementById('hud-scroll-vel');
    const velocityCards = Array.from(document.querySelectorAll('[data-velocity-card]'));

    let lenis = null;
    let hudHideTimer = null;

    function markHudActive() {
      if (!hudPill) return;
      hudPill.classList.add('is-active');
      if (hudHideTimer) clearTimeout(hudHideTimer);
      hudHideTimer = setTimeout(() => {
        if (Math.abs(kineticState.smoothVelocity) < 0.08) {
          hudPill.classList.remove('is-active');
        }
      }, 1800);
    }

    function updateNativeScrollFallback() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentY = window.scrollY || window.pageYOffset || 0;
      const delta = currentY - kineticState.scrollY;
      kineticState.scrollY = currentY;
      kineticState.scrollProgress = docHeight > 0 ? Math.min(Math.max(currentY / docHeight, 0), 1) : 0;
      kineticState.rawVelocity = delta * 0.65;
      markHudActive();
    }

    if (!prefersReducedMotion && typeof window.Lenis !== 'undefined') {
      lenis = new window.Lenis({
        lerp: 0.08,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.25,
        smoothWheel: true,
        syncTouch: true,
        syncTouchLerp: 0.085
      });

      lenis.on('scroll', (e) => {
        kineticState.scrollY = e.scroll;
        kineticState.scrollProgress = e.progress || 0;
        kineticState.rawVelocity = e.velocity || 0;
        markHudActive();
      });
    } else {
      window.addEventListener('scroll', updateNativeScrollFallback, { passive: true });
      updateNativeScrollFallback();
    }

    // Smoothly handle internal anchor links via Lenis if active
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl && lenis) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: -16 });
        }
      });
    });

    // Central RAF Loop for Lenis, HUD Progress Bar & Spring-Damped Velocity Skew
    function updateScrollKineticLoop(time) {
      if (lenis) {
        lenis.raf(time);
      }

      // Spring-damped interpolation of scroll velocity
      kineticState.smoothVelocity += (kineticState.rawVelocity - kineticState.smoothVelocity) * 0.14;
      kineticState.rawVelocity *= 0.88; // Decay raw velocity when scroll events pause

      if (Math.abs(kineticState.smoothVelocity) < 0.001) {
        kineticState.smoothVelocity = 0;
      }

      // Update Top Hairline Progress Bar CSS Variable
      document.documentElement.style.setProperty(
        '--scroll-progress',
        kineticState.scrollProgress.toFixed(4)
      );

      // Compute clamped velocity skew (-3deg to +3deg) and parallax shift
      if (!prefersReducedMotion) {
        const clampedSkew = Math.max(-3.0, Math.min(3.0, kineticState.smoothVelocity * 0.18));
        document.documentElement.style.setProperty('--scroll-skew', `${clampedSkew.toFixed(3)}deg`);

        velocityCards.forEach((stageEl) => {
          const factor = parseFloat(stageEl.getAttribute('data-parallax-factor') || '1');
          const shiftY = Math.max(-14, Math.min(14, -kineticState.smoothVelocity * 0.65 * factor));
          stageEl.style.setProperty('--card-parallax-y', `${shiftY.toFixed(2)}px`);
        });
      }

      // Update Futuristic HUD Telemetry Readouts
      if (hudPct) {
        const pctInt = Math.round(kineticState.scrollProgress * 100);
        hudPct.textContent = `SCR: ${String(pctInt).padStart(3, '0')}%`;
      }
      if (hudVel) {
        const absVel = Math.abs(kineticState.smoothVelocity).toFixed(2);
        hudVel.textContent = `VEL: ${absVel}`;
      }
      if (hudPill) {
        hudPill.classList.toggle('is-high-velocity', Math.abs(kineticState.smoothVelocity) > 2.2);
      }

      requestAnimationFrame(updateScrollKineticLoop);
    }

    requestAnimationFrame(updateScrollKineticLoop);
  }

  /* ==========================================================================
     3. Viewport Stagger Reveals (IntersectionObserver with Cyber-Luxe Timing)
     ========================================================================== */
  function initViewportReveals() {
    const revealItems = document.querySelectorAll('.reveal-item');
    if (!revealItems.length) return;

    if (prefersReducedMotion || typeof window.IntersectionObserver === 'undefined') {
      revealItems.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
            setTimeout(() => {
              el.classList.add('is-revealed');
            }, delay);
            obs.unobserve(el);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -6% 0px',
        threshold: 0.08
      }
    );

    revealItems.forEach((el) => observer.observe(el));
  }

  /* ==========================================================================
     4. Mobile Tactile Touch Ripples & Haptic Spring Compression
     ========================================================================== */
  function initTactileTouchInteractions() {
    const rippleTargets = document.querySelectorAll('[data-ripple], .tilt-card, .action-pill-btn');

    function spawnRipple(container, clientX, clientY) {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const maxDim = Math.max(rect.width, rect.height);

      const ripple = document.createElement('span');
      ripple.className = 'tactile-ripple';
      ripple.style.width = `${maxDim * 0.85}px`;
      ripple.style.height = `${maxDim * 0.85}px`;
      ripple.style.left = `${localX}px`;
      ripple.style.top = `${localY}px`;

      container.appendChild(ripple);
      ripple.addEventListener('animationend', () => {
        ripple.remove();
      });
    }

    rippleTargets.forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        // Avoid double ripple if a nested button inside a card was tapped
        if (e.target !== el && e.target.closest('button, a') && e.target.closest('button, a') !== el) {
          return;
        }

        el.classList.add('is-touch-pressed');
        el.classList.add('is-touch-active');

        const rect = el.getBoundingClientRect();
        el.style.setProperty('--card-mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--card-my', `${e.clientY - rect.top}px`);

        // Update Ambient Spotlight on mobile touch as well
        document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);

        spawnRipple(el, e.clientX, e.clientY);
      }, { passive: true });

      const releaseTouch = () => {
        el.classList.remove('is-touch-pressed');
        setTimeout(() => {
          el.classList.remove('is-touch-active');
        }, 320);
      };

      el.addEventListener('pointerup', releaseTouch, { passive: true });
      el.addEventListener('pointercancel', releaseTouch, { passive: true });
      el.addEventListener('pointerleave', releaseTouch, { passive: true });
    });
  }

  /* ==========================================================================
     5. Smartphone Gyroscope / DeviceOrientation Holographic Parallax
     ========================================================================== */
  function initGyroscopeParallax() {
    const gyroBtn = document.getElementById('gyro-toggle-btn');
    const gyroBtnLabel = document.getElementById('gyro-btn-label');
    const hudGyroBadge = document.getElementById('hud-gyro-indicator');
    const cards = document.querySelectorAll('[data-tilt]');

    if (prefersReducedMotion || typeof window.DeviceOrientationEvent === 'undefined') {
      return;
    }

    let baselineBeta = null;

    function handleOrientation(event) {
      if (event.gamma === null || event.beta === null) return;

      if (baselineBeta === null) {
        baselineBeta = event.beta; // Calibrate neutral holding angle (usually ~45deg)
      }

      kineticState.gyroActive = true;
      if (hudGyroBadge) hudGyroBadge.hidden = false;

      // Clamp gamma (-30 to +30 deg) and relative beta (-25 to +25 deg)
      const clampedGamma = Math.max(-30, Math.min(30, event.gamma));
      const relativeBeta = Math.max(-25, Math.min(25, event.beta - baselineBeta));

      const normX = clampedGamma / 30; // -1 to 1
      const normY = relativeBeta / 25; // -1 to 1

      kineticState.gyroNormX += (normX - kineticState.gyroNormX) * 0.15;
      kineticState.gyroNormY += (normY - kineticState.gyroNormY) * 0.15;

      // Shift ambient background spotlight subtly with phone tilt
      const spotX = 50 + kineticState.gyroNormX * 32;
      const spotY = 35 + kineticState.gyroNormY * 28;
      document.documentElement.style.setProperty('--cursor-x', `${spotX.toFixed(1)}vw`);
      document.documentElement.style.setProperty('--cursor-y', `${spotY.toFixed(1)}vh`);

      // Apply Holographic 3D Perspective Tilt to Cards on Mobile
      cards.forEach((card) => {
        if (card.classList.contains('is-touch-pressed')) return;
        const maxTilt = card.classList.contains('tilt-card--featured') ? 5.5 : 7.0;
        const rx = (-kineticState.gyroNormY * maxTilt).toFixed(2);
        const ry = (kineticState.gyroNormX * maxTilt).toFixed(2);
        card.style.setProperty('--rx', `${rx}deg`);
        card.style.setProperty('--ry', `${ry}deg`);
        card.style.setProperty('--card-mx', `${(50 + kineticState.gyroNormX * 40).toFixed(1)}%`);
        card.style.setProperty('--card-my', `${(50 + kineticState.gyroNormY * 40).toFixed(1)}%`);
        card.style.setProperty('--spotlight-opacity', '0.75');
      });
    }

    // Check if iOS 13+ explicit permission is required
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      if (isTouchDevice && gyroBtn) {
        gyroBtn.hidden = false;
        gyroBtn.addEventListener('click', async () => {
          try {
            const permission = await window.DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
              baselineBeta = null;
              window.addEventListener('deviceorientation', handleOrientation, { passive: true });
              gyroBtn.classList.add('is-active');
              if (gyroBtnLabel) gyroBtnLabel.textContent = 'GYRO ON';
            }
          } catch (err) {
            gyroBtn.hidden = true;
          }
        });
      }
    } else if (isTouchDevice) {
      // Android & standard mobile browsers bind directly
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }
  }

  /* ==========================================================================
     6. Fluid Velocity-Reactive Magnetic Cursor (Desktop Fine Pointer)
     ========================================================================== */
  function initCursorAndSpotlight() {
    const cursorSystem = document.getElementById('cursor-system');
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');
    const cursorLabel = document.getElementById('cursor-label');
    const telemetryCoords = document.getElementById('telemetry-coords');

    const mouse = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.35,
      prevX: window.innerWidth * 0.5,
      prevY: window.innerHeight * 0.35
    };

    const ringPos = {
      x: mouse.x,
      y: mouse.y
    };

    if (isFinePointer && !prefersReducedMotion && cursorSystem) {
      document.body.classList.add('has-custom-cursor');
    }

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;

      mouse.x = e.clientX;
      mouse.y = e.clientY;

      const nx = (mouse.x / window.innerWidth) * 2 - 1;
      const ny = -(mouse.y / window.innerHeight) * 2 + 1;
      kineticState.pointerNormX = nx;
      kineticState.pointerNormY = ny;

      document.documentElement.style.setProperty('--cursor-x', `${mouse.x}px`);
      document.documentElement.style.setProperty('--cursor-y', `${mouse.y}px`);

      if (telemetryCoords) {
        telemetryCoords.textContent = `X:${nx.toFixed(2)} Y:${ny.toFixed(2)}`;
      }
    }, { passive: true });

    if (!isFinePointer || prefersReducedMotion || !cursorSystem || !cursorDot || !cursorRing) {
      return;
    }

    const interactiveTargets = document.querySelectorAll('a, button, [role="button"], [data-cursor]');
    interactiveTargets.forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        const customText = el.getAttribute('data-cursor') || 'OPEN';
        if (cursorLabel) {
          cursorLabel.textContent = customText;
        }
        cursorSystem.classList.add('is-hovering');
      });

      el.addEventListener('pointerleave', () => {
        cursorSystem.classList.remove('is-hovering');
      });
    });

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      cursorSystem.classList.add('is-pressed');
    });

    window.addEventListener('pointerup', () => {
      cursorSystem.classList.remove('is-pressed');
    });

    function renderCursorLoop() {
      const lerpFactor = 0.18;
      ringPos.x += (mouse.x - ringPos.x) * lerpFactor;
      ringPos.y += (mouse.y - ringPos.y) * lerpFactor;

      const vx = mouse.x - mouse.prevX;
      const vy = mouse.y - mouse.prevY;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      const speed = Math.min(Math.hypot(vx, vy), 60);
      const isHovering = cursorSystem.classList.contains('is-hovering');

      cursorDot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;

      if (!isHovering && speed > 1.5) {
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);
        const scaleX = 1 + (speed / 60) * 0.28;
        const scaleY = 1 - (speed / 60) * 0.16;
        cursorRing.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) rotate(${angle}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
      } else {
        cursorRing.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      }

      requestAnimationFrame(renderCursorLoop);
    }

    requestAnimationFrame(renderCursorLoop);
  }

  /* ==========================================================================
     7. Aceternity-Style 3D Perspective Card Tilt (Pointer & Touch Tracking)
     ========================================================================== */
  function initTiltCards() {
    const cards = document.querySelectorAll('[data-tilt]');

    cards.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        card.style.setProperty('--card-mx', `${localX}px`);
        card.style.setProperty('--card-my', `${localY}px`);

        if (prefersReducedMotion || e.pointerType === 'touch') {
          return;
        }

        const centerX = rect.width * 0.5;
        const centerY = rect.height * 0.5;
        const normX = (localX - centerX) / centerX;
        const normY = (localY - centerY) / centerY;

        const maxTilt = card.classList.contains('tilt-card--featured') ? 5.0 : 6.5;
        const rotateX = (-normY * maxTilt).toFixed(2);
        const rotateY = (normX * maxTilt).toFixed(2);

        card.style.setProperty('--rx', `${rotateX}deg`);
        card.style.setProperty('--ry', `${rotateY}deg`);
      });

      card.addEventListener('pointerleave', () => {
        if (!kineticState.gyroActive) {
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
        }
      });
    });
  }

  /* ==========================================================================
     8. Interactive Portrait Art-Style Switcher (Smooth Cross-Fade & Theme Sync)
     ========================================================================== */
  let updateThreePaletteCallback = null;

  function initAvatarStyleSwitcher() {
    const buttons = Array.from(document.querySelectorAll('.style-switch-btn'));
    const pillIndicator = document.getElementById('style-pill-indicator');
    const imgPrimary = document.getElementById('avatar-img-primary');
    const imgSecondary = document.getElementById('avatar-img-secondary');
    const hudBadge = document.getElementById('avatar-hud-badge');
    const avatarViewport = document.getElementById('avatar-viewport');

    if (!buttons.length || !imgPrimary || !imgSecondary) {
      return;
    }

    let currentIndex = 0;
    let activeLayerIsPrimary = true;

    [imgPrimary, imgSecondary].forEach((imgEl) => {
      imgEl.addEventListener('error', function handleImgError() {
        const currentKey = buttons[currentIndex]
          ? buttons[currentIndex].getAttribute('data-style-key')
          : 'original';
        if (!imgEl.src.startsWith('data:image/svg+xml')) {
          imgEl.src = createFallbackAvatarDataURI(currentKey);
        }
      });
    });

    function syncPillPosition(targetBtn) {
      if (!pillIndicator || !targetBtn) return;
      const offsetLeft = targetBtn.offsetLeft;
      const width = targetBtn.offsetWidth;
      pillIndicator.style.width = `${width}px`;
      pillIndicator.style.transform = `translate3d(${offsetLeft - 4}px, 0, 0)`;
    }

    function activateStyleByIndex(index) {
      const targetBtn = buttons[index];
      if (!targetBtn) return;

      currentIndex = index;
      const newSrc = targetBtn.getAttribute('data-src');
      const newBadge = targetBtn.getAttribute('data-badge') || 'OPTICAL';
      const newTheme = targetBtn.getAttribute('data-theme-accent') || 'cyber-cyan';
      const styleKey = targetBtn.getAttribute('data-style-key') || 'original';

      buttons.forEach((btn, idx) => {
        const isSelected = idx === index;
        btn.classList.toggle('is-selected', isSelected);
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });

      syncPillPosition(targetBtn);

      document.documentElement.setAttribute('data-theme', newTheme);
      if (typeof updateThreePaletteCallback === 'function') {
        updateThreePaletteCallback(newTheme);
      }

      if (hudBadge) {
        hudBadge.textContent = newBadge;
      }

      const incomingImg = activeLayerIsPrimary ? imgSecondary : imgPrimary;
      const outgoingImg = activeLayerIsPrimary ? imgPrimary : imgSecondary;

      incomingImg.onerror = () => {
        incomingImg.src = createFallbackAvatarDataURI(styleKey);
      };
      incomingImg.src = newSrc;
      incomingImg.alt = `Portrait of Tofig Valizada in ${targetBtn.textContent.trim()} style`;
      incomingImg.removeAttribute('aria-hidden');
      outgoingImg.setAttribute('aria-hidden', 'true');

      incomingImg.classList.add('is-active');
      outgoingImg.classList.remove('is-active');

      activeLayerIsPrimary = !activeLayerIsPrimary;
    }

    buttons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        if (idx !== currentIndex) {
          activateStyleByIndex(idx);
        }
      });
    });

    if (avatarViewport) {
      avatarViewport.addEventListener('click', () => {
        const nextIndex = (currentIndex + 1) % buttons.length;
        activateStyleByIndex(nextIndex);
      });

      avatarViewport.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % buttons.length;
          activateStyleByIndex(nextIndex);
        }
      });
    }

    window.addEventListener('resize', () => {
      syncPillPosition(buttons[currentIndex]);
    });

    requestAnimationFrame(() => {
      syncPillPosition(buttons[currentIndex]);
    });
  }

  /* ==========================================================================
     9. Scroll-Coupled & Gyroscope-Reactive Three.js 3D Spatial Centerpiece
     ========================================================================== */
  function initSpatialWebGL() {
    const stageWrapper = document.getElementById('webgl-stage');
    const canvas = document.getElementById('spatial-canvas');
    const cycleBtn = document.getElementById('geometry-cycle-btn');
    const modeLabel = document.getElementById('geometry-mode-label');

    if (!stageWrapper || !canvas || typeof window.THREE === 'undefined') {
      return;
    }

    const THREE = window.THREE;
    const scene = new THREE.Scene();

    const width = stageWrapper.clientWidth || 640;
    const height = stageWrapper.clientHeight || 245;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const baseCameraZ = 4.6;
    camera.position.set(0, 0, baseCameraZ);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const assemblyGroup = new THREE.Group();
    scene.add(assemblyGroup);

    const geometryModes = [
      {
        name: 'TORUS KNOT',
        createOuter: () => new THREE.TorusKnotGeometry(1.05, 0.28, 128, 18, 2, 3),
        createInner: () => new THREE.IcosahedronGeometry(0.56, 1)
      },
      {
        name: 'CYBER OCTA',
        createOuter: () => new THREE.OctahedronGeometry(1.32, 2),
        createInner: () => new THREE.DodecahedronGeometry(0.72, 0)
      },
      {
        name: 'HELIX TORUS',
        createOuter: () => new THREE.TorusKnotGeometry(1.08, 0.22, 140, 16, 3, 5),
        createInner: () => new THREE.OctahedronGeometry(0.62, 1)
      }
    ];

    let currentGeoIndex = 0;

    const outerWireMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.34
    });

    const innerCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.2,
      metalness: 0.85,
      wireframe: false,
      transparent: true,
      opacity: 0.42
    });

    const innerWireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });

    let outerMesh = new THREE.Mesh(geometryModes[0].createOuter(), outerWireMaterial);
    let innerMesh = new THREE.Mesh(geometryModes[0].createInner(), innerCoreMaterial);
    let innerWireMesh = new THREE.Mesh(geometryModes[0].createInner(), innerWireMaterial);

    assemblyGroup.add(outerMesh);
    assemblyGroup.add(innerMesh);
    assemblyGroup.add(innerWireMesh);

    const particleCount = 190;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.65 + Math.random() * 1.45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.65;
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.032,
      transparent: true,
      opacity: 0.68
    });

    const particleField = new THREE.Points(particleGeo, particleMat);
    assemblyGroup.add(particleField);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x00f0ff, 2.2, 12);
    pointLightCyan.position.set(3, 2, 3);
    scene.add(pointLightCyan);

    const pointLightEmerald = new THREE.PointLight(0x10b981, 1.8, 12);
    pointLightEmerald.position.set(-3, -2, 2);
    scene.add(pointLightEmerald);

    updateThreePaletteCallback = function (themeName) {
      if (themeName === 'matrix-emerald') {
        outerWireMaterial.color.setHex(0x10b981);
        innerCoreMaterial.color.setHex(0x00f0ff);
        particleMat.color.setHex(0x34d399);
      } else if (themeName === 'monolith-mono') {
        outerWireMaterial.color.setHex(0xe2e8f0);
        innerCoreMaterial.color.setHex(0x94a3b8);
        particleMat.color.setHex(0xffffff);
      } else {
        outerWireMaterial.color.setHex(0x00f0ff);
        innerCoreMaterial.color.setHex(0x10b981);
        particleMat.color.setHex(0x00f0ff);
      }
    };

    function cycleGeometryMode() {
      currentGeoIndex = (currentGeoIndex + 1) % geometryModes.length;
      const mode = geometryModes[currentGeoIndex];

      if (modeLabel) {
        modeLabel.textContent = mode.name;
      }

      outerMesh.geometry.dispose();
      innerMesh.geometry.dispose();
      innerWireMesh.geometry.dispose();

      outerMesh.geometry = mode.createOuter();
      const newInnerGeo = mode.createInner();
      innerMesh.geometry = newInnerGeo;
      innerWireMesh.geometry = newInnerGeo.clone();
    }

    if (cycleBtn) {
      cycleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleGeometryMode();
      });
    }

    // Pointer & Touch Orbit Drag Interaction
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let userDragRotX = 0;
    let userDragRotY = 0;
    let scrollAccumulatedSpin = 0;

    stageWrapper.addEventListener('pointerdown', (e) => {
      if (e.target === cycleBtn || (cycleBtn && cycleBtn.contains(e.target))) {
        return;
      }
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      userDragRotY += dx * 0.0085;
      userDragRotX += dy * 0.0085;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    window.addEventListener('resize', () => {
      const newW = stageWrapper.clientWidth;
      const newH = stageWrapper.clientHeight;
      if (!newW || !newH) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });

    requestAnimationFrame(() => {
      canvas.classList.add('is-loaded');
    });

    const clock = new THREE.Clock();

    function animateThree() {
      const elapsed = clock.getElapsedTime();

      // Integrate Lenis scroll velocity into angular momentum
      scrollAccumulatedSpin += kineticState.smoothVelocity * 0.0065;
      const scrollYaw = kineticState.scrollProgress * Math.PI * 1.65;
      const scrollPitch = kineticState.scrollProgress * Math.PI * 0.85;

      if (!prefersReducedMotion) {
        outerMesh.rotation.y = elapsed * 0.22 + userDragRotY + scrollYaw + scrollAccumulatedSpin;
        outerMesh.rotation.x = elapsed * 0.14 + userDragRotX + scrollPitch * 0.6;

        innerMesh.rotation.y = -elapsed * 0.32 + userDragRotY - scrollYaw * 0.8 - scrollAccumulatedSpin * 0.7;
        innerMesh.rotation.x = elapsed * 0.18 + userDragRotX + scrollPitch;
        innerWireMesh.rotation.copy(innerMesh.rotation);

        particleField.rotation.y = elapsed * 0.06 + scrollYaw * 0.35;
        particleField.rotation.z = kineticState.scrollProgress * 0.45;
      }

      // Combine Desktop Pointer & Mobile Gyroscope into Spatial Target Attitude
      const inputX = kineticState.gyroActive ? kineticState.gyroNormX : kineticState.pointerNormX;
      const inputY = kineticState.gyroActive ? kineticState.gyroNormY : kineticState.pointerNormY;

      const targetGroupRotY = inputX * 0.6 + kineticState.smoothVelocity * 0.025;
      const targetGroupRotX = -inputY * 0.4 + kineticState.smoothVelocity * 0.035;

      assemblyGroup.rotation.y += (targetGroupRotY - assemblyGroup.rotation.y) * 0.07;
      assemblyGroup.rotation.x += (targetGroupRotX - assemblyGroup.rotation.x) * 0.07;

      // Scroll-Driven Depth Modulation (Camera Z & Group Y Parallax)
      const velocityDepthZoom = Math.min(Math.abs(kineticState.smoothVelocity) * 0.04, 0.55);
      const targetCamZ = baseCameraZ - kineticState.scrollProgress * 0.55 + velocityDepthZoom;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;

      renderer.render(scene, camera);
      requestAnimationFrame(animateThree);
    }

    animateThree();
  }

  /* ==========================================================================
     10. Clipboard Copy Actions, Toast Feedback & Print CV Trigger
     ========================================================================== */
  function initActionsAndToast() {
    const toastRegion = document.getElementById('toast-region');
    const toastMessage = document.getElementById('toast-message');
    const copyButtons = document.querySelectorAll('[data-copy-value]');
    const printBtn = document.getElementById('print-cv-btn');
    const yearEl = document.getElementById('current-year');

    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    let toastTimeout = null;

    function showToast(message) {
      if (!toastRegion || !toastMessage) return;
      toastMessage.textContent = message;
      toastRegion.hidden = false;

      requestAnimationFrame(() => {
        toastRegion.classList.add('is-visible');
      });

      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }

      toastTimeout = setTimeout(() => {
        toastRegion.classList.remove('is-visible');
        setTimeout(() => {
          toastRegion.hidden = true;
        }, 220);
      }, 2600);
    }

    async function copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }

    copyButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = btn.getAttribute('data-copy-value');
        const label = btn.getAttribute('data-copy-label') || value;
        if (!value) return;

        const ok = await copyToClipboard(value);
        if (ok) {
          showToast(`Copied ${label} to clipboard`);
          const emailBtnText = document.getElementById('copy-email-btn-text');
          if (btn.id === 'copy-email-btn' && emailBtnText) {
            const originalText = emailBtnText.textContent;
            emailBtnText.textContent = 'Copied!';
            setTimeout(() => {
              emailBtnText.textContent = originalText;
            }, 1800);
          }
        } else {
          showToast(`Select and copy manually: ${value}`);
        }
      });
    });

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        showToast('Preparing executive CV summary for print / PDF export...');
        setTimeout(() => {
          window.print();
        }, 180);
      });
    }
  }

  /* ==========================================================================
     11. Master Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initLenisAndScrollTelemetry();
    initViewportReveals();
    initTactileTouchInteractions();
    initGyroscopeParallax();
    initCursorAndSpotlight();
    initTiltCards();
    initAvatarStyleSwitcher();
    initSpatialWebGL();
    initActionsAndToast();
  });
})();