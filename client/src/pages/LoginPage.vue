<script setup lang="ts">
/**
 * LoginPage — 登录 / 注册页
 *
 * 使用 Naive UI 表单 + 前端校验规则，对接后端 /api/auth/*。
 * 登录成功自动跳转首页。
 */

import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import {
  NCard,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
  NSpace,
  type FormInst,
} from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

// ── 常量 ──────────────────────────────────────────────

const activeTab = ref<'login' | 'register'>('login');
const loading = ref(false);
const errorMsg = ref('');

const loginFormRef = ref<FormInst | null>(null);
const registerFormRef = ref<FormInst | null>(null);

const loginForm = reactive({ username: '', password: '' });
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  adminKey: '',
});
const showAdminKey = ref(false);

// ── 校验规则 ──────────────────────────────────────────





// ── 方法 ──────────────────────────────────────────────

function trimForm(form: typeof loginForm | typeof registerForm): void {
  Object.keys(form).forEach((k) => {
    const key = k as keyof typeof form;
    if (typeof form[key] === 'string') {
      (form as Record<string, string>)[key] = (form[key] as string).trim();
    }
  });
}

async function handleLogin(): Promise<void> {
  errorMsg.value = '';

  try {
    await loginFormRef.value?.validate();
  } catch {
    return; // 表单校验失败，Naive UI 已显示行内错误
  }

  trimForm(loginForm);
  loading.value = true;
  try {
    await auth.login(loginForm.username, loginForm.password);
    router.push('/');
  } catch (e: unknown) {
    const err = e as { message?: string };
    errorMsg.value = err?.message || '登录失败，请检查用户名和密码';
  } finally {
    loading.value = false;
  }
}

async function handleRegister(): Promise<void> {
  errorMsg.value = '';

  try {
    await registerFormRef.value?.validate();
  } catch {
    return;
  }

  trimForm(registerForm);
  loading.value = true;
  try {
    await auth.register(
      registerForm.username,
      registerForm.password,
      registerForm.email,
      registerForm.adminKey || undefined,
    );
    router.push('/');
  } catch (e: unknown) {
    const err = e as { message?: string };
    errorMsg.value = err?.message || '注册失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

</script>

<template>
  <div class="login-page">
    <NCard title="ContentFlow Lite" class="login-card">
      <NTabs v-model:value="activeTab" type="line" animated>
        <!-- 登录 -->
        <NTabPane name="login" tab="登录">
          <NForm @submit.prevent="handleLogin">
            <NFormItem label="用户名" required>
              <NInput
                v-model:value="loginForm.username"
                placeholder="输入用户名"
                :disabled="loading"
                clearable
              />
            </NFormItem>
            <NFormItem label="密码" required>
              <NInput
                v-model:value="loginForm.password"
                type="password"
                placeholder="输入密码"
                :disabled="loading"
                show-password-on="click"
                @keyup.enter="handleLogin"
              />
            </NFormItem>
            <NButton
              type="primary"
              block
              :loading="loading"
              @click="handleLogin"
            >
              登录
            </NButton>
          </NForm>
        </NTabPane>

        <!-- 注册 -->
        <NTabPane name="register" tab="注册">
          <NForm @submit.prevent="handleRegister">
            <NFormItem label="用户名" required>
              <NInput
                v-model:value="registerForm.username"
                placeholder="至少 2 个字符"
                :disabled="loading"
                clearable
              />
            </NFormItem>
            <NFormItem label="邮箱" required>
              <NInput
                v-model:value="registerForm.email"
                type="text"
                placeholder="your@email.com"
                :disabled="loading"
                clearable
              />
            </NFormItem>
            <NFormItem label="密码" required>
              <NInput
                v-model:value="registerForm.password"
                type="password"
                placeholder="至少 6 个字符"
                :disabled="loading"
                show-password-on="click"
              />
            </NFormItem>
            <NFormItem label="确认密码" required>
              <NInput
                v-model:value="registerForm.confirmPassword"
                type="password"
                placeholder="再次输入密码"
                :disabled="loading"
                show-password-on="click"
                @keyup.enter="handleRegister"
              />
            </NFormItem>
            <NButton
              text
              size="tiny"
              type="info"
              style="margin-bottom: 12px"
              @click="showAdminKey = !showAdminKey"
            >
              {{ showAdminKey ? '收起' : '管理员注册' }}
            </NButton>
            <NFormItem v-if="showAdminKey" label="管理员密钥">
              <NInput
                v-model:value="registerForm.adminKey"
                type="password"
                placeholder="输入管理员注册密钥"
                :disabled="loading"
                show-password-on="click"
              />
            </NFormItem>
            <NButton
              type="primary"
              block
              :loading="loading"
              @click="handleRegister"
            >
              注册
            </NButton>
          </NForm>
        </NTabPane>
      </NTabs>

      <!-- 错误提示 -->
      <NSpace v-if="errorMsg" vertical style="margin-top: 16px">
        <NAlert type="error" :title="errorMsg" closable @close="errorMsg = ''" />
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
}
</style>
