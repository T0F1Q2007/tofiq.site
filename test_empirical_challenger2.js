// Empirical JavaScript Test Suite for tofiq.site
// Validates:
// 1. Syntax of animations.js and switcher.js
// 2. animations.js under standard IntersectionObserver environment
// 3. animations.js with prefers-reduced-motion: reduce
// 4. animations.js with IntersectionObserver ABSENT (graceful fallback)
// 5. animations.js scroll progress bar calculation and scroll event handling
// 6. animations.js smooth scrolling and focus management
// 7. switcher.js root pathname resolution and DOM injection
// 8. switcher.js subdirectory (../../) relative routing
// 9. switcher.js active pill marking across all 4 variations
// 10. switcher.js keyboard shortcuts Alt+1 through Alt+4

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ANIMATIONS_SRC = fs.readFileSync(path.join(__dirname, 'js/animations.js'), 'utf8');
const SWITCHER_SRC = fs.readFileSync(path.join(__dirname, 'js/switcher.js'), 'utf8');

let totalTests = 0;
let passedTests = 0;
const testResults = [];

function recordTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    testResults.push({ name, passed: true });
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    testResults.push({ name, passed: false, error: err.message, stack: err.stack });
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

// Robust DOM mock environment
function createMockEnvironment(options = {}) {
  const {
    prefersReduced = false,
    hasIntersectionObserver = true,
    pathname = '/index.html'
  } = options;

  const elementsRegistry = [];

  class MockElement {
    constructor(tagName, id = '', className = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this._className = className;
      this.attributes = new Map();
      if (id) this.attributes.set('id', id);
      if (className) this.attributes.set('class', className);
      this._classes = new Set(className ? className.split(/\s+/).filter(Boolean) : []);
      
      const self = this;
      this.classList = {
        add: function (...cls) {
          cls.forEach(c => self._classes.add(c));
          self._className = Array.from(self._classes).join(' ');
        },
        remove: function (...cls) {
          cls.forEach(c => self._classes.delete(c));
          self._className = Array.from(self._classes).join(' ');
        },
        contains: function (c) {
          return self._classes.has(c);
        },
        get length() {
          return self._classes.size;
        }
      };

      this.style = {};
      this.children = [];
      this.listeners = {};
      this.innerHTML = '';
      this._focused = false;
      this._scrolledIntoView = null;
      elementsRegistry.push(this);
    }

    get className() {
      return this._className;
    }

    set className(val) {
      this._className = String(val);
      this._classes = new Set(this._className.split(/\s+/).filter(Boolean));
      this.attributes.set('class', this._className);
    }

    setAttribute(k, v) {
      this.attributes.set(k, String(v));
      if (k === 'id') this.id = String(v);
      if (k === 'class') {
        this.className = String(v);
      }
    }
    getAttribute(k) {
      return this.attributes.has(k) ? this.attributes.get(k) : null;
    }
    hasAttribute(k) {
      return this.attributes.has(k);
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    addEventListener(evt, fn) {
      if (!this.listeners[evt]) this.listeners[evt] = [];
      this.listeners[evt].push(fn);
    }
    dispatchEvent(event) {
      if (this.listeners[event.type]) {
        this.listeners[event.type].forEach(fn => fn.call(this, event));
      }
    }
    focus(opts) {
      this._focused = true;
      this._focusOpts = opts;
    }
    scrollIntoView(opts) {
      this._scrolledIntoView = opts;
    }
  }

  const docEl = new MockElement('html');
  const bodyEl = new MockElement('body');
  docEl.appendChild(bodyEl);
  docEl.scrollHeight = 3000;
  docEl.clientHeight = 1000;
  docEl.scrollTop = 0;

  const docListeners = {};
  const winListeners = {};

  const documentMock = {
    documentElement: docEl,
    body: bodyEl,
    createElement: function (tag) {
      return new MockElement(tag);
    },
    addEventListener: function (evt, fn) {
      if (!docListeners[evt]) docListeners[evt] = [];
      docListeners[evt].push(fn);
    },
    dispatchDocEvent: function (event) {
      if (docListeners[event.type]) {
        docListeners[event.type].forEach(fn => fn.call(documentMock, event));
      }
    },
    querySelector: function (selector) {
      const results = this.querySelectorAll(selector);
      return results.length > 0 ? results[0] : null;
    },
    querySelectorAll: function (selector) {
      const results = [];
      const parts = selector.split(',').map(s => s.trim());
      for (const el of elementsRegistry) {
        for (const p of parts) {
          if (p === '[data-reveal]' && el.hasAttribute('data-reveal')) {
            results.push(el);
            break;
          } else if (p === '[data-stagger]' && el.hasAttribute('data-stagger')) {
            results.push(el);
            break;
          } else if (p === '.scroll-progress-bar' && el.classList.contains('scroll-progress-bar')) {
            results.push(el);
            break;
          } else if (p === '.g-variation-switcher' && el.classList.contains('g-variation-switcher')) {
            results.push(el);
            break;
          } else if (p === 'a[href^="#"]') {
            if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').startsWith('#')) {
              results.push(el);
              break;
            }
          } else if (p.startsWith('#') && el.id === p.substring(1)) {
            results.push(el);
            break;
          }
        }
      }
      return results;
    }
  };

  const observersCreated = [];
  class MockIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observedElements = [];
      this.unobservedElements = [];
      observersCreated.push(this);
    }
    observe(target) {
      this.observedElements.push(target);
    }
    unobserve(target) {
      this.unobservedElements.push(target);
    }
    disconnect() {
      this.observedElements = [];
    }
    triggerIntersection(entries) {
      this.callback(entries, this);
    }
  }

  let scheduledRafCallbacks = [];
  const windowMock = {
    location: {
      pathname: pathname,
      href: `https://tofiq.site${pathname}`
    },
    scrollY: 0,
    matchMedia: function (query) {
      if (query === '(prefers-reduced-motion: reduce)') {
        return { matches: !!prefersReduced };
      }
      return { matches: false };
    },
    addEventListener: function (evt, fn) {
      if (!winListeners[evt]) winListeners[evt] = [];
      winListeners[evt].push(fn);
    },
    dispatchWinEvent: function (event) {
      if (winListeners[event.type]) {
        winListeners[event.type].forEach(fn => fn.call(windowMock, event));
      }
    },
    requestAnimationFrame: function (cb) {
      scheduledRafCallbacks.push(cb);
    },
    flushRaf: function () {
      const callbacks = scheduledRafCallbacks;
      scheduledRafCallbacks = [];
      callbacks.forEach(cb => cb());
    }
  };

  if (hasIntersectionObserver) {
    windowMock.IntersectionObserver = MockIntersectionObserver;
  }

  const context = vm.createContext({
    window: windowMock,
    document: documentMock,
    console: console,
    IntersectionObserver: hasIntersectionObserver ? MockIntersectionObserver : undefined
  });

  return {
    context,
    window: windowMock,
    document: documentMock,
    MockElement,
    observersCreated,
    triggerDOMContentLoaded: () => documentMock.dispatchDocEvent({ type: 'DOMContentLoaded' }),
    triggerScroll: (scrollY) => {
      windowMock.scrollY = scrollY;
      windowMock.dispatchWinEvent({ type: 'scroll' });
      windowMock.flushRaf();
    },
    triggerKeydown: (key, altKey = false) => {
      let defaultPrevented = false;
      const event = {
        type: 'keydown',
        key,
        altKey,
        preventDefault: () => { defaultPrevented = true; }
      };
      windowMock.dispatchWinEvent(event);
      return { defaultPrevented };
    }
  };
}

console.log('======================================================================');
console.log('  EMPIRICAL CHALLENGER 2: JAVASCRIPT VERIFICATION HARNESS');
console.log('======================================================================\n');

// 1. Syntax Validation
recordTest('JS-01: animations.js syntax compiles cleanly without errors', () => {
  new vm.Script(ANIMATIONS_SRC, { filename: 'animations.js' });
});

recordTest('JS-02: switcher.js syntax compiles cleanly without errors', () => {
  new vm.Script(SWITCHER_SRC, { filename: 'switcher.js' });
});

// 2. Normal IntersectionObserver Reveal Flow
recordTest('JS-03: animations.js observes [data-reveal] & [data-stagger] and reveals on intersection', () => {
  const env = createMockEnvironment({ prefersReduced: false, hasIntersectionObserver: true });
  
  const el1 = new env.MockElement('div');
  el1.setAttribute('data-reveal', '');
  const el2 = new env.MockElement('div');
  el2.setAttribute('data-stagger', '');

  vm.runInContext(ANIMATIONS_SRC, env.context);
  assert.strictEqual(env.document.documentElement.classList.contains('reduced-motion'), false, 'Should not add reduced-motion');

  env.triggerDOMContentLoaded();

  assert.strictEqual(env.observersCreated.length, 1, 'IntersectionObserver should be instantiated once');
  const observer = env.observersCreated[0];
  assert.strictEqual(observer.options.threshold, 0.08, 'Threshold must be 0.08');
  assert.strictEqual(observer.options.rootMargin, '0px 0px -40px 0px', 'RootMargin must match expected');
  assert.strictEqual(observer.observedElements.length, 2, 'Observer must observe both reveal and stagger elements');

  observer.triggerIntersection([
    { target: el1, isIntersecting: true },
    { target: el2, isIntersecting: false }
  ]);

  assert.strictEqual(el1.classList.contains('is-visible'), true, 'Intersecting element must have is-visible class');
  assert.strictEqual(observer.unobservedElements.includes(el1), true, 'Intersecting element must be unobserved');
  assert.strictEqual(el2.classList.contains('is-visible'), false, 'Non-intersecting element must not have is-visible class');
});

// 3. prefers-reduced-motion Handling
recordTest('JS-04: animations.js respects prefers-reduced-motion: reduce immediately and avoids observer', () => {
  const env = createMockEnvironment({ prefersReduced: true, hasIntersectionObserver: true });
  
  const el1 = new env.MockElement('div');
  el1.setAttribute('data-reveal', '');
  const el2 = new env.MockElement('div');
  el2.setAttribute('data-stagger', '');

  vm.runInContext(ANIMATIONS_SRC, env.context);

  assert.strictEqual(env.document.documentElement.classList.contains('reduced-motion'), true, 'Must add reduced-motion class to root');
  assert.strictEqual(el1.classList.contains('is-visible'), true, 'data-reveal must be immediately visible under reduced-motion');
  assert.strictEqual(el2.classList.contains('is-visible'), true, 'data-stagger must be immediately visible under reduced-motion');
  assert.strictEqual(env.observersCreated.length, 0, 'Must NOT instantiate IntersectionObserver when reduced-motion is requested');
});

// 4. Absence of IntersectionObserver (Graceful Fallback)
recordTest('JS-05: animations.js gracefully falls back when IntersectionObserver is undefined', () => {
  const env = createMockEnvironment({ prefersReduced: false, hasIntersectionObserver: false });
  
  const el1 = new env.MockElement('div');
  el1.setAttribute('data-reveal', '');
  const el2 = new env.MockElement('div');
  el2.setAttribute('data-stagger', '');

  vm.runInContext(ANIMATIONS_SRC, env.context);
  assert.strictEqual(el1.classList.contains('is-visible'), false, 'Not yet visible before DOMContentLoaded');

  env.triggerDOMContentLoaded();

  assert.strictEqual(el1.classList.contains('is-visible'), true, 'Fallback must reveal data-reveal on DOMContentLoaded');
  assert.strictEqual(el2.classList.contains('is-visible'), true, 'Fallback must reveal data-stagger on DOMContentLoaded');
});

// 5. Scroll Progress Bar
recordTest('JS-06: animations.js scroll progress bar calculates percentage correctly', () => {
  const env = createMockEnvironment();
  const progressBar = new env.MockElement('div', '', 'scroll-progress-bar');

  vm.runInContext(ANIMATIONS_SRC, env.context);
  env.triggerDOMContentLoaded();

  // Scroll 1: scrollY = 1000 / 2000 = 50%
  env.triggerScroll(1000);
  assert.strictEqual(progressBar.style.width, '50%', 'Progress bar should be at 50%');

  // Scroll 2: scrollY = 2000 / 2000 = 100%
  env.triggerScroll(2000);
  assert.strictEqual(progressBar.style.width, '100%', 'Progress bar should be at 100%');
});

// 6. Smooth Scrolling Anchor Navigation & Reduced Motion Behavior
recordTest('JS-07: animations.js anchor navigation performs smooth scrolling and accessible focus', () => {
  const env = createMockEnvironment({ prefersReduced: false });
  const link = new env.MockElement('a');
  link.setAttribute('href', '#projects');
  const target = new env.MockElement('section', 'projects');

  vm.runInContext(ANIMATIONS_SRC, env.context);
  env.triggerDOMContentLoaded();

  let prevented = false;
  link.dispatchEvent({
    type: 'click',
    preventDefault: () => { prevented = true; }
  });

  assert.strictEqual(prevented, true, 'Link click should call preventDefault()');
  assert.ok(target._scrolledIntoView, 'scrollIntoView should be called');
  assert.strictEqual(target._scrolledIntoView.behavior, 'smooth');
  assert.strictEqual(target._scrolledIntoView.block, 'start');
  assert.strictEqual(target.getAttribute('tabindex'), '-1', 'Target must have tabindex="-1"');
  assert.strictEqual(target._focused, true, 'Target must receive focus');
});

recordTest('JS-08: animations.js anchor navigation uses auto scroll behavior when prefers-reduced-motion is true', () => {
  const env = createMockEnvironment({ prefersReduced: true });
  const link = new env.MockElement('a');
  link.setAttribute('href', '#about');
  const target = new env.MockElement('section', 'about');

  vm.runInContext(ANIMATIONS_SRC, env.context);
  env.triggerDOMContentLoaded();

  link.dispatchEvent({
    type: 'click',
    preventDefault: () => {}
  });

  assert.ok(target._scrolledIntoView, 'scrollIntoView should be called');
  assert.strictEqual(target._scrolledIntoView.behavior, 'auto');
  assert.strictEqual(target._scrolledIntoView.block, 'start');
});

// 7. Switcher Root Path Detection
recordTest('JS-09: switcher.js creates dock and activates Search variation at root path', () => {
  const env = createMockEnvironment({ pathname: '/index.html' });
  
  vm.runInContext(SWITCHER_SRC, env.context);
  env.triggerDOMContentLoaded();

  const switcher = env.document.querySelector('.g-variation-switcher');
  assert.ok(switcher, 'Switcher nav element must be created');
  assert.strictEqual(switcher.getAttribute('aria-label'), 'Design variation switcher');
  assert.ok(switcher.innerHTML.includes('svg viewBox="0 0 24 24"'), 'Google G logo SVG must be rendered');
  assert.ok(switcher.innerHTML.includes('data-var="search"'), 'Search pill must be present');
  assert.ok(switcher.innerHTML.includes('class="switcher-pill is-active" data-var="search"'), 'Search pill must be active');
  assert.ok(switcher.innerHTML.includes('href="./index-bento.html"'), 'Root links must use ./ prefix');
});

// 8. Switcher Subdirectory Path Detection
recordTest('JS-10: switcher.js correctly activates Bento and uses ../../ prefix in subdirectory', () => {
  const env = createMockEnvironment({ pathname: '/variations/bento/index.html' });
  
  vm.runInContext(SWITCHER_SRC, env.context);
  env.triggerDOMContentLoaded();

  const switcher = env.document.querySelector('.g-variation-switcher');
  assert.ok(switcher, 'Switcher nav element must be created');
  assert.ok(switcher.innerHTML.includes('class="switcher-pill is-active" data-var="bento"'), 'Bento pill must be active');
  assert.ok(switcher.innerHTML.includes('href="../../index-search.html"'), 'Subdirectory links must use ../../ prefix');
});

// 9. Switcher Variation Mapping for all 4 layouts
recordTest('JS-11: switcher.js maps all 4 layouts correctly (search, bento, workspace, linktree)', () => {
  const tests = [
    { path: '/index-search.html', expectedVar: 'search' },
    { path: '/index-bento.html', expectedVar: 'bento' },
    { path: '/index-workspace.html', expectedVar: 'workspace' },
    { path: '/index-linktree.html', expectedVar: 'linktree' },
    { path: '/variations/workspace/index.html', expectedVar: 'workspace' },
    { path: '/variations/linktree/index.html', expectedVar: 'linktree' }
  ];

  for (const t of tests) {
    const env = createMockEnvironment({ pathname: t.path });
    vm.runInContext(SWITCHER_SRC, env.context);
    env.triggerDOMContentLoaded();
    const switcher = env.document.querySelector('.g-variation-switcher');
    assert.ok(
      switcher.innerHTML.includes(`class="switcher-pill is-active" data-var="${t.expectedVar}"`),
      `Path ${t.path} must activate ${t.expectedVar}`
    );
  }
});

// 10. Switcher Keyboard Shortcuts Alt+1 through Alt+4
recordTest('JS-12: switcher.js navigates via keyboard shortcuts Alt+1 through Alt+4', () => {
  const env = createMockEnvironment({ pathname: '/index.html' });
  vm.runInContext(SWITCHER_SRC, env.context);
  env.triggerDOMContentLoaded();

  // Test Alt+1 -> search
  let res = env.triggerKeydown('1', true);
  assert.strictEqual(res.defaultPrevented, true);
  assert.strictEqual(env.window.location.href, './index-search.html');

  // Test Alt+2 -> bento
  res = env.triggerKeydown('2', true);
  assert.strictEqual(res.defaultPrevented, true);
  assert.strictEqual(env.window.location.href, './index-bento.html');

  // Test Alt+3 -> workspace
  res = env.triggerKeydown('3', true);
  assert.strictEqual(res.defaultPrevented, true);
  assert.strictEqual(env.window.location.href, './index-workspace.html');

  // Test Alt+4 -> linktree
  res = env.triggerKeydown('4', true);
  assert.strictEqual(res.defaultPrevented, true);
  assert.strictEqual(env.window.location.href, './index-linktree.html');

  // Test without Alt: should not navigate or prevent default
  env.window.location.href = 'before';
  res = env.triggerKeydown('1', false);
  assert.strictEqual(res.defaultPrevented, false);
  assert.strictEqual(env.window.location.href, 'before');

  // Test Alt+5: out of range, should not navigate
  res = env.triggerKeydown('5', true);
  assert.strictEqual(res.defaultPrevented, false);
  assert.strictEqual(env.window.location.href, 'before');
});

console.log('\n----------------------------------------------------------------------');
console.log(`JS Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('----------------------------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🎉 ALL JAVASCRIPT EMPIRICAL VERIFICATION TESTS PASSED!\n');
}
