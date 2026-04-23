// JavaScript для страницы политики конфиденциальности

document.addEventListener('DOMContentLoaded', function() {
    initPrivacyPage();
    updateCurrentDate();
    initTableOfContents();
    initAnchorLinks();
    initPrintFunctionality();
});

// Инициализация страницы политики конфиденциальности
function initPrivacyPage() {
    // Добавляем стили для активного элемента навигации
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'privacy.html') {
            link.classList.add('active');
        }
    });
    
    // Инициализация плавной прокрутки для внутренних ссылок
    initSmoothScrollPrivacy();
    
    // Инициализация подсветки текущего раздела
    initSectionHighlight();
}

// Обновление текущей даты
function updateCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (!currentDateElement) return;
    
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Europe/Moscow'
    };
    
    const formatter = new Intl.DateTimeFormat('ru-RU', options);
    currentDateElement.textContent = formatter.format(now);
}

// Инициализация оглавления
function initTableOfContents() {
    const tocLinks = document.querySelectorAll('.toc a');
    const articles = document.querySelectorAll('.privacy-article');
    
    // Плавная прокрутка при клике на пункты оглавления
    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = targetPosition - headerHeight - 20;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Обновляем активный пункт
                updateActiveTocItem(targetId);
            }
        });
    });
    
    // Обновление активного пункта при скролле
    window.addEventListener('scroll', () => {
        let currentSection = '';
        
        articles.forEach(article => {
            const articleTop = article.offsetTop;
            const articleHeight = article.clientHeight;
            const scrollPosition = window.scrollY + 200; // Смещение для лучшей видимости
            
            if (scrollPosition >= articleTop && scrollPosition < articleTop + articleHeight) {
                currentSection = article.id;
            }
        });
        
        if (currentSection) {
            updateActiveTocItem(currentSection);
        }
    });
}

// Обновление активного пункта в оглавлении
function updateActiveTocItem(sectionId) {
    const tocLinks = document.querySelectorAll('.toc a');
    
    tocLinks.forEach(link => {
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Инициализация якорных ссылок
function initAnchorLinks() {
    const headings = document.querySelectorAll('.article-title');
    
    headings.forEach(heading => {
        const article = heading.closest('.privacy-article');
        if (article && article.id) {
            const linkIcon = document.createElement('a');
            linkIcon.href = `#${article.id}`;
            linkIcon.className = 'anchor-link';
            linkIcon.innerHTML = '<i class="fas fa-link"></i>';
            linkIcon.setAttribute('aria-label', 'Ссылка на этот раздел');
            
            heading.appendChild(linkIcon);
            
            // Копирование ссылки при клике
            linkIcon.addEventListener('click', function(e) {
                e.preventDefault();
                
                const url = window.location.origin + window.location.pathname + '#' + article.id;
                
                navigator.clipboard.writeText(url).then(() => {
                    showCopyNotification('Ссылка скопирована в буфер обмена');
                }).catch(err => {
                    console.error('Ошибка копирования ссылки:', err);
                    showCopyNotification('Ошибка копирования ссылки');
                });
            });
        }
    });
}

// Показать уведомление о копировании
function showCopyNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Плавная прокрутка для страницы политики
function initSmoothScrollPrivacy() {
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

// Подсветка текущего раздела
function initSectionHighlight() {
    const articles = document.querySelectorAll('.privacy-article');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            } else {
                entry.target.classList.remove('in-view');
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px -100px 0px'
    });
    
    articles.forEach(article => observer.observe(article));
}

// Функциональность печати
function initPrintFunctionality() {
    const printButton = document.createElement('button');
    printButton.className = 'print-button';
    printButton.innerHTML = '<i class="fas fa-print"></i> Распечатать';
    printButton.addEventListener('click', printPrivacyPolicy);
    
    const header = document.querySelector('.privacy-header-content');
    if (header) {
        header.appendChild(printButton);
    }
}

// Печать политики конфиденциальности
function printPrivacyPolicy() {
    const originalContent = document.body.innerHTML;
    const printContent = document.querySelector('.privacy-content').innerHTML;
    
    // Сохраняем заголовок
    const title = document.title;
    
    // Создаем контент для печати
    document.body.innerHTML = `
        <div class="print-container">
            <div class="print-header">
                <h1>${title}</h1>
                <p>Версия от ${document.getElementById('current-date').textContent}</p>
                <hr>
            </div>
            ${printContent}
        </div>
    `;
    
    // Добавляем стили для печати
    const style = document.createElement('style');
    style.textContent = `
        @media print {
            body { 
                font-family: 'Times New Roman', serif; 
                font-size: 12pt; 
                line-height: 1.5; 
            }
            .print-header { 
                text-align: center; 
                margin-bottom: 2cm; 
            }
            h1, h2, h3, h4 { 
                page-break-after: avoid; 
            }
            .privacy-article { 
                page-break-inside: avoid; 
                margin-bottom: 1cm; 
            }
            .toc, .footer, .navbar, .sticky-cta, .print-button { 
                display: none !important; 
            }
            a { 
                color: #000; 
                text-decoration: none; 
            }
        }
    `;
    document.head.appendChild(style);
    
    // Печать
    window.print();
    
    // Восстанавливаем оригинальный контент
    document.body.innerHTML = originalContent;
    
    // Восстанавливаем обработчики событий
    window.location.reload();
}

// Экспорт политики в PDF (функциональность по требованию)
function exportToPDF() {
    // Здесь может быть интеграция с библиотекой для генерации PDF
    console.log('Экспорт в PDF функциональность может быть добавлена при необходимости');
    
    // Для реализации можно использовать библиотеки типа jsPDF или делать запрос на сервер
    showCopyNotification('Экспорт в PDF будет реализован в будущих версиях');
}

// Добавляем стили для этой страницы
const style = document.createElement('style');
style.textContent = `
    /* Стили для страницы политики конфиденциальности */
    .privacy-header {
        padding: 120px 0 60px;
        background: linear-gradient(135deg, var(--color-background) 0%, rgba(240, 249, 255, 0.5) 100%);
    }
    
    .privacy-header-content {
        text-align: center;
        max-width: 800px;
        margin: 0 auto;
    }
    
    .privacy-title {
        font-size: 48px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
    }
    
    .privacy-subtitle {
        font-size: 18px;
        color: var(--color-gray-600);
        margin-bottom: var(--space-lg);
    }
    
    .last-updated {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-primary);
        border-radius: var(--radius-lg);
        font-family: var(--font-heading);
        font-weight: 500;
    }
    
    .privacy-content {
        padding: var(--space-3xl) 0;
    }
    
    .privacy-grid {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: var(--space-2xl);
    }
    
    .toc {
        position: sticky;
        top: 100px;
        height: fit-content;
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .toc-title {
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 18px;
        margin-bottom: var(--space-lg);
        color: var(--color-text);
    }
    
    .toc-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .toc-list li {
        margin-bottom: var(--space-sm);
    }
    
    .toc-list a {
        display: block;
        padding: var(--space-sm) var(--space-md);
        color: var(--color-gray-700);
        border-radius: var(--radius-md);
        transition: all 0.2s ease;
        position: relative;
    }
    
    .toc-list a:hover,
    .toc-list a.active {
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-primary);
    }
    
    .toc-list a.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 60%;
        background-color: var(--color-primary);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }
    
    .privacy-article {
        background-color: var(--color-white);
        padding: var(--space-2xl);
        border-radius: var(--radius-lg);
        margin-bottom: var(--space-xl);
        box-shadow: var(--shadow-md);
        transition: all 0.3s ease;
    }
    
    .privacy-article.in-view {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
    }
    
    .article-title {
        font-size: 28px;
        color: var(--color-text);
        margin-bottom: var(--space-lg);
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .anchor-link {
        opacity: 0;
        transition: opacity 0.2s ease;
        color: var(--color-gray-400);
        font-size: 16px;
        padding: var(--space-sm);
        border-radius: var(--radius-md);
    }
    
    .privacy-article:hover .anchor-link,
    .anchor-link:hover {
        opacity: 1;
    }
    
    .anchor-link:hover {
        color: var(--color-primary);
        background-color: rgba(14, 165, 233, 0.1);
    }
    
    .article-content {
        font-size: 16px;
        line-height: 1.7;
    }
    
    .notice {
        background-color: rgba(14, 165, 233, 0.1);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        margin: var(--space-lg) 0;
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .notice i {
        color: var(--color-primary);
        font-size: 20px;
        margin-top: 2px;
        flex-shrink: 0;
    }
    
    .notice.warning {
        background-color: rgba(249, 115, 22, 0.1);
        border-left: 4px solid var(--color-cta);
    }
    
    .notice.warning i {
        color: var(--color-cta);
    }
    
    .notice.info {
        background-color: rgba(14, 165, 233, 0.1);
        border-left: 4px solid var(--color-primary);
    }
    
    .data-table {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .data-category {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .data-category h4 {
        font-size: 18px;
        margin-bottom: var(--space-md);
        color: var(--color-text);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .data-category ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .data-category li {
        margin-bottom: var(--space-sm);
        padding-left: var(--space-lg);
        position: relative;
    }
    
    .data-category li::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--color-primary);
    }
    
    .not-collected {
        list-style: none;
        padding: 0;
        margin: var(--space-lg) 0;
    }
    
    .not-collected li {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        margin-bottom: var(--space-sm);
        color: var(--color-gray-600);
    }
    
    .not-collected i {
        color: #dc2626;
    }
    
    .purposes-grid,
    .rights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .purpose-card,
    .right-card {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        text-align: center;
        transition: all 0.3s ease;
    }
    
    .purpose-card:hover,
    .right-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
    
    .purpose-icon,
    .right-icon {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto var(--space-md);
        color: var(--color-white);
        font-size: 24px;
    }
    
    .legal-basis {
        margin: var(--space-lg) 0;
    }
    
    .basis-item {
        display: flex;
        gap: var(--space-lg);
        margin-bottom: var(--space-lg);
        padding-bottom: var(--space-lg);
        border-bottom: 1px solid var(--color-gray-200);
    }
    
    .basis-item:last-child {
        border-bottom: none;
    }
    
    .basis-number {
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
        flex-shrink: 0;
    }
    
    .retention-table {
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-lg);
        overflow: hidden;
        margin: var(--space-lg) 0;
    }
    
    .retention-header {
        display: grid;
        grid-template-columns: 2fr 1fr 2fr;
        background-color: var(--color-background);
        padding: var(--space-lg);
        font-family: var(--font-heading);
        font-weight: 600;
        color: var(--color-text);
    }
    
    .retention-row {
        display: grid;
        grid-template-columns: 2fr 1fr 2fr;
        padding: var(--space-lg);
        border-top: 1px solid var(--color-gray-200);
        transition: background-color 0.2s ease;
    }
    
    .retention-row:hover {
        background-color: var(--color-background);
    }
    
    .retention-type {
        font-weight: 500;
    }
    
    .retention-period {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .exercise-rights {
        margin-top: var(--space-2xl);
        padding: var(--space-lg);
        background-color: var(--color-background);
        border-radius: var(--radius-lg);
    }
    
    .commands {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        margin-top: var(--space-lg);
    }
    
    .command {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md) var(--space-lg);
        background-color: var(--color-white);
        border-radius: var(--radius-md);
        font-family: 'Monaco', 'Courier New', monospace;
    }
    
    code {
        background-color: var(--color-gray-900);
        color: var(--color-white);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 14px;
    }
    
    .security-measures {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
    }
    
    .measure {
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .measure-icon {
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
    
    .contact-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .contact-card {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .contact-icon {
        width: 48px;
        height: 48px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 20px;
        margin-bottom: var(--space-md);
    }
    
    .contact-link {
        display: inline-block;
        margin-top: var(--space-sm);
        color: var(--color-primary);
        font-weight: 500;
        word-break: break-all;
    }
    
    .contact-email {
        color: var(--color-primary);
        font-weight: 500;
        margin-top: var(--space-sm);
    }
    
    .response-time {
        margin-top: var(--space-2xl);
    }
    
    .response-time ul {
        list-style: none;
        padding: 0;
        margin: var(--space-lg) 0 0;
    }
    
    .response-time li {
        margin-bottom: var(--space-md);
        padding-left: var(--space-xl);
        position: relative;
    }
    
    .response-time li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--color-primary);
        font-weight: bold;
    }
    
    .final-notice {
        margin-top: var(--space-2xl);
    }
    
    .print-button {
        margin-top: var(--space-lg);
        background-color: var(--color-primary);
        color: var(--color-white);
        border: none;
        padding: var(--space-md) var(--space-lg);
        border-radius: var(--radius-lg);
        font-family: var(--font-heading);
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        transition: all 0.2s ease;
    }
    
    .print-button:hover {
        background-color: var(--color-secondary);
        transform: translateY(-2px);
    }
    
    .copy-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--color-gray-900);
        color: var(--color-white);
        padding: var(--space-md) var(--space-lg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .copy-notification.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    /* Адаптивность */
    @media (max-width: 1024px) {
        .privacy-grid {
            grid-template-columns: 1fr;
        }
        
        .toc {
            position: static;
            margin-bottom: var(--space-xl);
        }
    }
    
    @media (max-width: 768px) {
        .privacy-title {
            font-size: 36px;
        }
        
        .privacy-article {
            padding: var(--space-lg);
        }
        
        .article-title {
            font-size: 24px;
        }
        
        .retention-header,
        .retention-row {
            grid-template-columns: 1fr;
            gap: var(--space-sm);
        }
        
        .basis-item {
            flex-direction: column;
            gap: var(--space-md);
        }
        
        .measure {
            flex-direction: column;
            gap: var(--space-md);
        }
    }
    
    @media (max-width: 480px) {
        .privacy-title {
            font-size: 32px;
        }
        
        .purposes-grid,
        .rights-grid,
        .contact-info {
            grid-template-columns: 1fr;
        }
    }
`;

document.head.appendChild(style);