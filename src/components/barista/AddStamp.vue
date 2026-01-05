<template>
  <div class="stamp-card glass-card" :class="{ 'tg-mode': isTelegram }">
    <div class="card-header">
      <h3 class="card-title">
        <i class="icon-stamp"></i>
        Начислить штамп по Telegram
      </h3>
      <div class="card-subtitle">Ручное добавление штампов по @username</div>
    </div>

    <div class="form-group">
      <div class="input-group">
        <div class="input-with-icon">
          <i class="icon-telegram"></i>
          <input
            v-model.trim="telegramUsername"
            placeholder="@username из Telegram"
            @blur="loadStatus"
            @keyup.enter="loadStatus"
            class="form-input"
            :disabled="loading"
            autocomplete="off"
          />
        </div>

        <div class="input-with-icon">
          <i class="icon-number"></i>
          <input
            v-model.number="amount"
            type="number"
            min="1"
            :max="availableStamps"
            :disabled="loading || userStamps === null || atLimit"
            class="form-input number-input"
            placeholder="Кол-во"
          />
        </div>

        <button
          class="btn-primary btn-lg btn-with-icon"
          :disabled="loading || !canSubmit || atLimit || userStamps === null"
          @click="submit"
        >
          <i class="icon-add"></i>
          {{ loading ? "Начисляем…" : "Добавить штамп(ы)" }}
        </button>
      </div>
    </div>

    <!-- Прогресс бар -->
    <transition name="fade">
      <div v-if="userStamps !== null && maxStamps !== null" class="progress-section">
        <div class="progress-header">
          <span class="progress-label">Прогресс лояльности</span>
          <span class="progress-count">{{ userStamps }} / {{ maxStamps }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progress}%` }"
            :class="{ 'progress-complete': atLimit }"
          ></div>
        </div>
        <div class="progress-dots">
          <span
            v-for="n in maxStamps"
            :key="n"
            :class="['progress-dot', { 'filled': n <= userStamps }]"
          >
            {{ n }}
          </span>
        </div>
        <div class="progress-note" v-if="atLimit">
          🎉 Лимит достигнут — положен бесплатный напиток!
        </div>
      </div>
    </transition>

    <!-- Сообщение -->
    <transition name="fade">
      <div v-if="msg" :class="['alert', `alert-${status}`]">
        <i :class="`icon-${status}`"></i>
        <span>{{ msg }}</span>
      </div>
    </transition>

    <div class="hint">
      <i class="icon-info"></i>
      Клиент говорит свой @username из Telegram — введите его и нажмите Enter.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { getLoyaltyStatusByTelegram, addStampByTelegram } from "@/api";
import { useTelegram } from "@/composables/useTelegram";

const { isTelegram } = useTelegram();

const telegramUsername = ref("");
const amount = ref(1);
const loading = ref(false);
const msg = ref("");
const status = ref("");
const userStamps = ref(null);
const maxStamps = ref(6); // можно получать с бэкенда, если меняется

const canSubmit = computed(() =>
  !!telegramUsername.value.trim() &&
  telegramUsername.value.startsWith("@") &&
  Number(amount.value) > 0 &&
  userStamps.value !== null &&
  !atLimit.value
);

const atLimit = computed(() => userStamps.value >= maxStamps.value);
const availableStamps = computed(() => atLimit.value ? 0 : (maxStamps.value - userStamps.value));
const progress = computed(() => {
  if (userStamps.value === null) return 0;
  return Math.min(100, (userStamps.value / maxStamps.value) * 100);
});

async function loadStatus() {
  const name = telegramUsername.value.trim();
  if (!name || !name.startsWith("@")) {
    userStamps.value = null;
    msg.value = "";
    status.value = "";
    amount.value = 1;
    return;
  }

  loading.value = true;
  msg.value = "Ищем пользователя...";
  status.value = "info";

  try {
    const { data } = await getLoyaltyStatusByTelegram(name.slice(1)); // без @
    userStamps.value = Number(data.stamps ?? 0);
    maxStamps.value = Number(data.max_stamps ?? 6);

    if (atLimit.value) {
      msg.value = `🎉 @${name.slice(1)} достиг лимита! Положен бесплатный напиток.`;
      status.value = "success";
    } else {
      msg.value = `Найден: @${name.slice(1)} — ${userStamps.value}/${maxStamps.value} штампов`;
      status.value = "info";
    }
  } catch (e) {
    if (e.response?.status === 404) {
      msg.value = "Пользователь с таким @username не найден";
      status.value = "warning";
    } else {
      msg.value = "Ошибка связи с сервером";
      status.value = "error";
    }
    userStamps.value = null;
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!canSubmit.value) return;

  loading.value = true;
  msg.value = "Начисляем штамп(ы)...";
  status.value = "info";

  try {
    const { data } = await addStampByTelegram({
      telegram_username: telegramUsername.value.trim().slice(1),
      amount: Number(amount.value || 1),
    });

    const added = Number(data.stamps_added || amount.value);
    userStamps.value = Number(data.stamps_total ?? data.stamps ?? (userStamps.value + added));

    msg.value = `✅ Добавлено ${added} штамп(ов) пользователю ${telegramUsername.value}! Теперь: ${userStamps.value}/${maxStamps.value}`;
    status.value = "success";

    if (atLimit.value) {
      msg.value += " 🎉 Лимит достигнут — выдайте бесплатный напиток!";
    }

    amount.value = 1;
  } catch (e) {
    msg.value = e?.response?.data?.detail || "Ошибка начисления штампа";
    status.value = "error";
    await loadStatus(); // обновляем статус
  } finally {
    loading.value = false;
  }
}

// Очистка при пустом поле
watch(telegramUsername, (newVal) => {
  if (!newVal.trim()) {
    userStamps.value = null;
    msg.value = "";
    status.value = "";
    amount.value = 1;
  }
});
</script>

<style scoped>
.stamp-card {
  background: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(20px);
  border: 1px solid var(--tg-theme-hint-color, rgba(229, 231, 235, 0.8));
  border-radius: 28px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  max-width: 600px;
  margin: 0 auto;
}

.stamp-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.15);
}

.card-header {
  margin-bottom: 32px;
  text-align: center;
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #1f2937);
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.card-subtitle {
  font-size: 16px;
  color: var(--tg-theme-hint-color, #6b7280);
}

.form-group {
  margin-bottom: 32px;
}

.input-group {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 16px;
  align-items: end;
}

.input-with-icon {
  position: relative;
}

.input-with-icon i {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--tg-theme-hint-color, #9ca3af);
  font-size: 22px;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 18px 18px 18px 56px;
  background: var(--tg-theme-bg-color, white);
  border: 2px solid var(--tg-theme-hint-color, #e5e7eb);
  border-radius: 16px;
  font-size: 17px;
  color: var(--tg-theme-text-color, #1f2937);
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--tg-theme-button-color, #6366f1);
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.2);
}

.number-input {
  text-align: center;
  padding-left: 16px;
}

.btn-primary {
  padding: 18px 32px;
  background: linear-gradient(135deg, var(--tg-theme-button-color, #6366f1), #8b5cf6);
  color: white;
  font-weight: 700;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
  font-size: 17px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-lg {
  padding: 18px 32px;
}

/* Прогресс */
.progress-section {
  margin: 40px 0;
  padding: 32px;
  background: var(--tg-theme-secondary-bg-color, rgba(249, 250, 251, 0.8));
  border-radius: 20px;
  text-align: center;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 16px;
}

.progress-label {
  font-weight: 600;
  color: var(--tg-theme-text-color, #4b5563);
}

.progress-count {
  font-weight: 700;
  font-size: 24px;
  color: var(--tg-theme-button-color, #6366f1);
}

.progress-bar {
  height: 16px;
  background: var(--tg-theme-hint-color, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 8px;
  transition: width 0.8s ease;
}

.progress-complete {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.progress-dot {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--tg-theme-bg-color, #f3f4f6);
  border: 4px solid var(--tg-theme-hint-color, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  color: var(--tg-theme-hint-color, #9ca3af);
  transition: all 0.4s ease;
}

.progress-dot.filled {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  transform: scale(1.2);
}

.progress-note {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

/* Алерт */
.alert {
  padding: 20px;
  border-radius: 16px;
  margin: 24px 0;
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
  font-weight: 600;
  animation: slideIn 0.4s ease;
}

.alert-success {
  background: rgba(16, 185, 129, 0.15);
  border: 2px solid #10b981;
  color: #166534;
}

.alert-error {
  background: rgba(239, 68, 68, 0.15);
  border: 2px solid #ef4444;
  color: #991b1b;
}

.alert-info {
  background: rgba(14, 165, 233, 0.15);
  border: 2px solid #0ea5e9;
  color: #0c4a6e;
}

.hint {
  font-size: 15px;
  color: var(--tg-theme-hint-color, #6b7280);
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--tg-theme-secondary-bg-color, rgba(249, 250, 251, 0.8));
  border-radius: 16px;
  text-align: center;
  justify-content: center;
}

/* Иконки */
.icon-stamp::before { content: "🖋️"; }
.icon-telegram::before { content: "@"; font-family: sans-serif; font-weight: bold; }
.icon-number::before { content: "#️⃣"; }
.icon-add::before { content: "➕"; }
.icon-info::before { content: "ℹ️"; }
.icon-success::before { content: "✅"; }
.icon-error::before { content: "❌"; }

/* Анимации */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Адаптивность */
@media (max-width: 768px) {
  .stamp-card { padding: 32px 20px; }
  .input-group {
    grid-template-columns: 1fr;
  }
  .btn-lg {
    width: 100%;
    margin-top: 16px;
  }
  .progress-dots {
    gap: 12px;
  }
  .progress-dot {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}
</style>
