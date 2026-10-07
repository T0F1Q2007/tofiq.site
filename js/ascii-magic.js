/**
 * ASCII Magic Engine for tofiq.site
 * Smooth ASCII transformations, canvas matrix particles, and avatar morphing.
 */

(function () {
  'use strict';

  // 1. Avatar Style Cycling
  const AVATAR_STYLES = [
    { id: 'photo', name: 'ORIGINAL', src: 'assets/profile.jpg', border: 'rgba(255, 255, 255, 0.25)' },
    { id: 'color', name: 'ASCII COLOR', src: 'assets/profile_ascii_color.png', border: 'rgba(96, 165, 250, 0.5)' },
    { id: 'emerald', name: 'CYBER MATRIX', src: 'assets/profile_ascii_emerald.png', border: 'rgba(0, 255, 136, 0.6)' },
    { id: 'mono', name: 'MONO CHROME', src: 'assets/profile_ascii_mono.png', border: 'rgba(224, 230, 237, 0.5)' }
  ];

  let currentStyleIndex = 0;

  // Preload images for buttery smooth transitions
  AVATAR_STYLES.forEach(style => {
    const img = new Image();
    img.src = style.src;
  });

  function initAvatarMorph() {
    const container = document.getElementById('avatarContainer');
    const img = document.getElementById('avatarImg');
    const tag = document.getElementById('avatarStyleTag');
    if (!container || !img || !tag) return;

    function cycleAvatar(nextIndex) {
      if (typeof nextIndex === 'number') {
        currentStyleIndex = nextIndex;
      } else {
        currentStyleIndex = (currentStyleIndex + 1) % AVATAR_STYLES.length;
      }

      const style = AVATAR_STYLES[currentStyleIndex];

      // Trigger glitch pulse
      container.classList.add('glitching');
      
      setTimeout(() => {
        img.src = style.src;
        tag.textContent = style.name;
        container.style.borderColor = style.border;
        container.setAttribute('data-style', style.id);
        
        setTimeout(() => {
          container.classList.remove('glitching');
        }, 150);
      }, 100);
    }

    container.addEventListener('click', () => cycleAvatar());
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cycleAvatar();
      }
    });

    // Hover hint
    container.setAttribute('title', 'Click or tap to morph ASCII style');
  }

  // 2. Interactive Background ASCII Particle Canvas
  function initAsciiCanvas() {
    const canvas = document.getElementById('asciiCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    const CHARS = ['+', '·', '*', '0', '1', '~', 'x', '_', ':', '%', '#', '>'];
    let mouse = { x: -1000, y: -1000 };
    let animId = null;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const count = Math.min(65, Math.floor((width * height) / 18000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          size: Math.floor(Math.random() * 6) + 11,
          speedY: (Math.random() * 0.4 + 0.15) * (Math.random() > 0.5 ? 1 : -1),
          speedX: (Math.random() * 0.3 - 0.15),
          opacity: Math.random() * 0.22 + 0.06,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';

      const isAsciiActive = document.body.classList.contains('ascii-mode');
      const baseAlphaMultiplier = isAsciiActive ? 1.8 : 0.9;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulse += 0.02;

        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        // Subtle mouse push
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.x += (dx / dist) * 1.5;
          p.y += (dy / dist) * 1.5;
        }

        const alpha = Math.min(1, Math.max(0.04, (p.opacity + Math.sin(p.pulse) * 0.05) * baseAlphaMultiplier));
        
        if (isAsciiActive) {
          ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        }

        ctx.fillText(p.char, p.x, p.y);
      }

      animId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    resize();
    draw();
  }

  // 3. ASCII Magic Mode Switcher
  function initAsciiMode() {
    const toggleBtn = document.getElementById('asciiModeToggle');
    if (!toggleBtn) return;

    const savedState = localStorage.getItem('ascii_magic_mode');
    if (savedState === 'active') {
      document.body.classList.add('ascii-mode');
      toggleBtn.classList.add('active');
    }

    toggleBtn.addEventListener('click', () => {
      const isActive = document.body.classList.toggle('ascii-mode');
      toggleBtn.classList.toggle('active', isActive);
      localStorage.setItem('ascii_magic_mode', isActive ? 'active' : 'inactive');

      // If active, automatically cycle avatar to ASCII Color if still on original photo
      if (isActive && currentStyleIndex === 0) {
        const container = document.getElementById('avatarContainer');
        if (container) container.click();
      }
    });
  }

  // 4. Subtle ASCII Subtitle Typing Effect
  function initSubtitleTyping() {
    const sub = document.getElementById('asciiSubtitle');
    if (!sub) return;

    const phrases = [
      '> cis_student @ asoiu',
      '> developer & researcher',
      '> terminal & web exploration',
      '> Baku, Azerbaijan'
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let delay = 100;

    function type() {
      const current = phrases[phraseIdx];
      if (isDeleting) {
        sub.textContent = current.substring(0, charIdx - 1);
        charIdx--;
        delay = 45;
      } else {
        sub.textContent = current.substring(0, charIdx + 1);
        charIdx++;
        delay = 95;
      }

      if (!isDeleting && charIdx === current.length) {
        delay = 2200; // Pause at end of phrase
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        delay = 400; // Pause before typing next
      }

      setTimeout(type, delay);
    }

    setTimeout(type, 800);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAvatarMorph();
    initAsciiCanvas();
    initAsciiMode();
    initSubtitleTyping();
  });
})();
