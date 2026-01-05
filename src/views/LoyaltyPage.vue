<template>
  <div class="loyalty-container" :class="{ 'tg-mode': isTelegram }">
    <div class="loyalty-card glass-card">
      <div class="loyalty-header">
        <h2 class="loyalty-title">Карта лояльности</h2>
        <p class="loyalty-user">Пользователь: <strong>{{ username || "Загрузка..." }}</strong></p>
      </div>

      <div class="loyalty-body">
        <!-- Карточка со штампами -->
        <div class="stamps-section">
          <p class="stamps-counter">
            Ваши штампы: <span class="stamps-count">{{ stamps }}</span> / {{ maxStamps }}
          </p>
          <LoyaltyCard :count="stamps" :max="maxStamps" />
        </div>

        <!-- Сообщение о бесплатном напитке -->
        <transition name="fade">
          <div v-if="stamps >= maxStamps" class="reward-message">
            <div class="reward-icon">🎉</div>
            <p>Вы накопили максимум штампов!</p>
            <p class="reward-text">Покажите это баристе и получите <strong>бесплатный напиток ☕</strong></p>
          </div>
        </transition>

        <!-- Действия -->
        <div class="actions">
          <button
            class="generate-btn"
            @click="generateCode"
            :disabled="loading || stamps >= maxStamps"
          >
            {{ loading ? "Генерирую код..." : "Сгенерировать код для штампа" }}
          </button>

          <button
            v-if="stamps >= maxStamps"
            class="reset-btn"
            @click="resetStamps"
            :disabled="loading"
          >
            Я получил напиток
          </button>
        </div>

        <!-- Отображение сгенерированного кода -->
        <transition name="slide-up">
          <div v-if="code" class="code-popup">
            <p class="code-label">Ваш код для баристы:</p>
            <p class="code-value">{{ code }}</p>
            <p class="code-hint">Действует 15 минут. Покажите баристе.</p>
          </div>
        </transition>
      </div>
    </div>

    <Toast ref="toast" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getUserProfile, generateLoyaltyCode, resetLoyalty } from "@/api";
import LoyaltyCard from "@/components/LoyaltyCard.vue";
import Toast from "@/components/Toast.vue";
import { useTelegram } from "@/composables/useTelegram";

const { isTelegram } = useTelegram();

const profile = ref({});
const code = ref(null);
const loading = ref(false);
const toast = ref(null);

const username = computed(() => profile.value?.username ?? "");
const stamps = computed(() => Number(profile.value?.stamps ?? 0));
const maxStamps = computed(() => Number(profile.value?.max_stamps ?? 6));

async function loadProfile() {
  try {
    const res = await getUserProfile();
    profile.value = res.data ?? {};
  } catch (e) {
    console.error("Ошибка загрузки профиля:", e);
    toast.value?.show("Не удалось загрузить профиль", "error");
    profile.value = {};
  }
}

async function generateCode() {
  loading.value = true;
  try {
    const res = await generateLoyaltyCode();
    code.value = res.data?.code ?? null;

    if (code.value) {
      toast.value?.show("Код успешно сгенерирован!", "success");
    } else {
      toast.value?.show("Не удалось получить код", "error");
    }

    await loadProfile(); // Обновляем штампы
  } catch (e) {
    toast.value?.show(e?.response?.data?.detail || "Ошибка генерации кода", "error");
    code.value = null;
  } finally {
    loading.value = false;
  }
}

async function resetStamps() {
  if (!confirm("Подтвердите получение напитка. Штампы будут сброшены.")) return;

  loading.value = true;
  try {
    const res = await resetLoyalty();
    toast.value?.show(res.data?.detail || "Поздравляем! Штампы сброшены.", "success");
    code.value = null;
    await loadProfile();
  } catch (e) {
    toast.value?.show(e?.response?.data?.detail || "Не удалось сбросить штампы", "error");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProfile();
});
</script>

<style scoped>
.loyalty-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  transition: background 0.3s ease;
}

/* В Telegram — фон по теме */
.loyalty-container.tg-mode {
  background: var(--tg-theme-bg-color, #ffffff);
}

.loyalty-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  right: -50%;
  bottom: -50%;
  background:
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
  animation: float 20s infinite linear;
  opacity: 1;
}

.loyalty-container.tg-mode::before {
  opacity: 0;
}

@keyframes float {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loyalty-card {
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: background 0.3s ease;
}

.loyalty-container.tg-mode .loyalty-card {
  background: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.9));
  color: var(--tg-theme-text-color, #000000);
}

.loyalty-header {
  text-align: center;
  margin-bottom: 32px;
}

.loyalty-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
}

.loyalty-user {
  font-size: 18px;
  color: #4b5563;
  margin: 0;
}

.loyalty-body {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.stamps-section {
  text-align: center;
}

.stamps-counter {
  font-size: 20px;
  color: #374151;
  margin-bottom: 20px;
}

.stamps-count {
  font-size: 36px;
  font-weight: 800;
  color: #6366f1;
}

/* Сообщение о награде */
.reward-message {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  border: 2px solid #28a745;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  color: #155724;
}

.reward-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.reward-text {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0 0;
}

/* Кнопки действий */
.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generate-btn,
.reset-btn {
  padding: 18px;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.generate-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
}

.generate-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.reset-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.reset-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
}

/* Код */
.code-popup {
  background: rgba(255, 255, 255, 0.95);
  border: 3px dashed #6366f1;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  margin-top: 20px;
  animation: slide-up 0.4s ease-out;
}

.loyalty-container.tg-mode .code-popup {
  background: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.95));
  border-color: var(--tg-theme-button-color, #6366f1);
}

.code-label {
  font-size: 16px;
  color: #4b5563;
  margin-bottom: 8px;
}

.code-value {
  font-size: 48px;
  font-weight: 800;
  color: #6366f1;
  letter-spacing: 8px;
  margin: 16px 0;
}

.code-hint {
  font-size: 15px;
  color: #6b7280;
}

/* Анимации */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  animation: slide-up 0.5s ease-out;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Адаптивность */
@media (max-width: 480px) {
  .loyalty-card {
    padding: 32px 24px;
  }
  .loyalty-title {
    font-size: 28px;
  }
  .code-value {
    font-size: 40px;
    letter-spacing: 4px;
  }
}
</style>
