// ===========================
// Sidebar Toggle
// ===========================
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mainContent = document.querySelector('.main-content');

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }
    });
}

// Close sidebar on mobile overlay click
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// ===========================
// Scroll animations
// ===========================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('appear');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in, .slide-up').forEach(el => observer.observe(el));

// ===========================
// Score bar Tab Toggle (Kotoba / Bunpou)
// ===========================
const tabKotoba = document.getElementById('tab-kotoba');
const tabBunpou = document.getElementById('tab-bunpou');
const kotobaScores = document.getElementById('kotoba-scores');
const bunpouScores = document.getElementById('bunpou-scores');

if (tabKotoba && tabBunpou) {
    tabKotoba.addEventListener('click', () => {
        tabKotoba.classList.add('active');
        tabBunpou.classList.remove('active');
        kotobaScores.classList.remove('hidden');
        bunpouScores.classList.add('hidden');
        animateScoreBars(kotobaScores);
    });

    tabBunpou.addEventListener('click', () => {
        tabBunpou.classList.add('active');
        tabKotoba.classList.remove('active');
        bunpouScores.classList.remove('hidden');
        kotobaScores.classList.add('hidden');
        animateScoreBars(bunpouScores);
    });
}

function animateScoreBars(container) {
    container.querySelectorAll('.score-bar-fill').forEach(bar => {
        const targetWidth = bar.style.width;
        bar.style.width = '0';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.width = targetWidth;
            });
        });
    });
}

// Animate bars on page load
window.addEventListener('load', () => {
    animateScoreBars(kotobaScores || document.getElementById('kotoba-scores'));
});

// ===========================
// Lesson resume/start buttons
// ===========================
document.querySelectorAll('.lesson-item button').forEach(btn => {
    btn.addEventListener('click', function () {
        const lessonItem = this.closest('.lesson-item');
        const lessonName = lessonItem.querySelector('.lesson-name')?.textContent;
        // Simulate navigation — placeholder toast notification
        showToast(`Opening: ${lessonName}`);
    });
});

// ===========================
// Toast notification
// ===========================
function showToast(message) {
    let toast = document.getElementById('dashboard-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'dashboard-toast';
        toast.style.cssText = `
            position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(80px);
            background: rgba(30,41,59,0.95); border: 1px solid rgba(99,102,241,0.3);
            color: #f8fafc; padding: 14px 24px; border-radius: 14px; font-family: 'Outfit', sans-serif;
            font-weight: 600; font-size: 0.9rem; z-index: 9999; backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.4); transition: transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.4s;
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(80px)';
        toast.style.opacity = '0';
    }, 2500);
}

// Notification button
const notifBtn = document.getElementById('notif-btn');
if (notifBtn) {
    notifBtn.addEventListener('click', () => {
        showToast('🔔 2 new reminders — Keep your streak going!');
    });
}
