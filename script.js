// Custom Cursor
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    
    setTimeout(() => {
        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    }, 50);
});

// Add hover effect to interactive elements
const interactives = document.querySelectorAll('a, button, input, textarea, .skill-card, .project-card, .timeline-item');
interactives.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
        follower.style.transform = 'translate(-50%, -50%) scale(1.5)';
        follower.style.borderColor = 'var(--primary-color)';
    });
    el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        follower.style.transform = 'translate(-50%, -50%) scale(1)';
        follower.style.borderColor = 'var(--secondary-color)';
    });
});

// Typing Effect
const titles = ["AIML Student", "AI Enthusiast", "Creative Developer"];
const typingText = document.querySelector('.typing-text');
let titleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function type() {
    const currentTitle = titles[titleIndex];
    
    if (isDeleting) {
        typingText.textContent = currentTitle.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingText.textContent = currentTitle.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentTitle.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        titleIndex = (titleIndex + 1) % titles.length;
        typeSpeed = 500; // Pause before next word
    }

    setTimeout(type, typeSpeed);
}

document.addEventListener('DOMContentLoaded', () => {
    if(typingText) setTimeout(type, 1000);
});

// Scroll Reveal
function reveal() {
    var reveals = document.querySelectorAll(".reveal");
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}
window.addEventListener("scroll", reveal);
reveal(); // Trigger on load

// Canvas Particles (Lightweight)
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
setCanvasSize();

const particles = [];
for(let i=0; i<50; i++) {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 1 - 0.5
    });
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
    particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if(p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if(p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(animateParticles);
}
animateParticles();

window.addEventListener('resize', setCanvasSize);

// Form Submission
const form = document.getElementById('contact-form');
if(form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        btn.textContent = 'Message Sent!';
        btn.style.backgroundColor = 'var(--primary-color)';
        btn.style.color = '#000';
        setTimeout(() => {
            btn.textContent = 'Send Message';
            btn.style.backgroundColor = 'transparent';
            btn.style.color = 'var(--primary-color)';
            form.reset();
        }, 3000);
    });
}
