// JavaScript для страницы функций

document.addEventListener('DOMContentLoaded', function() {
    initFeaturesPage();
    initFeatureNavigation();
    initInteractiveElements();
    initFeatureHighlights();
});

// Инициализация страницы функций
function initFeaturesPage() {
    // Добавляем стили для активного элемента навигации
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'features.html') {
            link.classList.add('active');
        }
    });
    
    // Инициализация плавной прокрутки для внутренних ссылок
    initFeatureSmoothScroll();
    
    // Анимация появления элементов при скролле
    initFeatureScrollAnimations();
}

// Навигация по функциям
function initFeatureNavigation() {
    // Создаем навигацию по функциям, если её нет
    if (!document.querySelector('.feature-nav')) {
        createFeatureNavigation();
    }
    
    // Обработка кликов по навигации
    const featureLinks = document.querySelectorAll('.feature-nav a');
    featureLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                scrollToFeature(targetElement);
                updateActiveFeatureLink(targetId);
            }
        });
    });
    
    // Обновление активной ссылки при скролле
    window.addEventListener('scroll', () => {
        const features = document.querySelectorAll('.detailed-feature');
        let currentFeatureId = '';
        
        features.forEach(feature => {
            const rect = feature.getBoundingClientRect();
            if (rect.top <= 200 && rect.bottom >= 200) {
                currentFeatureId = feature.id;
            }
        });
        
        if (currentFeatureId) {
            updateActiveFeatureLink(currentFeatureId);
        }
    });
}

// Создание навигации по функциям
function createFeatureNavigation() {
    const features = document.querySelectorAll('.detailed-feature');
    if (!features.length) return;
    
    const nav = document.createElement('div');
    nav.className = 'feature-nav';
    
    const navTitle = document.createElement('div');
    navTitle.className = 'feature-nav-title';
    navTitle.innerHTML = '<i class="fas fa-list"></i> Функции';
    nav.appendChild(navTitle);
    
    const navList = document.createElement('div');
    navList.className = 'feature-nav-list';
    
    features.forEach(feature => {
        const featureId = feature.id;
        const featureTitle = feature.querySelector('.feature-title');
        
        if (featureTitle && featureId) {
            const link = document.createElement('a');
            link.href = `#${featureId}`;
            link.innerHTML = `
                <i class="${featureTitle.querySelector('i')?.className || 'fas fa-cube'}"></i>
                <span>${featureTitle.textContent.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim()}</span>
            `;
            
            navList.appendChild(link);
        }
    });
    
    nav.appendChild(navList);
    
    // Вставляем навигацию после заголовка
    const header = document.querySelector('.features-header');
    if (header) {
        header.parentNode.insertBefore(nav, header.nextSibling);
    }
}

// Плавная прокрутка к функции
function scrollToFeature(element) {
    const headerHeight = document.querySelector('.navbar').offsetHeight;
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - headerHeight - 20;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Обновление активной ссылки в навигации
function updateActiveFeatureLink(featureId) {
    const featureLinks = document.querySelectorAll('.feature-nav a');
    
    featureLinks.forEach(link => {
        if (link.getAttribute('href') === `#${featureId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Плавная прокрутка для страницы функций
function initFeatureSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href.startsWith('#!')) return;
            
            if (href.startsWith('#')) {
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
                }
            }
        });
    });
}

// Интерактивные элементы
function initInteractiveElements() {
    // Интерактивный таймлайн для напоминаний
    initReminderTimeline();
    
    // Интерактивный чат для демо
    initDemoChat();
    
    // Анимация появления преимуществ
    initBenefitsAnimation();
}

// Интерактивный таймлайн для напоминаний
function initReminderTimeline() {
    const timelineMarkers = document.querySelectorAll('.timeline-marker');
    
    timelineMarkers.forEach(marker => {
        marker.addEventListener('mouseenter', function() {
            const label = this.querySelector('.marker-label');
            if (label) {
                label.style.transform = 'translateX(-50%) scale(1.1)';
                label.style.opacity = '1';
            }
        });
        
        marker.addEventListener('mouseleave', function() {
            const label = this.querySelector('.marker-label');
            if (label) {
                label.style.transform = 'translateX(-50%) scale(1)';
                label.style.opacity = '0.9';
            }
        });
    });
}

// Интерактивный демо-чат
function initDemoChat() {
    const demoChat = document.querySelector('.demo-chat');
    if (!demoChat) return;
    
    // Анимация появления сообщений
    const messages = demoChat.querySelectorAll('.message');
    let delay = 0;
    
    messages.forEach((message, index) => {
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                message.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                message.style.opacity = '1';
                message.style.transform = 'translateY(0)';
            }, 100);
        }, delay);
        
        delay += 1000; // 1 секунда между сообщениями
    });
    
    // Повтор анимации каждые 10 секунд
    setInterval(() => {
        messages.forEach((message, index) => {
            setTimeout(() => {
                message.style.transition = 'none';
                message.style.opacity = '0';
                message.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    message.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    message.style.opacity = '1';
                    message.style.transform = 'translateY(0)';
                }, 100);
            }, index * 1000);
        });
    }, 10000);
}

// Анимация появления преимуществ
function initBenefitsAnimation() {
    const benefits = document.querySelectorAll('.benefit, .advantage, .help-point');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    benefits.forEach(benefit => observer.observe(benefit));
}

// Анимация появления функций при скролле
function initFeatureScrollAnimations() {
    const features = document.querySelectorAll('.detailed-feature');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    });
    
    features.forEach(feature => observer.observe(feature));
}

// Подсветка функций
function initFeatureHighlights() {
    const features = document.querySelectorAll('.detailed-feature');
    
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
        });
        
        feature.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'var(--shadow-md)';
        });
    });
}

// Добавляем стили для этой страницы
const style = document.createElement('style');
style.textContent = `
    /* Стили для страницы функций */
    .features-header {
        padding: 120px 0 60px;
        background: linear-gradient(135deg, var(--color-background) 0%, rgba(240, 249, 255, 0.5) 100%);
        text-align: center;
    }
    
    .features-title {
        font-size: 48px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
    }
    
    .features-subtitle {
        font-size: 20px;
        color: var(--color-gray-600);
        max-width: 600px;
        margin: 0 auto;
    }
    
    .feature-nav {
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        margin-bottom: var(--space-2xl);
        box-shadow: var(--shadow-md);
        position: sticky;
        top: 100px;
        z-index: 100;
    }
    
    .feature-nav-title {
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 18px;
        color: var(--color-text);
        margin-bottom: var(--space-lg);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .feature-nav-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }
    
    .feature-nav-list a {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md) var(--space-lg);
        color: var(--color-gray-700);
        border-radius: var(--radius-md);
        transition: all 0.2s ease;
        text-decoration: none;
    }
    
    .feature-nav-list a:hover,
    .feature-nav-list a.active {
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-primary);
    }
    
    .feature-nav-list a i {
        width: 20px;
        text-align: center;
    }
    
    .detailed-features {
        padding: var(--space-2xl) 0;
    }
    
    .detailed-feature {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2xl);
        background-color: var(--color-white);
        padding: var(--space-2xl);
        border-radius: var(--radius-xl);
        margin-bottom: var(--space-2xl);
        box-shadow: var(--shadow-md);
        transition: all 0.3s ease;
    }
    
    .detailed-feature.animate-in {
        animation: slideIn 0.6s ease forwards;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .feature-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-primary);
        border-radius: var(--radius-xl);
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 14px;
        margin-bottom: var(--space-lg);
    }
    
    .feature-title {
        font-size: 32px;
        color: var(--color-text);
        margin-bottom: var(--space-lg);
        display: flex;
        align-items: center;
        gap: var(--space-md);
    }
    
    .feature-title i {
        color: var(--color-primary);
    }
    
    .feature-description {
        font-size: 18px;
        color: var(--color-gray-700);
        margin-bottom: var(--space-xl);
        line-height: 1.6;
    }
    
    .feature-details {
        margin-top: var(--space-xl);
    }
    
    .feature-details h3 {
        font-size: 20px;
        color: var(--color-text);
        margin-bottom: var(--space-lg);
    }
    
    .feature-details ul {
        list-style: none;
        padding: 0;
        margin: 0 0 var(--space-xl);
    }
    
    .feature-details li {
        margin-bottom: var(--space-sm);
        padding-left: var(--space-xl);
        position: relative;
    }
    
    .feature-details li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--color-primary);
        font-weight: bold;
    }
    
    .advantages {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .advantage {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md);
        background-color: var(--color-background);
        border-radius: var(--radius-lg);
    }
    
    .advantage i {
        color: var(--color-primary);
        font-size: 20px;
    }
    
    .feature-visual {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-md);
        padding: var(--space-xl);
        background-color: var(--color-background);
        border-radius: var(--radius-lg);
    }
    
    .visual-step {
        text-align: center;
    }
    
    .step-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-white);
        font-family: var(--font-heading);
        font-weight: 800;
        font-size: 20px;
        margin: 0 auto var(--space-sm);
    }
    
    .tech-stack {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .tech-item {
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .tech-icon {
        width: 64px;
        height: 64px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 24px;
        margin-right: var(--space-lg);
    }
    
    .analysis-types {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .analysis-type {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .analysis-type h4 {
        font-size: 18px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
    }
    
    .disclaimer {
        background-color: rgba(249, 115, 22, 0.1);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        margin: var(--space-xl) 0;
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
        border-left: 4px solid var(--color-cta);
    }
    
    .disclaimer i {
        color: var(--color-cta);
        font-size: 20px;
        margin-top: 2px;
    }
    
    .symptoms-interface {
        background-color: var(--color-gray-900);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        min-height: 300px;
    }
    
    .chat-bubble {
        max-width: 80%;
        padding: var(--space-md) var(--space-lg);
        border-radius: var(--radius-xl);
        margin-bottom: var(--space-md);
        font-family: var(--font-body);
        font-size: 14px;
    }
    
    .chat-bubble.bot {
        background-color: var(--color-background);
        align-self: flex-start;
    }
    
    .chat-bubble.user {
        background-color: var(--color-primary);
        color: var(--color-white);
        align-self: flex-end;
        margin-left: auto;
    }
    
    .help-points {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .help-point {
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .help-icon {
        width: 48px;
        height: 48px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .symptoms-categories {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .ai-capabilities {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .ai-capability {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .examples {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .example {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        border-left: 4px solid var(--color-primary);
    }
    
    .example-question {
        font-weight: 600;
        margin-bottom: var(--space-sm);
        color: var(--color-text);
    }
    
    .ai-demo {
        background-color: var(--color-gray-900);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }
    
    .demo-title {
        background-color: var(--color-primary);
        color: var(--color-white);
        padding: var(--space-md) var(--space-lg);
        font-family: var(--font-heading);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .demo-chat {
        padding: var(--space-lg);
    }
    
    .message {
        display: flex;
        gap: var(--space-md);
        margin-bottom: var(--space-md);
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }
    
    .avatar {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-white);
        font-family: var(--font-heading);
        font-weight: 700;
        flex-shrink: 0;
    }
    
    .text {
        background-color: var(--color-white);
        padding: var(--space-md) var(--space-lg);
        border-radius: var(--radius-lg);
        max-width: 80%;
        font-size: 14px;
    }
    
    .message.user {
        flex-direction: row-reverse;
        margin-left: auto;
    }
    
    .message.user .text {
        background-color: var(--color-primary);
        color: var(--color-white);
    }
    
    .reminder-visual {
        background-color: var(--color-background);
        padding: var(--space-xl);
        border-radius: var(--radius-lg);
    }
    
    .time-indicator {
        margin-bottom: var(--space-xl);
    }
    
    .time-now {
        font-family: var(--font-heading);
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-md);
    }
    
    .timeline {
        height: 4px;
        background-color: var(--color-gray-300);
        border-radius: 2px;
        position: relative;
    }
    
    .timeline-marker {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        cursor: pointer;
    }
    
    .marker-dot {
        width: 16px;
        height: 16px;
        background-color: var(--color-gray-400);
        border-radius: 50%;
        transition: all 0.2s ease;
    }
    
    .marker-dot.active {
        background-color: var(--color-primary);
        transform: scale(1.2);
    }
    
    .marker-label {
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--color-white);
        padding: var(--space-xs) var(--space-sm);
        border-radius: var(--radius-sm);
        font-size: 12px;
        white-space: nowrap;
        opacity: 0.9;
        transition: all 0.2s ease;
        box-shadow: var(--shadow-sm);
    }
    
    .reminder-card {
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-md);
    }
    
    .reminder-header {
        background-color: var(--color-primary);
        color: var(--color-white);
        padding: var(--space-md) var(--space-lg);
        display: flex;
        align-items: center;
        gap: var(--space-md);
        font-family: var(--font-heading);
        font-weight: 600;
    }
    
    .reminder-content {
        padding: var(--space-lg);
    }
    
    .reminder-detail {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        margin-bottom: var(--space-md);
    }
    
    .reminder-benefits {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .benefit {
        display: flex;
        gap: var(--space-md);
        align-items: flex-start;
    }
    
    .benefit-icon {
        width: 40px;
        height: 40px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 18px;
        flex-shrink: 0;
    }
    
    .setup-steps {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .setup-step {
        display: flex;
        gap: var(--space-lg);
        align-items: center;
    }
    
    .step-number {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-white);
        font-family: var(--font-heading);
        font-weight: 800;
        font-size: 16px;
        flex-shrink: 0;
    }
    
    .compliance {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .compliance-item {
        display: flex;
        gap: var(--space-md);
        align-items: flex-start;
    }
    
    .compliance-icon {
        width: 48px;
        height: 48px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .security-measures {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-xl) 0;
    }
    
    .esia-info {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        margin: var(--space-xl) 0;
    }
    
    .esia-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        background-color: var(--color-primary);
        color: var(--color-white);
        border-radius: var(--radius-xl);
        font-family: var(--font-heading);
        font-weight: 600;
        margin-bottom: var(--space-md);
    }
    
    .security-visual {
        background-color: var(--color-background);
        padding: var(--space-xl);
        border-radius: var(--radius-lg);
    }
    
    .security-layers {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
    }
    
    .layer {
        display: flex;
        align-items: center;
        gap: var(--space-lg);
        padding: var(--space-md);
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
    }
    
    .layer-icon {
        width: 48px;
        height: 48px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 20px;
        flex-shrink: 0;
    }
    
    /* Адаптивность */
    @media (max-width: 1024px) {
        .detailed-feature {
            grid-template-columns: 1fr;
            gap: var(--space-xl);
        }
        
        .feature-nav {
            position: static;
            margin: var(--space-xl) 0;
        }
    }
    
    @media (max-width: 768px) {
        .features-title {
            font-size: 36px;
        }
        
        .feature-title {
            font-size: 24px;
        }
        
        .feature-visual {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .advantages,
        .analysis-types,
        .symptoms-categories {
            grid-template-columns: 1fr;
        }
    }
    
    @media (max-width: 480px) {
        .features-title {
            font-size: 32px;
        }
        
        .feature-nav-list {
            flex-direction: column;
        }
        
        .feature-visual {
            grid-template-columns: 1fr;
        }
        
        .tech-item,
        .help-point,
        .benefit,
        .setup-step,
        .compliance-item,
        .layer {
            flex-direction: column;
            text-align: center;
        }
        
        .tech-icon,
        .help-icon,
        .benefit-icon,
        .compliance-icon,
        .layer-icon {
            margin-right: 0;
            margin-bottom: var(--space-md);
        }
    }
`;

document.head.appendChild(style);