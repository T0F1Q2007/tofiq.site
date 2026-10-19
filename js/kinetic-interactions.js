/**
 * KINETIC INTERACTIONS CONTROLLER — js/kinetic-interactions.js
 * Implements:
 *  1. Lenis Smooth Momentum Scrolling & Top Scroll Progress Bar
 *  2. Dynamic Sliding Pill Segmented Navigation with Section Spy
 *  3. Interactive Avatar Art-Style Switcher (Original, Cyberpunk, Emerald, Mono)
 *  4. True 3D Multi-Layer Perspective Tilt Cards & Radial Cursor Spotlight
 *  5. Magnetic Button Pull Physics
 *  6. Technical Stack Bento Filtering
 *  7. Clipboard Email Copy & Print / Export CV Triggers
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================================
     1. LENIS SMOOTH MOMENTUM SCROLL & SCROLL PROGRESS BAR
     ======================================================================== */
  let lenisInstance = null;
  const progressBar = document.getElementById('scrollProgressBar');

  function initSmoothScroll() {
    if (typeof window.Lenis !== 'undefined' && !prefersReducedMotion) {
      lenisInstance = new window.Lenis({
        duration: 1.15,
        easing: function (t) {
          return Math.min(1, 1.001 - Math.pow(2, -10 * t));
        },
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 1.8
      });

      function raf(time) {
        lenisInstance.raf(time);
        window.requestAnimationFrame(raf);
      }
      window.requestAnimationFrame(raf);
    }

    // Smooth anchor navigation clicks
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (!targetEl) return;

        e.preventDefault();
        if (lenisInstance) {
          lenisInstance.scrollTo(targetEl, { offset: -84 });
        } else {
          targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      });
    });

    // Update top scroll progress bar
    function updateScrollProgress() {
      if (!progressBar) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
      progressBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();
  }

  /* ========================================================================
     2. DYNAMIC SLIDING PILL SEGMENTED NAVIGATION
     ======================================================================== */
  function initSlidingPillNav() {
    const pillContainer = document.getElementById('navPillContainer');
    const slidingPill = document.getElementById('navSlidingPill');
    const navLinks = Array.from(document.querySelectorAll('.nav-link[data-section]'));
    if (!pillContainer || !slidingPill || navLinks.length === 0) return;

    let activeLink = document.querySelector('.nav-link.is-active') || navLinks[0];

    function movePillToLink(linkEl) {
      if (!linkEl) return;
      const containerRect = pillContainer.getBoundingClientRect();
      const linkRect = linkEl.getBoundingClientRect();
      const offsetLeft = linkRect.left - containerRect.left + pillContainer.scrollLeft;

      slidingPill.style.width = linkRect.width + 'px';
      slidingPill.style.transform = 'translate3d(' + offsetLeft + 'px, 0, 0)';
    }

    // Hover preview & restore active on mouseleave
    navLinks.forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        movePillToLink(link);
      });
      link.addEventListener('focus', function () {
        movePillToLink(link);
      });
      link.addEventListener('click', function () {
        navLinks.forEach(function (l) { l.classList.remove('is-active'); });
        link.classList.add('is-active');
        activeLink = link;
        movePillToLink(activeLink);
      });
    });

    pillContainer.addEventListener('mouseleave', function () {
      movePillToLink(activeLink);
    });

    // Section spy via IntersectionObserver
    const sections = navLinks
      .map(function (link) {
        return document.getElementById(link.getAttribute('data-section'));
      })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length > 0) {
      const sectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute('id');
              const matchingLink = document.querySelector('.nav-link[data-section="' + id + '"]');
              if (matchingLink) {
                navLinks.forEach(function (l) { l.classList.remove('is-active'); });
                matchingLink.classList.add('is-active');
                activeLink = matchingLink;
                movePillToLink(activeLink);
              }
            }
          });
        },
        {
          rootMargin: '-30% 0px -55% 0px',
          threshold: 0.01
        }
      );

      sections.forEach(function (sec) {
        sectionObserver.observe(sec);
      });
    }

    window.addEventListener('resize', function () {
      movePillToLink(activeLink);
    }, { passive: true });

    // Initial positioning after layout paint
    window.requestAnimationFrame(function () {
      movePillToLink(activeLink);
    });
  }

  /* ========================================================================
     3. INTERACTIVE AVATAR ART-STYLE SWITCHER
     ======================================================================== */
  function initAvatarStyleSwitcher() {
    const avatarImages = Array.from(document.querySelectorAll('.avatar-img[data-style-index]'));
    const stylePills = Array.from(document.querySelectorAll('.style-pill[data-avatar-target]'));
    const modeLabel = document.getElementById('avatarModeLabel');
    const cycleBtn = document.getElementById('avatarCycleBtn');
    const viewport = document.getElementById('avatarViewport');

    if (avatarImages.length === 0) return;

    let currentStyleIndex = 0;

    function setAvatarStyle(index) {
      currentStyleIndex = ((index % avatarImages.length) + avatarImages.length) % avatarImages.length;

      avatarImages.forEach(function (img, idx) {
        const isMatch = idx === currentStyleIndex;
        img.classList.toggle('is-active', isMatch);
        if (isMatch && modeLabel) {
          modeLabel.textContent = img.getAttribute('data-style-name') || 'RENDER // ACTIVE';
        }
      });

      stylePills.forEach(function (pill, idx) {
        const isMatch = idx === currentStyleIndex;
        pill.classList.toggle('is-active', isMatch);
        pill.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });
    }

    stylePills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        const targetIndex = parseInt(pill.getAttribute('data-avatar-target'), 10);
        if (!isNaN(targetIndex)) {
          setAvatarStyle(targetIndex);
        }
      });
    });

    if (cycleBtn) {
      cycleBtn.addEventListener('click', function () {
        setAvatarStyle(currentStyleIndex + 1);
      });
    }

    if (viewport) {
      viewport.addEventListener('click', function () {
        setAvatarStyle(currentStyleIndex + 1);
      });
    }
  }

  /* ========================================================================
     4. TRUE 3D PERSPECTIVE TILT CARDS & RADIAL SPOTLIGHT SHADER
     ======================================================================== */
  function initTiltAndSpotlightCards() {
    const spotlightCards = document.querySelectorAll('.spotlight-card');
    const tiltCards = document.querySelectorAll('.tilt-card');

    // Radial cursor spotlight tracking
    spotlightCards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');
        card.style.setProperty('--spotlight-opacity', '1');
      }, { passive: true });

      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--spotlight-opacity', '0');
      }, { passive: true });
    });

    if (prefersReducedMotion) return;

    // 3D Multi-Layer Perspective Tilt calculation
    tiltCards.forEach(function (card) {
      const maxTilt = parseFloat(card.getAttribute('data-tilt-max')) || 6;

      card.addEventListener('mouseenter', function () {
        card.classList.add('is-tilting');
      }, { passive: true });

      card.addEventListener('mousemove', function (e) {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const normX = (e.clientX - centerX) / (rect.width / 2);
        const normY = (e.clientY - centerY) / (rect.height / 2);

        const rotateX = (-normY * maxTilt).toFixed(2);
        const rotateY = (normX * maxTilt).toFixed(2);

        card.style.setProperty('--rotate-x', rotateX + 'deg');
        card.style.setProperty('--rotate-y', rotateY + 'deg');
      }, { passive: true });

      card.addEventListener('mouseleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rotate-x', '0deg');
        card.style.setProperty('--rotate-y', '0deg');
      }, { passive: true });
    });
  }

  /* ========================================================================
     5. MAGNETIC BUTTON PULL MICRO-INTERACTION
     ======================================================================== */
  function initMagneticButtons() {
    if (prefersReducedMotion) return;

    const magneticButtons = document.querySelectorAll('.magnetic-btn');
    magneticButtons.forEach(function (btn) {
      const strength = parseFloat(btn.getAttribute('data-magnetic-strength')) || 0.22;

      btn.addEventListener('mousemove', function (e) {
        const rect = btn.getBoundingClientRect();
        const deltaX = (e.clientX - (rect.left + rect.width / 2)) * strength;
        const deltaY = (e.clientY - (rect.top + rect.height / 2)) * strength;
        btn.style.transform = 'translate3d(' + deltaX.toFixed(2) + 'px, ' + deltaY.toFixed(2) + 'px, 0)';
      }, { passive: true });

      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate3d(0px, 0px, 0px)';
      }, { passive: true });
    });
  }

  /* ========================================================================
     6. TECHNICAL STACK FILTERING & VIEWPORT STAGGERED REVEALS
     ======================================================================== */
  function initStackFilterAndReveals() {
    const filterButtons = Array.from(document.querySelectorAll('.stack-filter-btn[data-stack-filter]'));
    const stackCards = Array.from(document.querySelectorAll('.stack-card[data-stack-category]'));

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const category = btn.getAttribute('data-stack-filter');

        filterButtons.forEach(function (b) {
          const isCurrent = b === btn;
          b.classList.toggle('is-active', isCurrent);
          b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        });

        stackCards.forEach(function (card) {
          const cardCat = card.getAttribute('data-stack-category');
          const shouldShow = category === 'all' || cardCat === category;
          card.classList.toggle('is-filtered-out', !shouldShow);
        });
      });
    });

    // Viewport Reveal Observer
    const revealItems = document.querySelectorAll('.reveal-item');
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      const revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              const delay = parseInt(entry.target.getAttribute('data-reveal-delay'), 10) || 0;
              if (delay > 0) {
                window.setTimeout(function () {
                  entry.target.classList.add('is-revealed');
                }, delay);
              } else {
                entry.target.classList.add('is-revealed');
              }
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );

      revealItems.forEach(function (el) {
        revealObserver.observe(el);
      });
    } else {
      revealItems.forEach(function (el) {
        el.classList.add('is-revealed');
      });
    }
  }

  /* ========================================================================
     7. UTILITIES: COPY EMAIL, PRINT CV & DYNAMIC YEAR
     ======================================================================== */
  function initUtilities() {
    // Dynamic Copyright Year
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
      yearSpan.textContent = String(new Date().getFullYear());
    }

    // Print / Export CV buttons
    const printButtons = ['headerPrintBtn', 'heroPrintBtn', 'footerPrintBtn'];
    printButtons.forEach(function (id) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', function () {
          window.print();
        });
      }
    });

    // Copy Email with tactile confirmation state
    const copyEmailBtn = document.getElementById('copyEmailBtn');
    const copyEmailText = document.getElementById('copyEmailText');
    if (copyEmailBtn && copyEmailText) {
      copyEmailBtn.addEventListener('click', function () {
        const email = copyEmailBtn.getAttribute('data-email') || 'velizadetofiq1@gmail.com';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(function () {
            copyEmailText.textContent = 'Copied to Clipboard ✓';
            window.setTimeout(function () {
              copyEmailText.textContent = 'Copy ' + email;
            }, 2600);
          }).catch(function () {
            window.location.href = 'mailto:' + email;
          });
        } else {
          window.location.href = 'mailto:' + email;
        }
      });
    }
  }

  /* ========================================================================
     BOOTSTRAP ALL KINETIC SUBSYSTEMS
     ======================================================================== */
  function bootstrap() {
    initSmoothScroll();
    initSlidingPillNav();
    initAvatarStyleSwitcher();
    initTiltAndSpotlightCards();
    initMagneticButtons();
    initStackFilterAndReveals();
    initUtilities();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();