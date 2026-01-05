<template>
  <div class="barista-panel" :class="{ 'tg-mode': isTelegram }">
    <!-- Сайдбар -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <i class="icon-coffee"></i>
          <span>Coffee Shop</span>
        </div>
        <div class="user-info">
          <div class="user-avatar">
            {{ me?.username?.charAt(0)?.toUpperCase() || 'B' }}
          </div>
          <div class="user-details">
            <div class="user-name">{{ me?.username || 'Бариста' }}</div>
            <div class="user-role">Бариста</div>
          </div>
        </div>
      </div>

      <!-- Статистика -->
      <div class="sidebar-stats">
        <div class="stat-item">
          <i class="icon-qr"></i>
          <div class="stat-info">
            <div class="stat-value">{{ stats.codesActivated }}</div>
            <div class="stat-label">Активировано кодов</div>
          </div>
        </div>
        <div class="stat-item">
          <i class="icon-stamp"></i>
          <div class="stat-info">
            <div class="stat-value">{{ stats.stampsToday }}</div>
            <div class="stat-label">Штампов сегодня</div>
          </div>
        </div>
        <div class="stat-item">
          <i class="icon-calendar"></i>
          <div class="stat-info">
            <div class="stat-value">{{ stats.stampsWeek }}</div>
            <div class="stat-label">Штампов за неделю</div>
          </div>
        </div>
      </div>

      <!-- Кнопка обновления + подсказка -->
      <div class="sidebar-refresh">
        <button class="btn-refresh" @click="refreshPage" title="Обновить статистику">
          <i class="icon-refresh"></i>
        </button>
        <p class="refresh-hint">
          Хочешь увидеть свою статистику?<br>
          Нажми кнопку обновления
        </p>
      </div>

      <!-- Выход -->
      <div class="sidebar-footer">
        <button class="btn-logout" @click="logout">
          <i class="icon-logout"></i>
          Выйти
        </button>
      </div>
    </aside>

    <!-- Основной контент -->
    <main class="main-content">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">Загружаем панель...</p>
      </div>

      <template v-else>
        <div v-if="error" class="alert alert-error">
          <i class="icon-error"></i>
          <span>{{ error }}</span>
        </div>

        <div class="welcome-card glass-card">
          <div class="welcome-content">
            <h2>Добро пожаловать в панель баристы!</h2>
            <p>Используйте эту панель для проверки кодов клиентов и начисления штампов.</p>
          </div>
          <div class="welcome-illustration">
            <i class="icon-barista-large"></i>
          </div>
        </div>

        <div class="content-tabs">
          <button
            :class="['tab-btn', { active: tab === 'reward' }]"
            @click="tab = 'reward'"
          >
            <i class="icon-qr"></i>
            Проверка кода
          </button>
          <button
            :class="['tab-btn', { active: tab === 'stamps' }]"
            @click="tab = 'stamps'"
          >
            <i class="icon-stamp"></i>
            Начисление штампов
          </button>
        </div>

        <div class="tab-content">
          <div v-if="tab === 'reward'" class="tab-pane">
            <VerifyAndReward />
          </div>
          <div v-else-if="tab === 'stamps'" class="tab-pane">
            <AddStamp />
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getMe } from "@/api";
import VerifyAndReward from "@/components/barista/VerifyAndReward.vue";
import AddStamp from "@/components/barista/AddStamp.vue";
import { useTelegram } from "@/composables/useTelegram";

const { isTelegram } = useTelegram();

const router = useRouter();

const tab = ref("reward");
const loading = ref(true);
const error = ref("");
const me = ref(null);
const stats = ref({
  codesActivated: 0,
  stampsToday: 0,
  stampsWeek: 0,
});

function logout() {
  localStorage.clear(); // Полная очистка
  router.push("/login");
}

function refreshPage() {
  window.location.reload();
}

onMounted(async () => {
  const token = localStorage.getItem("access");
  if (!token) {
    router.push("/login");
    return;
  }

  try {
    const meRes = await getMe();
    me.value = meRes.data;

    if (!(me.value?.is_staff || me.value?.is_barista)) {
      error.value = "Доступ запрещён: только для сотрудников.";
      setTimeout(() => router.push("/loyalty"), 2000);
      return;
    }

    // Загружаем статистику баристы
    const statsRes = await api.get("barista/stats/");
    stats.value = {
      codesActivated: statsRes.data.codes_activated || 0,
      stampsToday: statsRes.data.stamps_today || 0,
      stampsWeek: statsRes.data.stamps_week || 0,
    };
  } catch (e) {
    console.error("Ошибка загрузки панели баристы:", e);
    error.value = "Не удалось загрузить данные. Попробуйте войти заново.";
    setTimeout(() => {
      logout();
    }, 2000);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.barista-panel {
  display: flex;
  min-height: 100vh;
  background: var(--tg-theme-bg-color, #f8fafc);
}

/* Сайдбар */
.sidebar {
  width: 300px;
  background: var(--tg-theme-secondary-bg-color, linear-gradient(180deg, #1e293b 0%, #0f172a 100%));
  color: var(--tg-theme-text-color, white);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  padding: 32px 24px;
  border-bottom: 1px solid var(--tg-theme-hint-color, rgba(255, 255, 255, 0.1));
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 32px;
}

.logo i {
  font-size: 32px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.user-role {
  font-size: 14px;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 14px;
  border-radius: 20px;
  display: inline-block;
}

/* Статистика */
.sidebar-stats {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: background 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.stat-item i {
  font-size: 28px;
  opacity: 0.9;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
  margin-top: 4px;
}

/* Кнопка обновления */
.sidebar-refresh {
  padding: 24px;
  text-align: center;
}

.btn-refresh {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 28px;
  cursor: pointer;
  transition: all 0.4s ease;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(360deg);
}

.refresh-hint {
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.5;
}

/* Выход */
.sidebar-footer {
  padding: 24px;
}

.btn-logout {
  width: 100%;
  padding: 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 16px;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.3);
  color: white;
  border-color: #ef4444;
}

/* Основной контент */
.main-content {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
  background: var(--tg-theme-bg-color, #f8fafc);
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: var(--tg-theme-text-color, #64748b);
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 6px solid var(--tg-theme-hint-color, #e2e8f0);
  border-top: 6px solid var(--tg-theme-button-color, #6366f1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  font-weight: 500;
}

.alert-error {
  padding: 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #fca5a5;
  border-radius: 16px;
  color: #dc2626;
  text-align: center;
  font-weight: 600;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.welcome-card {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 24px;
  padding: 40px;
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.3);
}

.welcome-content h2 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 16px;
}

.welcome-content p {
  font-size: 18px;
  opacity: 0.95;
  margin: 0;
  max-width: 600px;
}

.welcome-illustration i {
  font-size: 140px;
  opacity: 0.9;
}

.content-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  padding: 8px;
  background: var(--tg-theme-secondary-bg-color, rgba(226, 232, 240, 0.6));
  border-radius: 20px;
  max-width: fit-content;
}

.tab-btn {
  padding: 16px 32px;
  border: none;
  background: transparent;
  color: var(--tg-theme-text-color, #64748b);
  font-weight: 600;
  font-size: 17px;
  cursor: pointer;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tab-btn.active {
  background: white;
  color: #6366f1;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.tab-content {
  min-height: 400px;
}

/* Иконки */
.icon-coffee::before { content: "☕"; }
.icon-qr::before { content: "📱"; }
.icon-stamp::before { content: "🖋️"; }
.icon-calendar::before { content: "📅"; }
.icon-logout::before { content: "🚪"; }
.icon-barista-large::before { content: "👨‍🍳"; }
.icon-error::before { content: "❌"; }
.icon-refresh::before { content: "↻"; }

/* Адаптивность */
@media (max-width: 1024px) {
  .barista-panel {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    height: auto;
    position: static;
  }
  .main-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .welcome-card {
    flex-direction: column;
    text-align: center;
    gap: 32px;
    padding: 32px 24px;
  }
  .welcome-illustration i {
    font-size: 100px;
  }
  .content-tabs {
    width: 100%;
    flex-direction: column;
  }
  .tab-btn {
    justify-content: flex-start;
  }
}
</style>
