/**
 * Core Logic for Abhinaya's Special Surprise
 */

document.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro');
    const lock = document.getElementById('lockScreen');
    const main = document.getElementById('main');
    const passwordInput = document.getElementById('password');
    const timerDisplay = document.getElementById('timer');
    const proposalModal = document.getElementById('proposal-modal');
    const bgVideo = document.getElementById('bg-video');

    // 1. Navigation Functions
    window.goToLock = () => {
        intro.classList.add('hidden');
        setTimeout(() => {
            intro.style.display = 'none';
            lock.style.display = 'flex';
            setTimeout(() => lock.classList.remove('hidden'), 50);
        }, 1000);
        
        // Start video on first interaction
        bgVideo.play().catch(e => console.log("Video blocked"));
    };

    window.checkPassword = () => {
        if (passwordInput.value === "130226") {
            lock.classList.add('hidden');
            setTimeout(() => {
                lock.style.display = 'none';
                main.style.display = 'flex';
                setTimeout(() => main.classList.remove('hidden'), 50);
                startConfetti();
            }, 1000);
        } else {
            passwordInput.style.border = "2px solid #ff4d6d";
            passwordInput.value = "";
            passwordInput.placeholder = "Wrong Secret 💔";
            setTimeout(() => {
                passwordInput.style.border = "1px solid rgba(0,0,0,0.1)";
                passwordInput.placeholder = "Enter Secret 🔐";
            }, 2000);
        }
    };

    // 2. Timer Logic
    const startDate = new Date("2026-02-13T00:00:00");
    const updateTimer = () => {
        const now = new Date();
        const diff = now - startDate;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        timerDisplay.innerHTML = `
            <div>${days} <span style="font-size: 0.5em; text-transform: uppercase;">Days</span></div>
            <div style="font-size: 0.7em; opacity: 0.8;">
                ${hours}h ${minutes}m ${seconds}s of Love
            </div>
        `;
    };
    setInterval(updateTimer, 1000);
    updateTimer();

    // 3. Floating Heart Logic
    const createHeart = () => {
        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.innerHTML = ['❤️', '💖', '💕', '💗', '💓'][Math.floor(Math.random() * 5)];
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.fontSize = (Math.random() * 20 + 10) + 'px';
        heart.style.animationDuration = (Math.random() * 5 + 5) + 's';
        document.body.appendChild(heart);

        setTimeout(() => heart.remove(), 10000);
    };
    setInterval(createHeart, 500);
    
    // 3.5 Floating Floral Logic
    const lilySVGs = [
        `<svg viewBox="0 0 100 100"><path d="M50 90 Q 50 60, 50 40" stroke="#4a4a4a" fill="none" stroke-width="2"/><path d="M50 40 C 30 10, 10 30, 30 40 C 20 60, 45 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><path d="M50 40 C 70 10, 90 30, 70 40 C 80 60, 55 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><circle cx="50" cy="35" r="3" fill="#ffd700"/></svg>`,
        `<svg viewBox="0 0 100 100"><path d="M40 90 Q 40 60, 50 40" stroke="#4a4a4a" fill="none" stroke-width="2"/><path d="M50 40 C 60 10, 85 20, 70 40 C 80 50, 60 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><path d="M50 40 C 40 10, 15 20, 30 40 C 20 50, 40 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><circle cx="50" cy="38" r="2" fill="#ffd700"/></svg>`
    ];

    const sunflowerSVGs = [
        `<svg viewBox="0 0 100 100"><path d="M50 95 Q 45 75, 50 60" stroke="#4a4a4a" fill="none" stroke-width="1.5" /><g transform="translate(50, 60)"><circle cx="0" cy="0" r="8" fill="#5D4037" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(0)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(45)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(90)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(135)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(180)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(225)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(270)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(315)" /></g></svg>`
    ];

    const createFlower = (type) => {
        const flower = document.createElement('div');
        const svgs = type === 'sunflower' ? sunflowerSVGs : lilySVGs;
        flower.classList.add(type === 'sunflower' ? 'floating-sunflower' : 'floating-lily');
        flower.innerHTML = svgs[Math.floor(Math.random() * svgs.length)];
        flower.style.left = Math.random() * 100 + 'vw';
        flower.style.width = (Math.random() * 30 + 30) + 'px';
        flower.style.height = flower.style.width;
        flower.style.animationDuration = (Math.random() * 8 + 10) + 's';
        document.body.appendChild(flower);
        setTimeout(() => flower.remove(), 20000);
    };

    setInterval(() => createFlower('lily'), 2500);
    setInterval(() => createFlower('sunflower'), 4000);

    // 4. Proposal Modal
    window.showProposal = () => {
        proposalModal.style.display = 'flex';
    };

    window.closeProposal = () => {
        proposalModal.style.display = 'none';
    };

    window.yesAnswer = () => {
        const content = document.querySelector('.modal-content');
        content.innerHTML = `
            <h1 style="font-size: 2.5rem;">Yay! 💖</h1>
            <p>You've made me the happiest person alive! I love you forever, Abhinaya.</p>
            <button onclick="closeProposal()">Close 💍</button>
        `;
        startConfetti();
    };

    window.noAnswer = () => {
        const messages = [
            "Please click on Yes 💖",
            "Are you sure? Please click Yes! ✨",
            "Wrong button! Try the Pink one 🌹",
            "Please please please click Yes! 💍",
            "Infinity says you must click Yes! ♾️"
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        alert(randomMsg);

        const noBtn = document.getElementById('no-btn');
        const x = Math.random() * (window.innerWidth - 150);
        const y = Math.random() * (window.innerHeight - 50);
        noBtn.style.position = 'fixed';
        noBtn.style.left = x + 'px';
        noBtn.style.top = y + 'px';
        
        // Make the Yes button grow bigger every time they click No
        const yesBtn = document.getElementById('yes-btn');
        const currentSize = parseFloat(window.getComputedStyle(yesBtn).fontSize);
        yesBtn.style.fontSize = (currentSize + 5) + 'px';
        yesBtn.style.padding = (parseFloat(window.getComputedStyle(yesBtn).padding) + 2) + 'px';
    };

    // 5. Confetti Effect (Simple)
    const startConfetti = () => {
        for(let i=0; i<50; i++) {
            setTimeout(createHeart, i * 50);
            if (i % 6 === 0) setTimeout(() => createFlower('lily'), i * 60);
            if (i % 8 === 0) setTimeout(() => createFlower('sunflower'), i * 70);
        }
    };
});
