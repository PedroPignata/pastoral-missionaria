import confetti from 'canvas-confetti';

export function triggerPastoralConfetti() {
  const colors = ['#B68B4B', '#D4AF37', '#8E303B', '#FAF3E9', '#3C2D29'];
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
  });
}

