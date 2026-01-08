<template>
  <div class="auth-container">
    <!-- УБРАЛ ТЕЛЕГРАМ-ЭКРАН — ТЕПЕРЬ ВСЕГДА ОБЫЧНАЯ ФОРМА -->
    <div class="auth-card glass-card">
      <div class="auth-header">
        <div class="logo">
          <i class="icon-coffee"></i>
          <span>Кофе с тобой</span>
        </div>
        <h1 class="auth-title">Вход в систему</h1>
        <p class="auth-subtitle">Выберите тип входа</p>
      </div>

      <div class="user-type-toggle">
        <button @click="setUserType('customer')" :class="['toggle-btn', { active: userType === 'customer' }]">
          <i class="icon-user"></i> <span>Клиент</span>
        </button>
        <button @click="setUserType('barista')" :class="['toggle-btn', { active: userType === 'barista' }]">
          <i class="icon-barista"></i> <span>Бариста</span>
        </button>
      </div>

      <form @submit.prevent="submitLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label">Логин</label>
          <div class="input-with-icon">
            <i class="icon-user"></i>
            <input v-model.trim="username" placeholder="Введите логин" required class="form-input" :disabled="loading" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Пароль</label>
          <div class="input-with-icon">
            <i class="icon-lock"></i>
            <input v-model="password" type="password" placeholder="Введите пароль" required class="form-input" :disabled="loading" />
          </div>
        </div>

        <!-- ПЛАШКА ДЛЯ БАРИСТЫ — ПОЯВЛЯЕТСЯ ПРИ ПЕРЕКЛЮЧЕНИИ -->
        <transition name="slide-fade">
          <div v-if="userType === 'barista'" class="form-group">
            <label class="form-label">Мастер-код сотрудника</label>
            <div class="input-with-icon">
              <i class="icon-key"></i>
              <input v-model.trim="employeeCode" placeholder="Введите мастер-код" required class="form-input" :disabled="loading" />
            </div>
            <p class="helper-text"><i class="icon-info"></i> Код выдаётся администратором кофейни</p>
          </div>
        </transition>

        <button type="submit" class="btn-primary btn-full" :disabled="loading">
          {{ loading ? (userType === 'customer' ? 'Входим…' : 'Входим в панель…') : buttonText }}
        </button>

        <transition name="fade">
          <div v-if="error" class="alert alert-error">
            <i class="icon-error"></i>
            <div class="error-content">
              {{ error }}
              <div v-if="isCodeError" class="code-error-help">
                <i class="icon-warning"></i>
                <span>Проверьте правильность мастер-кода или обратитесь к администратору.</span>
              </div>
            </div>
          </div>
        </transition>

        <div class="auth-footer">
          <span>Нет аккаунта?</span>
          <router-link :to="userType === 'customer' ? '/register' : '/register-barista'" class="auth-link">
            {{ userType === 'customer' ? 'Зарегистрироваться' : 'Регистрация баристы' }}
          </router-link>
        </div>

        <div class="quick-switch">
          <span v-if="userType === 'customer'">Вы сотрудник?</span>
          <span v-else>Вы клиент?</span>
          <a href="#" @click.prevent="toggleUserType" class="switch-link">
            {{ userType === 'customer' ? 'Войти как бариста' : 'Войти как клиент' }}
          </a>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { loginJWT, loginBaristaJWT, logout } from "@/api";
import { ensureUser } from "@/stores/auth";
import { useTelegram } from "@/composables/useTelegram";

const router = useRouter();

const { isTelegram } = useTelegram();  // ← используем только для проверки, НЕ для авто-логина

// ПЕРЕМЕННЫЕ ДЛЯ ФОРМЫ
const userType = ref("customer");
const username = ref("");
const password = ref("");
const employeeCode = ref("");
const loading = ref(false);
const error = ref("");
const isCodeError = ref(false);

// КОМПУТИРОВАННЫЕ СВОЙСТВА
const buttonText = computed(() => {
  return userType.value === "customer" ? "Войти в систему" : "Войти в панель баристы";
});

// МЕТОДЫ ПЕРЕКЛЮЧЕНИЯ
function setUserType(type) {
  userType.value = type;
  clearError();
  if (type === "customer") employeeCode.value = "";
}

function toggleUserType() {
  setUserType(userType.value === "customer" ? "barista" : "customer");
}

function clearError() {
  error.value = "";
  isCodeError.value = false;
}

// ОСНОВНОЙ ЛОГИН (ТОЛЬКО РУЧНОЙ)
async function submitLogin() {
  clearError();
  loading.value = true;

  try {
    let response;

    if (userType.value === "customer") {
      // Логин клиента
      response = await loginJWT({ username: username.value, password: password.value });
      localStorage.setItem("user_type", "customer");
      router.push("/loyalty");  // ← редирект на лояльность
    } else {
      // Логин баристы
      if (!employeeCode.value.trim()) {
        error.value = "Введите мастер-код сотрудника";
        isCodeError.value = true;
        loading.value = false;
        return;
      }

      response = await loginBaristaJWT({
        username: username.value,
        password: password.value,
        employee_code: employeeCode.value.trim(),
      });
      localStorage.setItem("user_type", "barista");
      router.push("/barista");  // ← редирект на панель баристы
    }

    // СОХРАНЕНИЕ ТОКЕНОВ
    localStorage.setItem("access", response.data.access);
    if (response.data.refresh) localStorage.setItem("refresh", response.data.refresh);

    // ОБНОВЛЕНИЕ ГЛОБАЛЬНОГО СОСТОЯНИЯ
    window.dispatchEvent(new CustomEvent("auth-changed"));
    await ensureUser();

    // УСПЕШНЫЙ ЛОГИН — ПЕРЕХОД НА СТРАНИЦУ
    console.log("Успешный логин, токен сохранён:", response.data.access);

  } catch (e) {
    console.error("Ошибка входа:", e);
    const msg = e.response?.data?.error || e.response?.data?.detail || e.message || "Ошибка входа";

    const lowerMsg = msg.toLowerCase();
    if (
      e.response?.status === 400 ||
      e.response?.status === 403 ||
      lowerMsg.includes("код") ||
      lowerMsg.includes("code") ||
      lowerMsg.includes("employee") ||
      lowerMsg.includes("мастер")
    ) {
      isCodeError.value = true;
      error.value = "Неверный мастер-код сотрудника";
    } else {
      error.value = msg.includes("Неверный") ? msg : "Неверный логин или пароль";
    }
  } finally {
    loading.value = false;
  }
}

// МОНТИРОВАНИЕ — НИКАКОГО АВТО-ЛОГИНА
onMounted(() => {
  // Убираем любой автоматический логин
  logout();  // ← очищаем localStorage при загрузке страницы

  // Если в Telegram — показываем предупреждение
  if (isTelegram.value) {
    error.value = "В Telegram вход через логин/пароль. Используйте обычный браузер.";
  }
});
</script>

<!-- СТИЛИ ОСТАЮТСЯ ТЕ ЖЕ — Я УБРАЛ ТОЛЬКО ТЕЛЕГРАМ-ЧАСТЬ -->
<style scoped>
/* === ОБЩИЙ КОНТЕЙНЕР === */
.auth-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* === КАРТОЧКА АВТОРИЗАЦИИ === */
.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #4f46e5;
  margin-bottom: 20px;
}

.auth-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.auth-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* === ПЕРЕКЛЮЧАТЕЛЬ КЛИЕНТ/БАРИСТА === */
.user-type-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 16px;
  padding: 6px;
  margin-bottom: 24px;
  gap: 6px;
}

.toggle-btn {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #6b7280;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.toggle-btn.active {
  background: white;
  color: #4f46e5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toggle-btn i {
  font-size: 20px;
}

.helper-text {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* === ФОРМА === */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon i {
  position: absolute;
  left: 16px;
  color: #9ca3af;
  font-size: 20px;
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 16px 16px 16px 52px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  background: white;
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  padding: 18px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
}

/* === АЛЕРТЫ === */
.alert-error {
  padding: 16px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  border: 1px solid #ef4444;
  color: #991b1b;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-error-help {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 8px;
  border-left: 3px solid #dc2626;
  font-size: 13px;
  line-height: 1.4;
}

.code-error-help i {
  color: #dc2626;
  margin-top: 2px;
}

/* === ФУТЕР === */
.auth-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.auth-link {
  color: #6366f1;
  font-weight: 600;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}

.quick-switch {
  text-align: center;
  margin-top: 16px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  color: #4f46e5;
}

.switch-link {
  color: #6366f1;
  font-weight: 600;
  text-decoration: none;
  margin-left: 8px;
}

.switch-link:hover {
  text-decoration: underline;
}

/* === АНИМАЦИИ === */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* === ИКОНКИ === */
.icon-coffee::before { content: "☕"; }
.icon-user::before { content: "👤"; }
.icon-barista::before { content: "🎩"; }
.icon-key::before { content: "🔑"; }
.icon-info::before { content: "ℹ️"; }
.icon-lock::before { content: "🔒"; }
.icon-error::before { content: "❌"; }
.icon-warning::before { content: "⚠️"; }

/* === ТЁМНАЯ ТЕМА === */
@media (prefers-color-scheme: dark) {
  .auth-card {
    background: rgba(17, 24, 39, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .auth-title { color: #f1f5f9; }
  .auth-subtitle { color: #94a3b8; }
  
  .user-type-toggle {
    background: #374151;
  }
  
  .toggle-btn {
    color: #94a3b8;
  }
  
  .toggle-btn.active {
    background: #4f46e5;
    color: white;
  }
  
  .form-input {
    background: rgba(30, 41, 59, 0.9);
    border-color: #475569;
    color: #f1f5f9;
  }
  
  .form-input:focus { background: rgba(30, 41, 59, 1); }
  
  .auth-footer { border-color: #475569; color: #94a3b8; }
  
  .quick-switch {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
  }
  
  .alert-error {
    background: rgba(127, 29, 29, 0.3);
    border-color: #7f1d1d;
    color: #fca5a5;
  }
}

/* === АДАПТИВНОСТЬ === */
@media (max-width: 640px) {
  .auth-card { padding: 32px 24px; }
  .auth-title { font-size: 28px; }
  .toggle-btn { padding: 14px; font-size: 14px; }
  .helper-text { font-size: 12px; }
}
</style>
