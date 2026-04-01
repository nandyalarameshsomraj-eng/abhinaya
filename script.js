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
        
        // Random responsive size
        const baseSize = window.innerWidth < 600 ? 25 : 35;
        const size = (Math.random() * 20 + baseSize) + 'px';
        
        flower.style.left = Math.random() * 100 + 'vw';
        flower.style.width = size;
        flower.style.height = size;
        flower.style.animationDuration = (Math.random() * 8 + 10) + 's';
        document.body.appendChild(flower);
        setTimeout(() => flower.remove(), 20000);
    };

    // Adjust spawning based on screen size
    const floralFrequency = window.innerWidth < 600 ? 6000 : 3000;
    const heartFrequency = window.innerWidth < 600 ? 1500 : 700;

    let flowerInterval = setInterval(() => {
        createFlower(Math.random() > 0.4 ? 'lily' : 'sunflower');
    }, floralFrequency);

    let heartInterval = setInterval(createHeart, heartFrequency);

    // Re-adjust on resize
    window.addEventListener('resize', () => {
        clearInterval(flowerInterval);
        clearInterval(heartInterval);
        const newFloralFreq = window.innerWidth < 600 ? 6000 : 3000;
        const newHeartFreq = window.innerWidth < 600 ? 1500 : 700;
        flowerInterval = setInterval(() => {
            createFlower(Math.random() > 0.4 ? 'lily' : 'sunflower');
        }, newFloralFreq);
        heartInterval = setInterval(createHeart, newHeartFreq);
    });

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

    // 6. Interactive Envelope
    window.toggleEnvelope = () => {
        const envelope = document.getElementById('envelope');
        const overlay = document.getElementById('letter-overlay');
        const modal = document.getElementById('letter-modal');
        const isOpen = envelope.classList.toggle('open');
        
        if (isOpen) {
            overlay.style.display = 'block';
            modal.style.display = 'flex';
            setTimeout(() => {
                overlay.classList.add('show');
                modal.classList.add('show');
            }, 10);
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('show');
            modal.classList.remove('show');
            setTimeout(() => {
                overlay.style.display = 'none';
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 500);
        }
    };

    // 7. Global Touch-Hearts Interaction
    document.addEventListener('pointerdown', (e) => {
        const clickHeart = document.createElement('div');
        clickHeart.classList.add('click-heart');
        clickHeart.innerHTML = ['❤️', '💖', '💕', '💗', '🎀', '✨'][Math.floor(Math.random() * 6)];
        clickHeart.style.left = e.clientX + 'px';
        clickHeart.style.top = e.clientY + 'px';
        clickHeart.style.setProperty('--rot', (Math.random() * 60 - 30) + 'deg');
        document.body.appendChild(clickHeart);

        setTimeout(() => clickHeart.remove(), 800);
    });

    // 8. Auto-Scatter 40 Scrapbook Stickers
    const scatterStickers = () => {
        const stickerSVGs = [
            // Soft Bow
            `<svg viewBox="0 0 100 100"><path d="M50 50 C 25 25, 5 40, 15 65 C 25 90, 50 65, 50 50 Z" fill="#bde0fe"/><path d="M50 50 C 75 25, 95 40, 85 65 C 75 90, 50 65, 50 50 Z" fill="#bde0fe"/><circle cx="50" cy="50" r="10" fill="#a2d2ff"/><path d="M42 58 Q 20 90, 10 95" stroke="#bde0fe" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M58 58 Q 80 90, 90 95" stroke="#bde0fe" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`,
            // Pastel Butterfly
            `<svg viewBox="0 0 100 100"><path d="M50 10 C 70 20, 90 20, 95 45 C 100 70, 70 55, 50 60" fill="#ffccd5"/><path d="M50 10 C 30 20, 10 20, 5 45 C 0 70, 30 55, 50 60" fill="#ffccd5"/><path d="M50 60 C 65 75, 80 95, 50 95 C 35 80, 50 70, 50 60" fill="#ffaab8"/><path d="M50 60 C 35 75, 20 95, 50 95 C 65 80, 50 70, 50 60" fill="#ffaab8"/><ellipse cx="50" cy="50" rx="4" ry="22" fill="#ff8fab"/></svg>`,
            // Sparkling Star
            `<svg viewBox="0 0 100 100"><path d="M50 0 Q 50 40, 100 50 Q 50 60, 50 100 Q 50 60, 0 50 Q 50 40, 50 0 Z" fill="#ffecd1"/></svg>`,
            // Little Cloud
            `<svg viewBox="0 0 100 100"><path d="M30 60 A 20 20 0 0 1 50 30 A 25 25 0 0 1 90 45 A 20 20 0 0 1 80 80 L 30 80 A 20 20 0 0 1 30 60 Z" fill="#e0fbfc"/></svg>`,
            // Pastel Flower
            `<svg viewBox="0 0 100 100"><circle cx="50" cy="30" r="15" fill="#fbc4ab"/><circle cx="70" cy="50" r="15" fill="#fbc4ab"/><circle cx="50" cy="70" r="15" fill="#fbc4ab"/><circle cx="30" cy="50" r="15" fill="#fbc4ab"/><circle cx="50" cy="50" r="10" fill="#ffb703"/></svg>`,
            // Diamond
            `<svg viewBox="0 0 100 100"><polygon points="30,20 70,20 90,40 50,90 10,40" fill="#ccffff"/><polygon points="30,20 70,20 50,40" fill="#aeeeee"/><polygon points="10,40 50,90 50,40" fill="#aeeeee"/><polygon points="90,40 50,90 50,40" fill="#98f5ff"/></svg>`,
            // Strawberry
            `<svg viewBox="0 0 100 100"><path d="M50 85 C 10 60, 20 20, 50 25 C 80 20, 90 60, 50 85" fill="#ff7da5"/><path d="M50 25 C 40 10, 60 10, 50 25" fill="#a7e89e"/><circle cx="40" cy="45" r="3" fill="#fff"/><circle cx="60" cy="55" r="3" fill="#fff"/><circle cx="50" cy="40" r="3" fill="#fff"/></svg>`,
            // Music Note
            `<svg viewBox="0 0 100 100"><circle cx="40" cy="70" r="15" fill="#cda4ff"/><rect x="45" y="20" width="10" height="50" fill="#cda4ff"/><path d="M45 20 Q 75 20, 85 50" fill="none" stroke="#cda4ff" stroke-width="10" stroke-linecap="round"/></svg>`,
            // Crescent Moon
            `<svg viewBox="0 0 100 100"><path d="M50 10 A 40 40 0 1 0 80 80 A 30 30 0 1 1 50 10 Z" fill="#fff8b5"/></svg>`,
            // Mini Love Letter
            `<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" rx="5" fill="#ffccd5"/><polygon points="10,25 50,55 90,25" fill="#ffaab8"/><circle cx="50" cy="55" r="8" fill="#e60023"/></svg>`
        ];

        const pins = document.querySelectorAll('.pin');
        if (pins.length === 0) return;

        for (let i = 0; i < 40; i++) {
            const sticker = document.createElement('div');
            sticker.classList.add('scatter-sticker');
            sticker.innerHTML = stickerSVGs[Math.floor(Math.random() * stickerSVGs.length)];
            
            const size = Math.random() * 30 + 20;
            const rot = Math.random() * 360;
            const x = Math.random() * 110 - 5;
            const y = Math.random() * 110 - 5;
            const delay = Math.random() * 2;
            const scale = Math.random() * 0.5 + 0.8;

            sticker.style.width = size + 'px';
            sticker.style.height = size + 'px';
            sticker.style.left = x + '%';
            sticker.style.top = y + '%';
            sticker.style.setProperty('--rot', rot + 'deg');
            sticker.style.setProperty('--delay', delay + 's');
            sticker.style.setProperty('--sc', scale);

            const randomPin = pins[Math.floor(Math.random() * pins.length)];
            randomPin.appendChild(sticker);
        }
    };

    scatterStickers();
});
