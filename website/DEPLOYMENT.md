# Деплой веб-сайта Горздрав Бот

Это руководство содержит инструкции по развертыванию веб-сайта на различных хостинг-платформах.

## 🚀 Быстрое развертывание

## 🎯 Подготовка к деплою

### 1. Установка зависимостей

Проект не требует сборки, но есть несколько рекомендаций:

```bash
# Проверка структуры файлов
cd website
ls -la
```

Структура должна содержать:
- `index.html` - Главная страница
- `css/` - Стили
- `js/` - JavaScript файлы
- `*.html` - Остальные страницы
- Конфигурационные файлы (`.htaccess`, `robots.txt`, и т.д.)

### 2. Настройка домена

Перед деплоем убедитесь, что:
1. У вас есть доменное имя (например, `gorzdrav-bot.ru`)
2. Домен настроен на указание вашего сервера/хостинга

## 🌐 Деплой на различные платформы

### Вариант 1: GitHub Pages (Бесплатно)

1. **Создайте репозиторий** на GitHub
2. **Загрузите файлы** в корень репозитория
3. **Настройте GitHub Pages**:
   - Settings → Pages → Source → main branch
   - Custom domain: `gorzdrav-bot.ru`
   - Enforce HTTPS: ✅

**Конфигурация для GitHub Pages** (`CNAME` файл):
```
gorzdrav-bot.ru
```

### Вариант 2: Netlify (Бесплатно)

1. **Зарегистрируйтесь** на [netlify.com](https://netlify.com)
2. **Деплой через drag-and-drop**:
   - Перетащите папку `website` в Netlify
   - Или подключите GitHub репозиторий

3. **Настройка Netlify**:
```toml
# netlify.toml (дополнительно)
[build]
  publish = "website"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Вариант 3: Vercel (Бесплатно)

1. **Установите Vercel CLI**:
```bash
npm i -g vercel
```

2. **Деплой**:
```bash
cd website
vercel --prod
```

3. **Настройка кастомного домена** в dashboard Vercel

### Вариант 4: Традиционный хостинг (Apache/Nginx)

#### Apache:
1. **Загрузите файлы** в `public_html/`
2. **Настройте `.htaccess`** (уже включен в проект)
3. **Проверьте права доступа**:
```bash
chmod 644 .htaccess
chmod 755 .
```

#### Nginx:
```nginx
# /etc/nginx/sites-available/gorzdrav-bot
server {
    listen 80;
    server_name gorzdrav-bot.ru www.gorzdrav-bot.ru;
    root /var/www/gorzdrav-bot/website;
    index index.html;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml 
               application/javascript application/json 
               image/svg+xml;

    # Кэширование статики
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA роутинг
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Защитные заголовки
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Перенаправление на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gorzdrav-bot.ru www.gorzdrav-bot.ru;
    root /var/www/gorzdrav-bot/website;
    index index.html;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/gorzdrav-bot.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gorzdrav-bot.ru/privkey.pem;
    
    # Настройки SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Остальные настройки аналогичны HTTP блоку
}
```

## 🔒 Настройка SSL/HTTPS

### Let's Encrypt (Бесплатно):
```bash
# Установка Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d gorzdrav-bot.ru -d www.gorzdrav-bot.ru

# Автоматическое обновление
sudo certbot renew --dry-run
```

### Cloudflare (Рекомендуется):
1. **Перенаправьте DNS** на Cloudflare
2. **Включите**:
   - Always Use HTTPS ✅
   - SSL/TLS: Full (strict)
   - Auto Minify ✅
   - Brotli Compression ✅
   - Rocket Loader ⚠️ (может ломать JavaScript)

## 📊 Настройка аналитики

### Google Analytics 4:
1. **Создайте свойство** GA4
2. **Добавьте в `index.html`**:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Yandex.Metrika:
```html
<!-- Yandex.Metrika counter -->
<script type="text/javascript" >
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(XXXXXXXX, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/XXXXXXXX" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->
```

## 📱 PWA настройка

Проект уже включает базовую PWA конфигурацию:

1. **Проверьте манифест**: `site.webmanifest`
2. **Добавьте favicon разных размеров**:
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`
   - `android-chrome-192x192.png`
   - `android-chrome-512x512.png`

3. **Тестирование PWA**:
   - Chrome DevTools → Lighthouse → PWA аудит
   - [PWA Builder](https://www.pwabuilder.com/)

## 🚀 Оптимизация производительности

### Перед деплоем:
1. **Сожмите изображения**:
```bash
# Установите ImageOptim или используйте Squoosh.app
# Рекомендуемые форматы: WebP, AVIF
```

2. **Проверьте размеры файлов**:
```bash
find . -name "*.css" -o -name "*.js" | xargs ls -lah
# CSS: < 50KB
# JS: < 100KB
```

3. **Протестируйте скорость**:
   - [PageSpeed Insights](https://pagespeed.web.dev/)
   - [WebPageTest](https://www.webpagetest.org/)
   - [GTmetrix](https://gtmetrix.com/)

## 🔧 Мониторинг и поддержка

### Ошибки и логи:
1. **Настройте Sentry** (опционально):
```html
<script src="https://browser.sentry-cdn.com/7.0.0/bundle.min.js"></script>
<script>
  Sentry.init({ 
    dsn: "https://xxxxxxxx@xxxxxxx.ingest.sentry.io/xxxxxxx",
    environment: "production"
  });
</script>
```

2. **Uptime мониторинг**:
   - [UptimeRobot](https://uptimerobot.com/) - Бесплатно
   - [StatusCake](https://www.statuscake.com/) - Бесплатный тариф

### Резервное копирование:
```bash
# Простой скрипт для бэкапа
#!/bin/bash
BACKUP_DIR="/backups/gorzdrav-bot"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Создание бэкапа
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" /var/www/gorzdrav-bot

# Удаление старых бэкапов (старше 30 дней)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete
```

## 📈 Пост-деплой проверка

После деплоя проверьте:

1. **Функциональность**:
   - Все ссылки работают
   - Формы отправляются (если есть)
   - Мобильная версия корректна
   - Все страницы открываются

2. **SEO**:
   - `robots.txt` доступен
   - `sitemap.xml` валиден
   - Мета-теги корректны
   - Скорость загрузки > 90/100

3. **Безопасность**:
   - HTTPS работает
   - Заголовки безопасности установлены
   - Нет смешанного контента

4. **Аналитика**:
   - Google Analytics отслеживает
   - Конверсии настроены
   - Цели определены

## 🆘 Устранение проблем

### Частые проблемы:

1. **Страницы 404 после деплоя**:
   - Проверьте настройки роутинга SPA
   - `.htaccess` или nginx конфиг

2. **Медленная загрузка**:
   - Включите сжатие Gzip/Brotli
   - Настройке кэширование
   - Используйте CDN для статики

3. **SSL ошибки**:
   - Проверьте цепочку сертификатов
   - Обновите сертификат Let's Encrypt
   - Проверьте настройки Cloudflare

4. **PWA не работает**:
   - Проверьте манифест
   - Service Worker должен быть по HTTPS
   - Проверьте заголовки кэширования

## 📞 Поддержка

Если возникли проблемы с деплоем:

1. **Проверьте логи** сервера
2. **Используйте DevTools** для отладки
3. **Создайте issue** в репозитории
4. **Обратитесь к документации** хостинг-провайдера

---

**Горздрав Бот** · Успешного деплоя! 🚀