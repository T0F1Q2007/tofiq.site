/**
 * KINETIC-BIO.JS — Spatial WebGL, Fluid Cursor Physics, 3D Tilt & Identity Controller
 * Engineered for https://tofiq.site (Root Instagram & Social Referral Portal)
 * Zero external runtime dependencies beyond Three.js r128.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
     2. Fluid Velocity-Reactive Magnetic Cursor & Ambient Spotlight Controller
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
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Update CSS Custom Properties for Ambient Cursor Spotlight
      document.documentElement.style.setProperty('--cursor-x', `${mouse.x}px`);
      document.documentElement.style.setProperty('--cursor-y', `${mouse.y}px`);

      if (telemetryCoords) {
        const nx = ((mouse.x / window.innerWidth) * 2 - 1).toFixed(2);
        const ny = (-(mouse.y / window.innerHeight) * 2 + 1).toFixed(2);
        telemetryCoords.textContent = `X:${nx} Y:${ny}`;
      }
    }, { passive: true });

    if (!isFinePointer || prefersReducedMotion || !cursorSystem || !cursorDot || !cursorRing) {
      return;
    }

    // Interactive Hover State Detection
    const interactiveTargets = document.querySelectorAll('a, button, [role="button"], [data-cursor]');
    interactiveTargets.forEach((el) => {
      el.addEventListener('pointerenter', () => {
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

    window.addEventListener('pointerdown', () => {
      cursorSystem.classList.add('is-pressed');
    });

    window.addEventListener('pointerup', () => {
      cursorSystem.classList.remove('is-pressed');
    });

    // RAF Spring-Damped Interpolation Loop with Velocity Deformation
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
     3. Aceternity-Style 3D Perspective Card Tilt & Local Spotlight Tracking
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

        if (prefersReducedMotion || !isFinePointer) {
          return;
        }

        const centerX = rect.width * 0.5;
        const centerY = rect.height * 0.5;
        const normX = (localX - centerX) / centerX;
        const normY = (localY - centerY) / centerY;

        // Clamp tilt to subtle architectural bounds (-6.5deg to +6.5deg)
        const maxTilt = card.classList.contains('tilt-card--featured') ? 5.0 : 6.5;
        const rotateX = (-normY * maxTilt).toFixed(2);
        const rotateY = (normX * maxTilt).toFixed(2);

        card.style.setProperty('--rx', `${rotateX}deg`);
        card.style.setProperty('--ry', `${rotateY}deg`);
      });

      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ==========================================================================
     4. Interactive Portrait Art-Style Switcher (Smooth Cross-Fade & Theme Sync)
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

    // Install graceful fallback handlers in case local assets are missing during preview
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

      // Update Document Theme Accent & WebGL 3D Shader Colors
      document.documentElement.setAttribute('data-theme', newTheme);
      if (typeof updateThreePaletteCallback === 'function') {
        updateThreePaletteCallback(newTheme);
      }

      if (hudBadge) {
        hudBadge.textContent = newBadge;
      }

      // Cross-fade between primary and secondary image layers
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

    // Clicking or pressing Enter/Space on the Avatar Viewport cycles to the next render style
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

    // Initialize sliding indicator geometry on load and resize
    window.addEventListener('resize', () => {
      syncPillPosition(buttons[currentIndex]);
    });

    requestAnimationFrame(() => {
      syncPillPosition(buttons[currentIndex]);
    });
  }

  /* ==========================================================================
     5. Interactive Three.js 3D Spatial Centerpiece (Morphing Cyber Geometry)
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
    camera.position.set(0, 0, 4.6);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      // Graceful fallback if WebGL context is restricted
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Root Spatial Assembly Group
    const assemblyGroup = new THREE.Group();
    scene.add(assemblyGroup);

    // Geometry Modes for Interactive Cycling
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

    // Materials
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

    // Orbital Particle Lattice Field
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.65 + Math.random() * 1.4;
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
      opacity: 0.65
    });

    const particleField = new THREE.Points(particleGeo, particleMat);
    assemblyGroup.add(particleField);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x00f0ff, 2.2, 12);
    pointLightCyan.position.set(3, 2, 3);
    scene.add(pointLightCyan);

    const pointLightEmerald = new THREE.PointLight(0x10b981, 1.8, 12);
    pointLightEmerald.position.set(-3, -2, 2);
    scene.add(pointLightEmerald);

    // Expose Theme Palette Sync Callback
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

    // Interactive Geometry Mode Switcher
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
    let targetRotX = 0;
    let targetRotY = 0;
    let userDragRotX = 0;
    let userDragRotY = 0;

    stageWrapper.addEventListener('pointerdown', (e) => {
      if (e.target === cycleBtn || (cycleBtn && cycleBtn.contains(e.target))) {
        return;
      }
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;

      targetRotY = nx * 0.55;
      targetRotX = -ny * 0.35;

      if (isDragging) {
        const dx = e.clientX - prevPointerX;
        const dy = e.clientY - prevPointerY;
        userDragRotY += dx * 0.0085;
        userDragRotX += dy * 0.0085;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      }
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    // Responsive Resize Handler
    window.addEventListener('resize', () => {
      const newW = stageWrapper.clientWidth;
      const newH = stageWrapper.clientHeight;
      if (!newW || !newH) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });

    // Fade in Canvas once initialized (Zero CLS)
    requestAnimationFrame(() => {
      canvas.classList.add('is-loaded');
    });

    // Render Loop
    let clock = new THREE.Clock();

    function animateThree() {
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        outerMesh.rotation.y = elapsed * 0.22 + userDragRotY;
        outerMesh.rotation.x = elapsed * 0.14 + userDragRotX;

        innerMesh.rotation.y = -elapsed * 0.32 + userDragRotY;
        innerMesh.rotation.x = elapsed * 0.18 + userDragRotX;
        innerWireMesh.rotation.copy(innerMesh.rotation);

        particleField.rotation.y = elapsed * 0.06;
      }

      // Smooth Damped Parallax Tracking
      assemblyGroup.rotation.y += (targetRotY - assemblyGroup.rotation.y) * 0.06;
      assemblyGroup.rotation.x += (targetRotX - assemblyGroup.rotation.x) * 0.06;

      renderer.render(scene, camera);
      requestAnimationFrame(animateThree);
    }

    animateThree();
  }

  /* ==========================================================================
     6. Clipboard Copy Actions, Toast Feedback & Print CV Trigger
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
      // Fallback for older mobile webviews (e.g., Instagram in-app browser)
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
     7. Master Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initCursorAndSpotlight();
    initTiltCards();
    initAvatarStyleSwitcher();
    initSpatialWebGL();
    initActionsAndToast();
  });
})();