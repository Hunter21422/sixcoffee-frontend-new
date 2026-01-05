<template>
  <div class="verify-reward-card" :class="{ 'tg-mode': isTelegram }">
    <!-- Заголовок -->
    <div class="card-header">
      <div class="header-icon">
        <div class="icon-circle" :class="{ 'icon-circle-animate': animation }">
          <i class="fa-solid fa-qrcode"></i>
        </div>
      </div>
      <div class="header-content">
        <h3 class="card-title">Проверка кода лояльности</h3>
        <p class="card-subtitle">Введите 6-значный код клиента</p>
      </div>
    </div>

    <!-- Ввод кода — 6 отдельных полей -->
    <div class="card-body">
      <div class="code-input-section">
        <div class="input-label">
          <i class="fa-solid fa-key"></i>
          <span>Код для проверки</span>
        </div>

        <div class="otp-boxes">
          <input
            v-for="index in 6"
            :key="index"
            v-model="digits[index - 1]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="otp-digit"
            :class="{
              'filled': digits[index - 1],
              'active': focusedIndex === index
            }"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            @focus="focusedIndex = index"
            @paste="handlePaste"
            ref="otpInputs"
          />
        </div>

        <div class="code-hint">
          <i class="fa-solid fa-lightbulb"></i>
          <span>Код состоит из 6 цифр. Введите его без пробелов.</span>
        </div>
      </div>

      <!-- Кнопка проверки -->
      <button
        class="activate-btn"
        :disabled="loading || code.length < 6"
        @click="verify"
        :class="{ 'btn-loading': loading }"
      >
        <span class="btn-content">
          <i :class="loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-search'"></i>
          {{ loading ? "Проверяем..." : "Проверить код" }}
        </span>
        <div class="btn-shine"></div>
      </button>

      <!-- Результат проверки -->
      <transition name="message-slide">
        <div v-if="message" :class="['result-message', status]">
          <div class="message-icon">
            <i v-if="status === 'success'" class="fa-solid fa-circle-check"></i>
            <i v-else class="fa-solid fa-circle-exclamation"></i>
          </div>
          <div class="message-content">
            <p class="message-text">{{ message }}</p>
          </div>
        </div>
      </transition>

      <!-- Пример кода -->
      <div class="example-section">
        <div class="example-header">
          <i class="fa-solid fa-eye"></i>
          <span>Как выглядит код:</span>
        </div>
        <div class="example-code">
          <span class="example-digit">1</span>
          <span class="example-digit">2</span>
          <span class="example-digit">3</span>
          <span class="example-digit">4</span>
          <span class="example-digit">5</span>
          <span class="example-digit">6</span>
        </div>
        <p class="example-note">Код генерируется в приложении клиента</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import api from "@/api";
import { useTelegram } from "@/composables/useTelegram";

const { isTelegram } = useTelegram();

const digits = ref(["", "", "", "", "", ""]);
const focusedIndex = ref(1);
const otpInputs = ref([]);
const message = ref("");
const status = ref("");
const loading = ref(false);
const animation = ref(false);

const code = computed(() => digits.value.join(""));

// Обработка ввода цифры
function handleInput(index, event) {
  let value = event.target.value;

  // Только цифры
  if (!/^\d?$/.test(value)) {
    digits.value[index - 1] = "";
    return;
  }

  digits.value[index - 1] = value;

  // Автофокус на следующий
  if (value && index < 6) {
    nextTick(() => {
      otpInputs.value[index]?.focus();
    });
  }
}

// Обработка Backspace и стрелок
function handleKeydown(index, event) {
  if (event.key === "Backspace" && !digits.value[index - 1] && index > 1) {
    nextTick(() => {
      otpInputs.value[index - 2].focus();
    });
  } else if (event.key === "ArrowLeft" && index > 1) {
    event.preventDefault();
    otpInputs.value[index - 2].focus();
  } else if (event.key === "ArrowRight" && index < 6) {
    event.preventDefault();
    otpInputs.value[index].focus();
  }
}

// Paste всего кода
function handlePaste(event) {
  const paste = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
  if (paste) {
    event.preventDefault();
    for (let i = 0; i < 6; i++) {
      digits.value[i] = paste[i] || "";
    }
    const nextFocus = Math.min(paste.length, 6);
    nextTick(() => {
      otpInputs.value[nextFocus - 1]?.focus();
    });
  }
}

// Проверка кода
async function verify() {
  if (code.value.length < 6) return;

  loading.value = true;
  animation.value = true;
  message.value = "";
  status.value = "";

  try {
    const res = await api.post("loyalty/check-code/", { code: code.value });

    // Успех — начисление штампа
    message.value = res.data?.detail || "Штамп успешно начислен!";
    status.value = "success";

    setTimeout(() => {
      digits.value = ["", "", "", "", "", ""];
      otpInputs.value[0]?.focus();
      animation.value = false;
    }, 2000);
  } catch (e) {
    animation.value = false;
    const detail = e?.response?.data?.detail || "";

    if (e.response?.status === 404) {
      message.value = "Код не найден";
    } else if (detail.includes("использован")) {
      message.value = "Код уже был использован";
    } else if (detail.includes("истёк")) {
      message.value = "Срок действия кода истёк";
    } else {
      message.value = "Код недействителен";
    }
    status.value = "error";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.verify-reward-card {
  background: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(20px);
  border: 1px solid var(--tg-theme-hint-color, rgba(255, 255, 255, 0.2));
  border-radius: 28px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  max-width: 520px;
  margin: 0 auto;
}

.verify-reward-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 40px;
}

.header-icon {
  position: relative;
}

.icon-circle {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  box-shadow: 0 12px 32px rgba(79, 70, 229, 0.4);
}

.icon-circle-animate {
  animation: iconPulse 1.8s infinite;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #1f2937);
  margin: 0 0 8px;
}

.card-subtitle {
  font-size: 16px;
  color: var(--tg-theme-hint-color, #6b7280);
  margin: 0;
}

.code-input-section {
  margin-bottom: 40px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--tg-theme-link-color, #4f46e5);
  margin-bottom: 20px;
}

.otp-boxes {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 24px 0;
}

.otp-digit {
  width: 64px;
  height: 64px;
  background: var(--tg-theme-bg-color, white);
  border: 3px dashed var(--tg-theme-hint-color, #e5e7eb);
  border-radius: 20px;
  font-size: 36px;
  font-weight: 800;
  text-align: center;
  color: var(--tg-theme-text-color, #1f2937);
  transition: all 0.3s ease;
  outline: none;
}

.otp-digit.filled {
  border-style: solid;
  border-color: var(--tg-theme-button-color, #4f46e5);
  background: rgba(79, 70, 229, 0.1);
}

.otp-digit.active {
  border-color: var(--tg-theme-button-color, #6366f1);
  box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.2);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 16px rgba(99, 102, 241, 0); }
}

.code-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  color: var(--tg-theme-hint-color, #6b7280);
  margin-top: 16px;
}

/* Кнопка проверки */
.activate-btn {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 40px auto;
  padding: 22px;
  background: linear-gradient(135deg, var(--tg-theme-button-color, #6366f1), #8b5cf6);
  border: none;
  border-radius: 20px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  display: block;
}

.activate-btn:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(99, 102, 241, 0.4);
}

.activate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.btn-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  transform: rotate(30deg);
  transition: transform 0.8s ease;
}

.activate-btn:hover .btn-shine {
  transform: rotate(30deg) translateX(100%);
}

/* Результат */
.result-message {
  padding: 24px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 32px 0;
  text-align: left;
  animation: message-slide 0.5s ease-out;
}

.result-message.success {
  background: rgba(16, 185, 129, 0.15);
  border: 2px solid rgba(16, 185, 129, 0.4);
  color: var(--tg-theme-text-color, #166534);
}

.result-message.error {
  background: rgba(239, 68, 68, 0.15);
  border: 2px solid rgba(239, 68, 68, 0.4);
  color: var(--tg-theme-text-color, #991b1b);
}

.message-icon i {
  font-size: 32px;
}

.result-message.success .message-icon i { color: #10b981; }
.result-message.error .message-icon i { color: #ef4444; }

.message-text {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

@keyframes message-slide {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Пример кода */
.example-section {
  background: var(--tg-theme-secondary-bg-color, rgba(249, 250, 251, 0.8));
  border-radius: 20px;
  padding: 24px;
  margin-top: 40px;
}

.example-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  color: var(--tg-theme-link-color, #4f46e5);
  font-weight: 600;
  font-size: 16px;
}

.example-code {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.example-digit {
  width: 48px;
  height: 48px;
  background: white;
  border: 3px solid var(--tg-theme-button-color, #4f46e5);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--tg-theme-button-color, #4f46e5);
  font-size: 24px;
}

.example-note {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #6b7280);
  text-align: center;
  margin: 0;
}

/* Адаптивность */
@media (max-width: 640px) {
  .verify-reward-card {
    padding: 32px 20px;
    margin: 0 16px;
  }
  .card-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  .otp-boxes {
    gap: 10px;
  }
  .otp-digit {
    width: 54px;
    height: 54px;
    font-size: 30px;
  }
  .activate-btn {
    padding: 18px;
    font-size: 17px;
  }
  .result-message {
    flex-direction: column;
    text-align: center;
  }
  .message-text {
    font-size: 18px;
  }
}
</style>
