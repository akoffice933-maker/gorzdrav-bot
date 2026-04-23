// Основные функции для сайта Горздрав Бот

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация всех функций
    initFAQ();
    initStatsCounter();
    initSmoothScroll();
    initMobileMenu();
    initStickyCTA();
    initHeroAnimations();
    initScrollReveal();
});

// Инициализация аккордеона FAQ
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Закрываем все остальные элементы
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Переключаем текущий элемент
            item.classList.toggle('active');
        });
    });
}

// Анимация счетчиков статистики
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    if (!statNumbers.length) return;
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumber = entry.target;
                const target = parseInt(statNumber.getAttribute('data-count'));
                const suffix = statNumber.getAttribute('data-suffix') || '';
                
                animateCounter(statNumber, target, suffix);
                observer.unobserve(statNumber);
            }
        });
    }, observerOptions);
    
    statNumbers.forEach(number => observer.observe(number));
}

function animateCounter(element, target, suffix = '') {
    let current = 0;
    const increment = target / 100;
    const duration = 2000; // 2 секунды
    const stepTime = duration / 100;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            clearInterval(timer);
            current = target;
        }
        
        if (target >= 1000) {
            element.textContent = Math.floor(current).toLocaleString() + suffix;
        } else {
            element.textContent = Math.floor(current) + suffix;
        }
    }, stepTime);
}

// Плавная прокрутка
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Пропускаем ссылки, которые не ведут на якоря
            if (href === '#' || href.startsWith('#!')) return;
            
            e.preventDefault();
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = targetPosition - headerHeight - 20;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Закрываем мобильное меню, если оно открыто
                const mobileMenu = document.querySelector('.mobile-menu');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                }
            }
        });
    });
}

// Мобильное меню
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuBtn || !navLinks) return;
    
    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuBtn.innerHTML = navLinks.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Закрытие меню при клике на ссылку
    const navLinksItems = navLinks.querySelectorAll('a');
    navLinksItems.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
            navLinks.classList.remove('active');
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// Sticky CTA для мобильных устройств
function initStickyCTA() {
    const stickyCTA = document.querySelector('.sticky-cta');
    if (!stickyCTA) return;
    
    // Показываем/скрываем sticky CTA в зависимости от прокрутки
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Скрываем при прокрутке вниз, показываем при прокрутке вверх или внизу страницы
        if (scrollTop > lastScrollTop) {
            // Прокрутка вниз
            stickyCTA.style.transform = 'translateY(100%)';
        } else {
            // Прокрутка вверх
            stickyCTA.style.transform = 'translateY(0)';
        }
        
        // Всегда показываем внизу страницы
        if (scrollTop + windowHeight >= documentHeight - 100) {
            stickyCTA.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// Анимации для героя
function initHeroAnimations() {
    const heroElements = document.querySelectorAll('.hero-title, .hero-subtitle, .hero-cta, .hero-stats');
    
    // Задержка для каскадной анимации
    let delay = 0;
    
    heroElements.forEach((element, index) => {
        setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                element.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 100);
        }, delay);
        
        delay += 200; // 200ms между элементами
    });
}

// Анимация появления элементов при скролле
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.feature-card, .security-feature, .step, .faq-item, .section-header');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(element => observer.observe(element));
}

// Функция для отправки аналитики (заглушка)
function trackEvent(eventName, eventData = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Можно добавить отправку на свой бэкенд
    console.log(`Event tracked: ${eventName}`, eventData);
}

// Обработчик кликов на CTA кнопки
document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-primary')) {
        const button = e.target.closest('.btn-primary');
        const buttonText = button.textContent.trim();
        
        trackEvent('cta_click', {
            button_text: buttonText,
            location: 'website',
            page: window.location.pathname
        });
    }
});

// Обновление года в футере
function updateCopyrightYear() {
    const yearElements = document.querySelectorAll('[data-current-year]');
    const currentYear = new Date().getFullYear();
    
    yearElements.forEach(element => {
        element.textContent = currentYear;
    });
}

document.addEventListener('DOMContentLoaded', updateCopyrightYear);

// Загрузка иконок Font Awesome (если не загружены)
function checkIconsLoaded() {
    setTimeout(() => {
        const icons = document.querySelectorAll('i[class*="fa-"]');
        let missingIcons = 0;
        
        icons.forEach(icon => {
            const computedStyle = window.getComputedStyle(icon, ':before');
            const content = computedStyle.content;
            
            if (content === 'none' || content === '""' || content === "''") {
                missingIcons++;
                console.warn('Missing icon:', icon.className);
            }
        });
        
        if (missingIcons > 0) {
            console.warn(`${missingIcons} icons failed to load. Font Awesome might not be loaded properly.`);
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', checkIconsLoaded);

// Плавающая навигация с изменением стилей при скролле
function initScrollNavigation() {
    const navbar = document.querySelector('.navbar');
    let scrollPosition = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollPosition = window.scrollY;
        
        if (currentScrollPosition > scrollPosition) {
            // Прокрутка вниз
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // Прокрутка вверх
            navbar.style.transform = 'translateY(0)';
        }
        
        // Изменение прозрачности при прокрутке
        if (currentScrollPosition > 100) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'var(--shadow-sm)';
        }
        
        scrollPosition = currentScrollPosition;
    });
}

document.addEventListener('DOMContentLoaded', initScrollNavigation);

// Анимация для логотипа
function initLogoAnimation() {
    const logoIcon = document.querySelector('.logo-icon');
    
    if (logoIcon) {
        logoIcon.addEventListener('mouseenter', () => {
            logoIcon.style.transform = 'rotate(360deg)';
            logoIcon.style.transition = 'transform 0.8s ease';
        });
        
        logoIcon.addEventListener('mouseleave', () => {
            logoIcon.style.transform = 'rotate(0deg)';
        });
    }
}

document.addEventListener('DOMContentLoaded', initLogoAnimation);

// Добавление стилей для анимаций
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    /* Анимация появления при скролле */
    .feature-card,
    .security-feature,
    .step,
    .faq-item,
    .section-header {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .feature-card.reveal,
    .security-feature.reveal,
    .step.reveal,
    .faq-item.reveal,
    .section-header.reveal {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Задержки для каскадной анимации */
    .feature-card:nth-child(1) { transition-delay: 0.1s; }
    .feature-card:nth-child(2) { transition-delay: 0.2s; }
    .feature-card:nth-child(3) { transition-delay: 0.3s; }
    .feature-card:nth-child(4) { transition-delay: 0.4s; }
    .feature-card:nth-child(5) { transition-delay: 0.5s; }
    .feature-card:nth-child(6) { transition-delay: 0.6s; }
    
    /* Мобильное меню активное состояние */
    .nav-links.active {
        display: flex;
        position: fixed;
        top: 80px;
        left: 0;
        right: 0;
        background-color: var(--color-white);
        flex-direction: column;
        padding: var(--space-lg);
        box-shadow: var(--shadow-lg);
        z-index: 999;
    }
    
    .nav-links.active .nav-link {
        padding: var(--space-md) 0;
        text-align: center;
        width: 100%;
    }
    
    .nav-links.active .nav-cta {
        margin-left: 0;
        margin-top: var(--space-md);
    }
`;

document.head.appendChild(animationStyles);
