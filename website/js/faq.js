// JavaScript для страницы FAQ

document.addEventListener('DOMContentLoaded', function() {
    initFAQPage();
    initFAQSearch();
    initQuestionToggles();
    initCategoryNavigation();
    initCopyToClipboard();
});

// Инициализация страницы FAQ
function initFAQPage() {
    // Добавляем стили для активного элемента навигации
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'faq.html') {
            link.classList.add('active');
        }
    });
    
    // Инициализация плавной прокрутки для внутренних ссылок
    initFAQSmoothScroll();
    
    // Анимация появления элементов при скролле
    initFAQScrollAnimations();
}

// Поиск по FAQ
function initFAQSearch() {
    const searchInput = document.getElementById('faq-search');
    const searchClear = document.querySelector('.search-clear');
    
    if (!searchInput) return;
    
    // Очистка поиска
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            clearSearchResults();
            this.style.opacity = '0';
        });
    }
    
    // Поиск при вводе
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        // Показываем/скрываем кнопку очистки
        if (searchClear) {
            searchClear.style.opacity = query ? '1' : '0';
        }
        
        if (query.length === 0) {
            clearSearchResults();
            return;
        }
        
        if (query.length < 2) {
            return; // Минимум 2 символа для поиска
        }
        
        performFAQSearch(query);
    });
    
    // Поиск при нажатии Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim().toLowerCase();
            if (query.length >= 2) {
                performFAQSearch(query);
            }
        }
    });
}

// Выполнение поиска по FAQ
function performFAQSearch(query) {
    const questions = document.querySelectorAll('.faq-question');
    let foundCount = 0;
    
    questions.forEach(question => {
        const questionText = question.querySelector('h3').textContent.toLowerCase();
        const answerText = question.querySelector('.question-answer').textContent.toLowerCase();
        
        if (questionText.includes(query) || answerText.includes(query)) {
            question.style.display = 'block';
            highlightText(question, query);
            foundCount++;
        } else {
            question.style.display = 'none';
        }
    });
    
    // Показываем результаты поиска
    showSearchResults(query, foundCount);
}

// Подсветка найденного текста
function highlightText(element, query) {
    const textElements = element.querySelectorAll('h3, .question-answer p, .question-answer li');
    
    textElements.forEach(textElement => {
        const originalHTML = textElement.innerHTML;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const highlightedHTML = originalHTML.replace(regex, '<mark class="search-highlight">$1</mark>');
        
        if (highlightedHTML !== originalHTML) {
            textElement.innerHTML = highlightedHTML;
        }
    });
}

// Очистка результатов поиска
function clearSearchResults() {
    const questions = document.querySelectorAll('.faq-question');
    const highlights = document.querySelectorAll('.search-highlight');
    
    // Показываем все вопросы
    questions.forEach(question => {
        question.style.display = 'block';
    });
    
    // Убираем подсветку
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.innerHTML = parent.innerHTML.replace(/<\/?mark[^>]*>/g, '');
    });
    
    // Скрываем результаты поиска
    hideSearchResults();
}

// Показать результаты поиска
function showSearchResults(query, count) {
    let resultsContainer = document.querySelector('.search-results');
    
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        document.querySelector('.faq-search').appendChild(resultsContainer);
    }
    
    if (count === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>По запросу "<strong>${query}</strong>" ничего не найдено</p>
                <p class="suggestion">Попробуйте изменить формулировку или использовать другие ключевые слова</p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = `
            <div class="results-found">
                <i class="fas fa-check-circle"></i>
                <p>Найдено <strong>${count}</strong> вопросов по запросу "<strong>${query}</strong>"</p>
            </div>
        `;
    }
    
    resultsContainer.style.display = 'block';
}

// Скрыть результаты поиска
function hideSearchResults() {
    const resultsContainer = document.querySelector('.search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

// Переключение вопросов (аккордеон)
function initQuestionToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const question = this.closest('.faq-question');
            const answer = question.querySelector('.question-answer');
            
            // Закрываем все остальные вопросы
            if (!question.classList.contains('active')) {
                const activeQuestions = document.querySelectorAll('.faq-question.active');
                activeQuestions.forEach(activeQuestion => {
                    if (activeQuestion !== question) {
                        activeQuestion.classList.remove('active');
                        const activeAnswer = activeQuestion.querySelector('.question-answer');
                        if (activeAnswer) {
                            activeAnswer.style.maxHeight = null;
                        }
                    }
                });
            }
            
            // Переключаем текущий вопрос
            question.classList.toggle('active');
            
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = null;
            }
        });
    });
    
    // Автоматически открываем вопрос, если он является якорем в URL
    const hash = window.location.hash;
    if (hash) {
        const targetQuestion = document.querySelector(hash);
        if (targetQuestion && targetQuestion.classList.contains('faq-question')) {
            setTimeout(() => {
                targetQuestion.classList.add('active');
                const answer = targetQuestion.querySelector('.question-answer');
                if (answer) {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            }, 100);
        }
    }
}

// Навигация по категориям
function initCategoryNavigation() {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                scrollToCategory(targetElement);
                
                // Автоматически открываем первый вопрос в категории
                setTimeout(() => {
                    const firstQuestion = targetElement.querySelector('.faq-question');
                    if (firstQuestion && !firstQuestion.classList.contains('active')) {
                        firstQuestion.classList.add('active');
                        const answer = firstQuestion.querySelector('.question-answer');
                        if (answer) {
                            answer.style.maxHeight = answer.scrollHeight + 'px';
                        }
                    }
                }, 500);
            }
        });
    });
}

// Плавная прокрутка к категории
function scrollToCategory(element) {
    const headerHeight = document.querySelector('.navbar').offsetHeight;
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - headerHeight - 20;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Плавная прокрутка для страницы FAQ
function initFAQSmoothScroll() {
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

// Копирование кода в буфер обмена
function initCopyToClipboard() {
    const codeElements = document.querySelectorAll('code');
    
    codeElements.forEach(code => {
        // Добавляем иконку копирования
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code';
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyButton.setAttribute('aria-label', 'Копировать код');
        
        code.parentNode.insertBefore(copyButton, code.nextSibling);
        
        // Обработка копирования
        copyButton.addEventListener('click', function() {
            const textToCopy = code.textContent;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCopyNotification('Код скопирован в буфер обмена');
                
                // Визуальная обратная связь
                this.innerHTML = '<i class="fas fa-check"></i>';
                this.style.backgroundColor = '#10B981';
                
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i>';
                    this.style.backgroundColor = '';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                showCopyNotification('Ошибка копирования');
            });
        });
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

// Анимация появления элементов при скролле
function initFAQScrollAnimations() {
    const categories = document.querySelectorAll('.faq-category');
    const questions = document.querySelectorAll('.faq-question');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    categories.forEach(category => observer.observe(category));
    questions.forEach(question => observer.observe(question));
}

// Добавляем стили для этой страницы
const style = document.createElement('style');
style.textContent = `
    /* Стили для страницы FAQ */
    .faq-header {
        padding: 120px 0 60px;
        background: linear-gradient(135deg, var(--color-background) 0%, rgba(240, 249, 255, 0.5) 100%);
        text-align: center;
    }
    
    .faq-title {
        font-size: 48px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
    }
    
    .faq-subtitle {
        font-size: 20px;
        color: var(--color-gray-600);
        max-width: 600px;
        margin: 0 auto var(--space-2xl);
    }
    
    .faq-search {
        max-width: 600px;
        margin: 0 auto;
    }
    
    .search-box {
        position: relative;
        margin-bottom: var(--space-sm);
    }
    
    .search-box i {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-gray-400);
        font-size: 18px;
    }
    
    #faq-search {
        width: 100%;
        padding: var(--space-lg) var(--space-lg) var(--space-lg) 50px;
        font-size: 16px;
        border: 2px solid var(--color-gray-200);
        border-radius: var(--radius-lg);
        font-family: var(--font-body);
        transition: all 0.2s ease;
    }
    
    #faq-search:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
    
    .search-clear {
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--color-gray-400);
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .search-hint {
        font-size: 14px;
        color: var(--color-gray-500);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
    }
    
    .search-results {
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        margin-top: var(--space-md);
        box-shadow: var(--shadow-md);
        display: none;
    }
    
    .no-results, .results-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
        text-align: center;
    }
    
    .no-results i {
        font-size: 40px;
        color: var(--color-gray-400);
    }
    
    .results-found i {
        font-size: 40px;
        color: var(--color-primary);
    }
    
    .suggestion {
        font-size: 14px;
        color: var(--color-gray-500);
        margin-top: var(--space-xs);
    }
    
    .search-highlight {
        background-color: #FEF3C7;
        color: #92400E;
        padding: 2px 4px;
        border-radius: 3px;
    }
    
    .faq-categories {
        padding: var(--space-2xl) 0;
        background-color: var(--color-white);
    }
    
    .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
    }
    
    .category-card {
        background-color: var(--color-background);
        padding: var(--space-xl);
        border-radius: var(--radius-lg);
        text-decoration: none;
        color: inherit;
        transition: all 0.3s ease;
        text-align: center;
    }
    
    .category-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
        background-color: rgba(14, 165, 233, 0.1);
    }
    
    .category-icon {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto var(--space-lg);
        color: var(--color-white);
        font-size: 24px;
    }
    
    .category-card h3 {
        font-size: 20px;
        color: var(--color-text);
        margin-bottom: var(--space-sm);
    }
    
    .category-card p {
        color: var(--color-gray-600);
        font-size: 14px;
    }
    
    .faq-main {
        padding: var(--space-3xl) 0;
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(56, 189, 248, 0.05) 100%);
    }
    
    .faq-category {
        margin-bottom: var(--space-3xl);
    }
    
    .faq-category:last-child {
        margin-bottom: 0;
    }
    
    .category-header {
        text-align: center;
        margin-bottom: var(--space-2xl);
    }
    
    .category-title {
        font-size: 32px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-md);
    }
    
    .category-description {
        font-size: 18px;
        color: var(--color-gray-600);
        max-width: 600px;
        margin: 0 auto;
    }
    
    .faq-questions {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .faq-question {
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        overflow: hidden;
        margin-bottom: var(--space-md);
        box-shadow: var(--shadow-md);
        transition: all 0.3s ease;
    }
    
    .faq-question.animate-in {
        animation: slideIn 0.5s ease forwards;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .faq-question:hover {
        box-shadow: var(--shadow-lg);
    }
    
    .question-header {
        padding: var(--space-lg) var(--space-xl);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }
    
    .question-header:hover {
        background-color: var(--color-background);
    }
    
    .question-header h3 {
        font-size: 18px;
        color: var(--color-text);
        margin: 0;
        flex: 1;
        text-align: left;
    }
    
    .toggle-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        cursor: pointer;
        padding: var(--space-sm);
        transition: transform 0.3s ease;
    }
    
    .faq-question.active .toggle-btn {
        transform: rotate(180deg);
    }
    
    .question-answer {
        padding: 0 var(--space-xl);
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.5s ease;
    }
    
    .question-answer > *:last-child {
        margin-bottom: var(--space-lg);
    }
    
    .steps {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .step {
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
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
    
    .note {
        background-color: rgba(14, 165, 233, 0.1);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        margin: var(--space-lg) 0;
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .note i {
        color: var(--color-primary);
        font-size: 20px;
        margin-top: 2px;
        flex-shrink: 0;
    }
    
    .note.info {
        background-color: rgba(14, 165, 233, 0.1);
        border-left: 4px solid var(--color-primary);
    }
    
    .note.warning {
        background-color: rgba(249, 115, 22, 0.1);
        border-left: 4px solid var(--color-cta);
    }
    
    .note.warning i {
        color: var(--color-cta);
    }
    
    .commands-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .command-item {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .command-item code {
        display: block;
        background-color: var(--color-gray-900);
        color: var(--color-white);
        padding: var(--space-sm) var(--space-md);
        border-radius: var(--radius-sm);
        font-family: 'Monaco', 'Courier New', monospace;
        margin-bottom: var(--space-sm);
        text-align: center;
    }
    
    .copy-code {
        background-color: var(--color-gray-200);
        border: none;
        color: var(--color-gray-700);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 12px;
        margin-left: var(--space-sm);
        transition: all 0.2s ease;
    }
    
    .copy-code:hover {
        background-color: var(--color-gray-300);
    }
    
    .platforms {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .platform {
        display: flex;
        gap: var(--space-md);
        align-items: center;
    }
    
    .platform-icon {
        width: 40px;
        height: 40px;
        background-color: rgba(14, 165, 233, 0.1);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        font-size: 20px;
    }
    
    .districts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .district-group h4 {
        font-size: 16px;
        color: var(--color-text);
        margin-bottom: var(--space-sm);
    }
    
    .district-group ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .district-group li {
        margin-bottom: var(--space-xs);
        color: var(--color-gray-700);
    }
    
    .cancellation-methods {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .method {
        background-color: var(--color-background);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
    }
    
    .method.primary {
        background-color: rgba(14, 165, 233, 0.1);
        border: 2px solid var(--color-primary);
    }
    
    .method h4 {
        font-size: 16px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .method ol {
        padding-left: var(--space-lg);
        margin: 0;
    }
    
    .method li {
        margin-bottom: var(--space-sm);
        color: var(--color-gray-700);
    }
    
    .important {
        background-color: rgba(249, 115, 22, 0.1);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        margin: var(--space-lg) 0;
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
    }
    
    .important i {
        color: var(--color-cta);
        font-size: 24px;
        margin-top: 2px;
        flex-shrink: 0;
    }
    
    .reminder-schedule {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .reminder-time {
        text-align: center;
    }
    
    .time-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-primary);
        border-radius: var(--radius-xl);
        font-family: var(--font-heading);
        font-weight: 600;
        margin-bottom: var(--space-sm);
    }
    
    .security-info {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .security-point {
        display: flex;
        gap: var(--space-lg);
        align-items: flex-start;
        padding: var(--space-md);
        background-color: var(--color-background);
        border-radius: var(--radius-lg);
    }
    
    .security-point.positive {
        border-left: 4px solid #10B981;
    }
    
    .point-icon {
        color: #10B981;
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .analysis-types {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .type-group h4 {
        font-size: 16px;
        color: var(--color-text);
        margin-bottom: var(--space-sm);
    }
    
    .accuracy-info {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .accuracy-level {
        display: flex;
        gap: var(--space-lg);
        align-items: center;
    }
    
    .level-badge {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-heading);
        font-weight: 800;
        font-size: 24px;
        color: var(--color-white);
        flex-shrink: 0;
    }
    
    .level-badge.high {
        background: linear-gradient(135deg, #10B981, #34D399);
    }
    
    .level-badge.medium {
        background: linear-gradient(135deg, #F59E0B, #FBBF24);
    }
    
    .esia-explanation {
        margin: var(--space-lg) 0;
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
        margin-bottom: var(--space-lg);
    }
    
    .reasons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .reason {
        display: flex;
        gap: var(--space-md);
        align-items: flex-start;
    }
    
    .reason-icon {
        color: #10B981;
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
    }
    
    .auth-process ol {
        padding-left: var(--space-xl);
        margin: var(--space-lg) 0;
    }
    
    .auth-process li {
        margin-bottom: var(--space-md);
        color: var(--color-gray-700);
    }
    
    .deletion-methods {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-lg);
        margin: var(--space-lg) 0;
    }
    
    .deletion-time {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        margin-top: var(--space-md);
        padding: var(--space-sm) var(--space-md);
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-primary);
        border-radius: var(--radius-lg);
        font-size: 14px;
    }
    
    .faq-contact {
        padding: var(--space-3xl) 0;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    }
    
    .contact-card {
        background-color: var(--color-white);
        padding: var(--space-2xl);
        border-radius: var(--radius-xl);
        text-align: center;
        max-width: 600px;
        margin: 0 auto;
        box-shadow: var(--shadow-xl);
    }
    
    .contact-card h3 {
        font-size: 32px;
        color: var(--color-text);
        margin-bottom: var(--space-md);
    }
    
    .contact-card p {
        color: var(--color-gray-700);
        margin-bottom: var(--space-xl);
    }
    
    .contact-buttons {
        display: flex;
        gap: var(--space-lg);
        justify-content: center;
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
        .faq-title {
            font-size: 40px;
        }
        
        .category-title {
            font-size: 28px;
        }
    }
    
    @media (max-width: 768px) {
        .faq-title {
            font-size: 32px;
        }
        
        .category-title {
            font-size: 24px;
            flex-direction: column;
            gap: var(--space-sm);
        }
        
        .categories-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .contact-buttons {
            flex-direction: column;
        }
        
        .question-header {
            padding: var(--space-md) var(--space-lg);
        }
        
        .question-header h3 {
            font-size: 16px;
        }
    }
    
    @media (max-width: 480px) {
        .categories-grid {
            grid-template-columns: 1fr;
        }
        
        .commands-grid,
        .platforms,
        .districts,
        .cancellation-methods,
        .reminder-schedule,
        .analysis-types,
        .reasons,
        .deletion-methods {
            grid-template-columns: 1fr;
        }
        
        .accuracy-level {
            flex-direction: column;
            text-align: center;
        }
        
        .step {
            flex-direction: column;
            text-align: center;
        }
        
        .step-number {
            margin: 0 auto;
        }
    }
`;

document.head.appendChild(style);