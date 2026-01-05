// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { ensureUser } from "@/stores/auth"

// Создаём приложение Vue
const app = createApp(App)

// Подключаем роутер
app.use(router)

// Монтируем приложение в DOM
app.mount('#app')

// === ПОЛНАЯ ИНТЕГРАЦИЯ С TELEGRAM MINI APP ===
if (window.Telegram && window.Telegram.WebApp) {
  const tg = window.Telegram.WebApp

  // 1. Сообщаем Telegram, что приложение загружено и готово
  tg.ready()

  // 2. Разворачиваем приложение на весь экран (обязательно для Mini App)
  tg.expand()

  // 3. Сохраняем initData — критически важно для безопасной авторизации на бэкенде
  if (tg.initData) {
    localStorage.setItem('tg_init_data', tg.initData)
  } else {
    // Если по какой-то причине initData нет — очищаем старые данные (на всякий случай)
    localStorage.removeItem('tg_init_data')
  }

  // 4. Адаптация под тему Telegram (светлая/тёмная) + поддержка динамического изменения
  const applyTheme = () => {
    const theme = tg.colorScheme || 'light' // 'light' или 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.body.classList.toggle('dark-theme', theme === 'dark')
  }

  // Применяем тему сразу
  applyTheme()

  // Подписываемся на изменения темы (пользователь может переключить в настройках Telegram)
  tg.onEvent('themeChanged', applyTheme)

  // 5. Лёгкая вибрация при запуске — приятный UX
  tg.HapticFeedback.notificationOccurred('success')

  // 6. Опционально: настройка главной кнопки Telegram (MainButton)
  // Пример: кнопка "Закрыть приложение"
  // tg.MainButton.setText('Закрыть')
  // tg.MainButton.setParams({ color: '#e74c3c', text_color: '#ffffff' })
  // tg.MainButton.show()
  // tg.MainButton.onClick(() => tg.close())

  // Пример: кнопка "Поделиться" или "Помощь" — раскомментируй при необходимости
  // tg.MainButton.setText('Поделиться прогрессом')
  // tg.MainButton.show()
  // tg.MainButton.onClick(() => tg.shareScore?.() || alert('Поделиться!'))
}

// === АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ===
ensureUser()

// Перезагружаем данные пользователя при событии изменения авторизации (логин/логаут)
window.addEventListener('auth-changed', ensureUser)

// Опционально: обработка видимости приложения (когда пользователь сворачивает/разворачивает Mini App)
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.onEvent('viewportChanged', () => {
    window.Telegram.WebApp.expand()
  })
}
