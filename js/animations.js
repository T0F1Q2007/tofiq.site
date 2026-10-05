/**
 * Vanilla Scroll Reveal and Interaction Engine
 * Zero external dependencies | 100% Client-Side | Zero Tracking
 * tofiq.site
 */

(function () {
  'use strict';

  // 1. Accessibility Motion Check
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    document.documentElement.classList.add('reduced-motion');
    // Reveal all elements immediately
    var allHidden = document.querySelectorAll('[data-reveal], [data-stagger]');
    for (var i = 0; i < allHidden.length; i++) {
      allHidden[i].classList.add('is-visible');
    }
  } else if ('IntersectionObserver' in window) {
    // 2. IntersectionObserver for Reveal Animations
    var observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    };

    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.addEventListener('DOMContentLoaded', function () {
      var revealTargets = document.querySelectorAll('[data-reveal], [data-stagger]');
      revealTargets.forEach(function (el) {
        revealObserver.observe(el);
      });
    });
  } else {
    // Fallback for older browsers
    document.addEventListener('DOMContentLoaded', function () {
      var targets = document.querySelectorAll('[data-reveal], [data-stagger]');
      targets.forEach(function (el) {
        el.classList.add('is-visible');
      });
    });
  }

  // 3. Scroll Progress Indicator Bar
  document.addEventListener('DOMContentLoaded', function () {
    var progressBar = document.querySelector('.scroll-progress-bar');
    if (!progressBar) return;

    var ticking = false;

    function updateProgressBar() {
      var winScroll = window.scrollY || document.documentElement.scrollTop;
      var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (height > 0) {
        var scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateProgressBar);
        ticking = true;
      }
    }, { passive: true });
  });

  // 4. Smooth Anchor Scrolling & Focus Management
  document.addEventListener('DOMContentLoaded', function () {
    var internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;
        var targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: prefersReduced ? 'auto' : 'smooth',
            block: 'start'
          });
          targetElement.setAttribute('tabindex', '-1');
          targetElement.focus({ preventScroll: true });
        }
      });
    });
  });
})();
