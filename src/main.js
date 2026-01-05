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

// === Интеграция с Telegram Web App ===
if (window.Telegram && window.Telegram.WebApp) {
  const tg = window.Telegram.WebApp

  // Сообщаем Telegram, что приложение готово
  tg.ready()

  // Разворачиваем на весь экран (важно для Mini App)
  tg.expand()

  // Сохраняем initData — это строка с данными пользователя и hash для валидации на backend
  if (tg.initData) {
    localStorage.setItem('tg_init_data', tg.initData)
  }

  // Опционально: применяем тему Telegram (light/dark)
  const theme = tg.colorScheme || 'light'  // 'light' или 'dark'
  document.documentElement.setAttribute('data-theme', theme)
  document.body.classList.toggle('dark-theme', theme === 'dark')

  // Можно включить главную кнопку Telegram (например, для закрытия)
  // tg.MainButton.setText('Закрыть')
  // tg.MainButton.show()
  // tg.MainButton.onClick(() => tg.close())
}

// === Загрузка текущего пользователя (JWT или Telegram-авторизация) ===
ensureUser()

// Перезагружаем данные при событии изменения авторизации
window.addEventListener('auth-changed', ensureUser)