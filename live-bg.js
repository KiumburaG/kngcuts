// KNGCuts - Ambient Live Background
// Floating gold particles with glow and connections, adapts to light/dark mode

(function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'liveBg';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;
    let animId;
    let isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    function checkTheme() {
        isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function createParticles() {
        const count = Math.min(Math.floor((w * h) / 12000), 80);
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 3 + 1.5,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.3 - 0.1,
                opacity: Math.random() * 0.4 + 0.6,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.015 + 0.008,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        checkTheme();

        const lineAlpha = isDark ? 0.12 : 0.07;
        const glowStrength = isDark ? 0.25 : 0.12;
        const coreAlpha = isDark ? 0.6 : 0.35;

        // Draw connections between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 180) {
                    const alpha = (1 - dist / 180) * lineAlpha;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(particles[i].x, particles[j].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw particles
        particles.forEach(p => {
            p.pulse += p.pulseSpeed;
            const pulseFactor = 0.5 + 0.5 * Math.sin(p.pulse);
            const currentOpacity = p.opacity * (0.7 + 0.3 * pulseFactor);

            // Outer glow
            const glowRadius = p.r * 8;
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
            gradient.addColorStop(0, `rgba(212, 175, 55, ${currentOpacity * glowStrength})`);
            gradient.addColorStop(0.4, `rgba(212, 175, 55, ${currentOpacity * glowStrength * 0.3})`);
            gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Core particle
            ctx.beginPath();
            ctx.fillStyle = `rgba(212, 175, 55, ${currentOpacity * coreAlpha})`;
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();

            // Bright center dot
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 225, 100, ${currentOpacity * coreAlpha * 0.8})`;
            ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;
        });

        animId = requestAnimationFrame(draw);
    }

    // Pause when tab not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animId);
        } else {
            draw();
        }
    });

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });

    resize();
    createParticles();
    draw();
})();
