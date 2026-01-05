// src/composables/useTelegram.js
import { ref, computed } from 'vue'

const isTelegram = ref(false)
const tgUser = ref(null)

if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp
  
  // Расширяем WebApp для готовности
  tg.ready()
  
  // Включаем режим (для красоты в Telegram)
  tg.expand()
  
  isTelegram.value = true
  
  // Берём данные пользователя (если разрешён доступ)
  if (tg.initDataUnsafe?.user) {
    tgUser.value = tg.initDataUnsafe.user
  }
}

export function useTelegram() {
  return {
    isTelegram: computed(() => isTelegram.value),
    tgUser: computed(() => tgUser.value),
    tg: typeof window !== 'undefined' ? window.Telegram?.WebApp : null
  }
}
