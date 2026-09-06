// Navbar scroll effect
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Scroll-triggered animation observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('appear');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in, .slide-up').forEach(el => {
    observer.observe(el);
});

// Interactive quiz option demo
document.querySelectorAll('.quiz-option').forEach(option => {
    option.addEventListener('click', function() {
        if (this.classList.contains('correct')) return;
        document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('wrong'));
        this.classList.add('wrong');
        // Add red style for wrong answers
        this.style.background = 'rgba(239, 68, 68, 0.1)';
        this.style.borderColor = '#ef4444';
        this.style.color = '#ef4444';
        setTimeout(() => {
            this.style.background = '';
            this.style.borderColor = '';
            this.style.color = '';
        }, 1200);
    });
});

// Flashcard flip demo
const flashcardMockup = document.querySelector('.flashcard-mockup');
if (flashcardMockup) {
    let flipped = false;
    flashcardMockup.addEventListener('click', () => {
        const front = flashcardMockup.querySelector('.flashcard-front');
        flashcardMockup.style.transition = 'transform 0.3s ease';
        flashcardMockup.style.transform = 'scale(0.95)';
        setTimeout(() => {
            flashcardMockup.style.transform = '';
            if (!flipped) {
                front.innerHTML = `
                    <span class="tag" style="background:rgba(16,185,129,0.1);color:#10b981;">Meaning</span>
                    <p style="font-size:1.1rem;color:#94a3b8;margin-top:10px;">In contrast to / Against / Toward</p>
                `;
                flipped = true;
            } else {
                front.innerHTML = `
                    <span class="tag">Bunpou</span>
                    <h2>〜に対して</h2>
                `;
                flipped = false;
            }
        }, 150);
    });
}
