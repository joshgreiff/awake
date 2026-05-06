/**
 * Simple confetti effect for celebrating completions
 * Uses CSS animations - no external dependencies
 */

export function triggerConfetti() {
  const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#10b981'];
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const animationDuration = 1 + Math.random() * 2;
    const size = 6 + Math.random() * 6;
    
    confetti.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      left: ${left}%;
      top: -20px;
      opacity: 1;
      animation: confetti-fall ${animationDuration}s ease-out forwards;
    `;
    
    container.appendChild(confetti);
  }

  // Add the animation keyframes if not already present
  if (!document.getElementById('confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Clean up after animation
  setTimeout(() => {
    container.remove();
  }, 3500);
}

export function triggerSmallCelebration() {
  const colors = ['#6366f1', '#14b8a6', '#10b981'];
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(container);

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = (i / 12) * Math.PI * 2;
    const distance = 50 + Math.random() * 30;
    
    particle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${color};
      border-radius: 50%;
      left: 50%;
      top: 50%;
      opacity: 1;
      animation: particle-burst 0.6s ease-out forwards;
      --tx: ${Math.cos(angle) * distance}px;
      --ty: ${Math.sin(angle) * distance}px;
    `;
    
    container.appendChild(particle);
  }

  if (!document.getElementById('particle-styles')) {
    const style = document.createElement('style');
    style.id = 'particle-styles';
    style.textContent = `
      @keyframes particle-burst {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        50% {
          opacity: 1;
        }
        100% {
          transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    container.remove();
  }, 700);
}
