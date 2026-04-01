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
        }
    };
});
