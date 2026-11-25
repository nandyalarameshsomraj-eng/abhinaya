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
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    lock.classList.remove('hidden');
                    if (passwordInput) passwordInput.focus();
                });
            });
        }, 560);

        // Start video on first interaction if source exists
        if (bgVideo && bgVideo.currentSrc) {
            bgVideo.play().catch(() => {});
        }
    };

    window.checkPassword = () => {
        if (passwordInput.value === "130226") {
            lock.classList.add('hidden');
            setTimeout(() => {
                lock.style.display = 'none';
                main.classList.add('is-entering');
                main.style.display = 'flex';
                const pins = main.querySelectorAll('.pin');
                pins.forEach((pin, idx) => {
                    pin.style.transitionDelay = `${Math.min(idx * 45, 360)}ms`;
                });
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        main.classList.remove('hidden');
                        main.classList.remove('is-entering');
                        main.classList.add('is-entered');
                        setTimeout(() => {
                            pins.forEach((pin) => { pin.style.transitionDelay = ''; });
                        }, 650);
                    });
                });

                // RECURRING CELEBRATION: If it's the 13th, spark the magic!
                const now = new Date();
                if (now.getDate() === 13) {
                    setTimeout(() => {
                        startFireworks();
                        startAmbientCelebration(); // Start all-day celebration
                    }, 900);
                } else {
                    startConfetti();
                }
            }, 560);
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

    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkPassword();
        });
    }


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

        // Calculate Upcoming Anniversaries
        const startDay = startDate.getDate();
        const startMonth = startDate.getMonth();
        
        let nextMonthDate = new Date(now.getFullYear(), now.getMonth(), startDay);
        if (now > nextMonthDate) {
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        }
        
        let nextYearDate = new Date(now.getFullYear(), startMonth, startDay);
        if (now > nextYearDate) {
            nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
        }

        const formatOpts = { month: 'short', day: 'numeric', year: 'numeric' };
        const monthEl = document.getElementById('next-month-anniversary');
        const yearEl = document.getElementById('next-year-anniversary');
        
        if (monthEl) {
            const daysLeft = Math.floor((nextMonthDate - now) / (1000 * 60 * 60 * 24));
            monthEl.innerHTML = `${nextMonthDate.toLocaleDateString('en-US', formatOpts)} <span style="font-size:0.8em; opacity:0.7;">(in ${daysLeft}d)</span>`;
        }
        if (yearEl) {
            const daysLeft = Math.floor((nextYearDate - now) / (1000 * 60 * 60 * 24));
            yearEl.innerHTML = `${nextYearDate.toLocaleDateString('en-US', formatOpts)} <span style="font-size:0.8em; opacity:0.7;">(in ${daysLeft}d)</span>`;
        }
    };
    setInterval(updateTimer, 1000);
    updateTimer();

    // 3. Floating Heart Logic
    const isModalOrCelebrationOpen = () => {
        const bday = document.getElementById('bday-overlay');
        if (bday && bday.classList.contains('is-open')) return true;
        const modals = ['letter-modal', 'anniversary-modal', 'four-month-modal', 'proposal-overlay', 'ring-overlay', 'certificate-modal'];
        return modals.some((id) => {
            const el = document.getElementById(id);
            return el && el.classList.contains('show');
        });
    };

    let activeFloatingHearts = 0;
    const createHeart = () => {
        if (document.hidden || isModalOrCelebrationOpen() || activeFloatingHearts >= 16) return;
        activeFloatingHearts++;
        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.textContent = ['❤️', '💖', '💕', '💗', '💓'][Math.floor(Math.random() * 5)];
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.fontSize = (Math.random() * 18 + 12) + 'px';
        const duration = Math.random() * 4 + 6;
        heart.style.animationDuration = duration + 's';
        document.body.appendChild(heart);

        setTimeout(() => {
            heart.remove();
            activeFloatingHearts = Math.max(0, activeFloatingHearts - 1);
        }, duration * 1000 + 150);
    };
    
    // 3.5 Floating Floral Logic
    const lilySVGs = [
        `<svg viewBox="0 0 100 100"><path d="M50 90 Q 50 60, 50 40" stroke="#4a4a4a" fill="none" stroke-width="2"/><path d="M50 40 C 30 10, 10 30, 30 40 C 20 60, 45 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><path d="M50 40 C 70 10, 90 30, 70 40 C 80 60, 55 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><circle cx="50" cy="35" r="3" fill="#ffd700"/></svg>`,
        `<svg viewBox="0 0 100 100"><path d="M40 90 Q 40 60, 50 40" stroke="#4a4a4a" fill="none" stroke-width="2"/><path d="M50 40 C 60 10, 85 20, 70 40 C 80 50, 60 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><path d="M50 40 C 40 10, 15 20, 30 40 C 20 50, 40 60, 50 40 Z" fill="#ffb7c5" stroke="#ff4d6d" stroke-width="1"/><circle cx="50" cy="38" r="2" fill="#ffd700"/></svg>`
    ];

    const sunflowerSVGs = [
        `<svg viewBox="0 0 100 100"><path d="M50 95 Q 45 75, 50 60" stroke="#4a4a4a" fill="none" stroke-width="1.5" /><g transform="translate(50, 60)"><circle cx="0" cy="0" r="8" fill="#5D4037" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(0)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(45)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(90)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(135)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(180)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(225)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(270)" /><path d="M0 -8 Q -5 -20, 0 -25 Q 5 -20, 0 -8" fill="#FBC02D" stroke="#F9A825" stroke-width="0.5" transform="rotate(315)" /></g></svg>`
    ];

    let activeFloatingFlowers = 0;
    const createFlower = (type) => {
        if (document.hidden || isModalOrCelebrationOpen() || activeFloatingFlowers >= 6) return;
        activeFloatingFlowers++;
        const flower = document.createElement('div');
        const svgs = type === 'sunflower' ? sunflowerSVGs : lilySVGs;
        flower.classList.add(type === 'sunflower' ? 'floating-sunflower' : 'floating-lily');
        flower.innerHTML = svgs[Math.floor(Math.random() * svgs.length)];
        
        // Random responsive size
        const baseSize = window.innerWidth < 600 ? 25 : 35;
        const size = (Math.random() * 20 + baseSize) + 'px';
        const duration = Math.random() * 6 + 10;
        
        flower.style.left = Math.random() * 100 + 'vw';
        flower.style.width = size;
        flower.style.height = size;
        flower.style.animationDuration = duration + 's';
        document.body.appendChild(flower);
        setTimeout(() => {
            flower.remove();
            activeFloatingFlowers = Math.max(0, activeFloatingFlowers - 1);
        }, duration * 1000 + 200);
    };

    // Adjust spawning based on screen size
    const getFrequencies = () => ({
        floral: window.innerWidth < 600 ? 5500 : 3000,
        heart: window.innerWidth < 600 ? 1600 : 750
    });

    let lastWidth = window.innerWidth;
    let freqs = getFrequencies();
    let flowerInterval = setInterval(() => {
        createFlower(Math.random() > 0.4 ? 'lily' : 'sunflower');
    }, freqs.floral);

    let heartInterval = setInterval(createHeart, freqs.heart);

    // Re-adjust only when viewport width changes (avoids mobile URL bar jitter)
    window.addEventListener('resize', () => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        clearInterval(flowerInterval);
        clearInterval(heartInterval);
        freqs = getFrequencies();
        flowerInterval = setInterval(() => {
            createFlower(Math.random() > 0.4 ? 'lily' : 'sunflower');
        }, freqs.floral);
        heartInterval = setInterval(createHeart, freqs.heart);
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
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('show');
                    modal.classList.add('show');
                });
            });
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('show');
            modal.classList.remove('show');
            setTimeout(() => {
                overlay.style.display = 'none';
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 400);
        }
    };

    // 6.5 Interactive 4-Month Envelope
    window.toggleFourMonthEnvelope = () => {
        const envelope = document.getElementById('four-month-envelope');
        const overlay = document.getElementById('letter-overlay');
        const modal = document.getElementById('four-month-modal');
        const isOpen = envelope.classList.toggle('open');
        
        if (isOpen) {
            overlay.style.display = 'block';
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('show');
                    modal.classList.add('show');
                });
            });
            document.body.style.overflow = 'hidden';
            // Spark fireworks when opening the 4-month anniversary card
            startFireworks();
        } else {
            overlay.classList.remove('show');
            modal.classList.remove('show');
            setTimeout(() => {
                overlay.style.display = 'none';
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
                // Show the marriage proposal overlay after closing the letter!
                showProposalOverlay();
            }, 400);
        }
    };

    // 6.6 Marriage Proposal Overlay
    window.showProposalOverlay = () => {
        const proposalOverlay = document.getElementById('proposal-overlay');
        proposalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.proposalYes = () => {
        // Hide proposal overlay
        const proposalOverlay = document.getElementById('proposal-overlay');
        proposalOverlay.classList.remove('show');

        // Start BIG fireworks celebration
        startFireworks();
        setTimeout(() => startFireworks(), 800);
        setTimeout(() => startFireworks(), 1600);

        // Show ring overlay after short delay
        setTimeout(() => {
            const ringOverlay = document.getElementById('ring-overlay');
            ringOverlay.classList.add('show');
        }, 600);
    };

    window.showMarriageCertificate = () => {
        const certModal = document.getElementById('certificate-modal');
        certModal.classList.add('show');
        // Celebrate with fireworks when the certificate appears!
        startFireworks();
        setTimeout(() => startFireworks(), 700);
        setTimeout(() => startFireworks(), 1400);
    };

    window.closeCertificate = () => {
        const certModal = document.getElementById('certificate-modal');
        certModal.classList.remove('show');
    };

    window.closeRingOverlay = () => {
        const ringOverlay = document.getElementById('ring-overlay');
        ringOverlay.classList.remove('show');
        document.body.style.overflow = 'auto';
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

        const pins = Array.from(document.querySelectorAll('.pin')).filter(
            (pin) => !pin.querySelector('.bday-camera-frame')
        );
        if (pins.length === 0) return;

        for (let i = 0; i < 24; i++) {
            const sticker = document.createElement('div');
            sticker.classList.add('scatter-sticker');
            sticker.innerHTML = stickerSVGs[Math.floor(Math.random() * stickerSVGs.length)];
            
            const size = Math.random() * 30 + 20;
            const rot = Math.random() * 360;
            
            // Constrain placements exclusively to the outer edges/frame!
            let x, y;
            if (Math.random() > 0.5) {
                // Top or Bottom borders
                x = Math.random() * 110 - 5;
                y = Math.random() > 0.5 ? (Math.random() * 10 - 5) : (Math.random() * 15 + 85);
            } else {
                // Left or Right borders
                y = Math.random() * 110 - 5;
                x = Math.random() > 0.5 ? (Math.random() * 10 - 5) : (Math.random() * 10 + 85);
            }
            
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

        // Auto-inject Washi Tape to all picture frames
        const imageWrappers = document.querySelectorAll('.pin-image-wrapper');
        imageWrappers.forEach(wrapper => {
            const tape = document.createElement('div');
            tape.classList.add('washi-tape');
            // Give each tape a slight natural rotation offset
            tape.style.transform = `translateX(-50%) rotate(${Math.random() * 8 - 4}deg)`;
            wrapper.appendChild(tape);
        });
    };

    scatterStickers();

    // 8B. Attach the 5 Custom Scrapbook Stickers Near Every Camera & Photo Frame
    const attachFrameStickers = () => {
        const STICKERS = {
            favorite: { src: 'assets/stickers/favorite-person.png', kind: 'cutout' },
            lucky:    { src: 'assets/stickers/lucky-you.png',       kind: 'cutout' },
            heart:    { src: 'assets/stickers/my-girl-heart.png',   kind: 'cutout' },
            birds:    { src: 'assets/stickers/birds-of-a-feather.jpg', kind: 'card' },
            october:  { src: 'assets/stickers/fell-in-love.jpg',    kind: 'card' }
        };

        // Curated non-overlapping sticker pairings around camera corners/edges
        const FRAME_LAYOUTS = [
            [
                { sticker: STICKERS.favorite, slot: 'frame-sticker--favorite', rot: -7 },
                { sticker: STICKERS.birds,    slot: 'frame-sticker--spotify-tr', rot: 7 }
            ],
            [
                { sticker: STICKERS.heart, slot: 'frame-sticker--heart-tl', rot: -11 },
                { sticker: STICKERS.lucky, slot: 'frame-sticker--lucky-bottom', rot: -2.5 }
            ],
            [
                { sticker: STICKERS.favorite, slot: 'frame-sticker--favorite', rot: -6 },
                { sticker: STICKERS.october,  slot: 'frame-sticker--spotify-tr', rot: 6 }
            ],
            [
                { sticker: STICKERS.lucky, slot: 'frame-sticker--lucky-top', rot: 3 },
                { sticker: STICKERS.heart, slot: 'frame-sticker--heart-bl', rot: -9 }
            ],
            [
                { sticker: STICKERS.heart, slot: 'frame-sticker--heart-tr', rot: 11 },
                { sticker: STICKERS.birds, slot: 'frame-sticker--spotify-br', rot: -6 }
            ],
            [
                { sticker: STICKERS.favorite, slot: 'frame-sticker--favorite', rot: -8 },
                { sticker: STICKERS.heart,    slot: 'frame-sticker--heart-br', rot: 9 }
            ],
            [
                { sticker: STICKERS.lucky,   slot: 'frame-sticker--lucky-top', rot: 2.5 },
                { sticker: STICKERS.october, slot: 'frame-sticker--spotify-br', rot: 7 }
            ]
        ];

        const createStickerEl = ({ sticker, slot, rot }) => {
            const el = document.createElement('div');
            el.className = `frame-sticker ${slot} frame-sticker--${sticker.kind}`;
            el.style.setProperty('--sticker-rot', `${rot}deg`);
            const img = document.createElement('img');
            img.src = sticker.src;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            img.decoding = 'async';
            img.loading = 'lazy';
            el.appendChild(img);
            return el;
        };

        const cameraFrames = document.querySelectorAll('.bday-camera-frame');
        cameraFrames.forEach((frame, idx) => {
            if (frame.dataset.stickersAttached) return;
            frame.dataset.stickersAttached = '1';
            const layout = FRAME_LAYOUTS[idx % FRAME_LAYOUTS.length];
            layout.forEach((item) => frame.appendChild(createStickerEl(item)));
        });

        // Also adorn the Anniversary Slideshow frame
        const slideshowWrap = document.querySelector('.slideshow-frame-wrap');
        if (slideshowWrap && !slideshowWrap.dataset.stickersAttached) {
            slideshowWrap.dataset.stickersAttached = '1';
            [
                { sticker: STICKERS.favorite, slot: 'frame-sticker--favorite', rot: -8 },
                { sticker: STICKERS.lucky,    slot: 'frame-sticker--lucky-top', rot: 3 },
                { sticker: STICKERS.heart,    slot: 'frame-sticker--heart-br', rot: 10 }
            ].forEach((item) => slideshowWrap.appendChild(createStickerEl(item)));
        }
    };

    attachFrameStickers();

    // 9. Album Player Logic
    window.toggleAudio = () => {
        const audio = document.getElementById('bg-audio');
        const pin = document.querySelector('.album-player-pin');
        const statusText = pin.querySelector('.audio-status');
        
        if (audio.paused) {
            audio.play();
            pin.classList.add('playing');
            statusText.textContent = "Playing: Her. 💖";
        } else {
            audio.pause();
            pin.classList.remove('playing');
            statusText.textContent = "Tap to spark the magic ✨";
        }
    };

    // 10. Anniversary Surprise Logic
    const anniversaryDate = new Date("2026-04-13T00:00:00");
    const anniversaryPin = document.getElementById('anniversary-pin');
    const anniversaryModal = document.getElementById('anniversary-modal');
    const anniversaryVideo = document.getElementById('anniversary-video');

    const checkAnniversaryStatus = () => {
        const now = new Date();
        if (now >= anniversaryDate) {
            anniversaryPin.classList.remove('locked');
            anniversaryPin.classList.add('unlocked');
            const timerText = anniversaryPin.querySelector('.lock-timer');
            if (timerText) timerText.textContent = "It's time! 💖";
        } else {
            anniversaryPin.classList.add('locked');
            anniversaryPin.classList.remove('unlocked');
            
            const diff = anniversaryDate - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            const timerText = anniversaryPin.querySelector('.lock-timer');
            if (timerText) timerText.textContent = `Unlocks in ${hours}h ${minutes}m`;
        }
    };

    setInterval(checkAnniversaryStatus, 1000);
    checkAnniversaryStatus();

    window.handleAnniversaryClick = () => {
        const now = new Date();
        if (now < anniversaryDate) {
            alert("Patience, my love... exactly at 12 AM on April 13th, I'll show you something special! ❤️");
            return;
        }

        // Trigger Surprise immediately
        const audio = document.getElementById('bg-audio');
        if (audio.paused) {
            audio.play().catch(e => console.log("Audio blocked"));
            document.querySelector('.album-player-pin').classList.add('playing');
        }
        
        startFireworks();
        toggleAnniversaryModal();
    };

    window.toggleAnniversaryModal = () => {
        const overlay = document.getElementById('letter-overlay');
        const isOpen = anniversaryModal.classList.toggle('show');
        
        if (isOpen) {
            overlay.style.display = 'block';
            setTimeout(() => overlay.classList.add('show'), 10);
            document.body.style.overflow = 'hidden';
        } else {
            // Stop slideshow if needed
            if (slideshowInterval) {
                clearInterval(slideshowInterval);
                slideshowInterval = null;
            }
            document.querySelector('.special-slideshow-container').classList.remove('slideshow-playing');
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 500);
        }
    };

    // 11. Slideshow Logic
    let slideshowInterval = null;
    window.startAnniversarySlideshow = () => {
        const container = document.querySelector('.special-slideshow-container');
        const img = document.getElementById('anniversary-slideshow-img');
        if (slideshowInterval) return; // Already running

        container.classList.add('slideshow-playing');
        
        const memories = [
            'assets/memories/memory1.jpg',
            'assets/memories/memory2.jpg',
            'assets/memories/memory3.jpg',
            'assets/memories/memory4.jpg',
            'assets/memories/memory5.png',
            'assets/memories/memory6.png',
            'assets/memories/memory7.png'
        ];
        
        let currentIndex = 0;
        slideshowInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % memories.length;
            
            // Fade out
            img.classList.add('fade-out');
            
            setTimeout(() => {
                img.src = memories[currentIndex];
                // Fade in
                img.classList.remove('fade-out');
            }, 1000); // Sync with CSS transition
        }, 3000);
    };

    // 11. Fireworks Logic (Canvas)
    const canvas = document.getElementById('fireworks-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let fireworkActive = false;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.velocity = {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 8
            };
            this.alpha = 1;
            this.friction = 0.95;
        }

        draw() {
            ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update(step) {
            const f = Math.pow(this.friction, step);
            this.velocity.x *= f;
            this.velocity.y *= f;
            this.y += 0.1 * step; // gravity
            this.x += this.velocity.x * step;
            this.y += this.velocity.y * step;
            this.alpha -= 0.01 * step;
        }
    }

    window.startAmbientCelebration = () => {
        console.log("Celebration Mode: ON 🎆");
        if (!fireworkActive) {
            fireworkActive = true;
            fireworkLastTime = 0;
            requestAnimationFrame(animateFireworks);
        }
        
        // Spawn a random firework every 15 seconds
        setInterval(() => {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height * 0.5;
            createFirework(x, y);
        }, 15000);
    };

    window.startFireworks = () => {
        if (!fireworkActive) {
            fireworkActive = true;
            fireworkLastTime = 0;
            requestAnimationFrame(animateFireworks);
        }
        let count = 0;
        const interval = setInterval(() => {
            createFirework(Math.random() * canvas.width, Math.random() * canvas.height * 0.5);
            count++;
            if (count > 18) clearInterval(interval);
        }, 280);
    };

    const createFirework = (x, y) => {
        const colors = ['#ff4d6d', '#ff8fab', '#ffb7c5', '#ffd700', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 36; i++) {
            particles.push(new Particle(x, y, color));
        }
    };

    let fireworkLastTime = 0;
    const animateFireworks = (now) => {
        if (!fireworkLastTime) fireworkLastTime = now || performance.now();
        const dt = Math.min(0.035, Math.max(0.001, ((now || performance.now()) - fireworkLastTime) / 1000));
        fireworkLastTime = now || performance.now();
        const step = dt * 60;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            if (particle.alpha <= 0.02) {
                particles.splice(i, 1);
            } else {
                particle.update(step);
                particle.draw();
            }
        }

        if (particles.length > 0) {
            requestAnimationFrame(animateFireworks);
        } else {
            ctx.globalAlpha = 1;
            fireworkActive = false;
            fireworkLastTime = 0;
        }
    };
});
