document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  
  // Calculate and update background position based on scroll
  const updateBackground = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    if (maxScroll > 0) {
      // scrollFraction is between 0 (top) and 1 (bottom)
      let scrollFraction = scrollTop / maxScroll;
      
      // Clamp to ensure it stays between 0 and 1
      scrollFraction = Math.max(0, Math.min(1, scrollFraction));
      
      // Map to 0% - 100% background-position-y
      body.style.backgroundPosition = `50% ${scrollFraction * 100}%`;
    }
  };

  // Initial call to set correct position on load
  updateBackground();

  // Listen to scroll events
  window.addEventListener('scroll', updateBackground, { passive: true });
});
