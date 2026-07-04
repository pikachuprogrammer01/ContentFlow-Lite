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
  type FormRules,
  type FormItemRule,
} from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

// ── 常量 ──────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fff]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;

// ── 状态 ──────────────────────────────────────────────

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

const usernameRule: FormItemRule = {
  required: true,
  message: '请输入用户名',
  trigger: ['blur', 'input'],
  validator(_rule, value: string) {
    const v = (value || '').trim();
    if (!v) return new Error('用户名不能为空');
    if (v.length < USERNAME_MIN) return new Error(`用户名至少 ${USERNAME_MIN} 个字符`);
    if (v.length > USERNAME_MAX) return new Error(`用户名不能超过 ${USERNAME_MAX} 个字符`);
    if (!USERNAME_RE.test(v)) return new Error('用户名只能包含中文、英文、数字和下划线');
    return true;
  },
};

const loginPasswordRule: FormItemRule = {
  required: true,
  message: '请输入密码',
  trigger: ['blur', 'input'],
  validator(_rule, value: string) {
    if (!value) return new Error('密码不能为空');
    if (value.length < PASSWORD_MIN) return new Error(`密码至少 ${PASSWORD_MIN} 个字符`);
    if (value.length > PASSWORD_MAX) return new Error(`密码不能超过 ${PASSWORD_MAX} 个字符`);
    return true;
  },
};

const loginRules: FormRules = {
  username: usernameRule,
  password: loginPasswordRule,
};

const registerRules: FormRules = {
  username: usernameRule,
  email: {
    required: true,
    message: '请输入邮箱',
    trigger: ['blur', 'input'],
    validator(_rule, value: string) {
      const v = (value || '').trim();
      if (!v) return new Error('邮箱不能为空');
      if (v.length > 255) return new Error('邮箱地址过长');
      if (!EMAIL_RE.test(v)) return new Error('邮箱格式不正确');
      return true;
    },
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['blur', 'input'],
    validator(_rule, value: string) {
      if (!value) return new Error('密码不能为空');
      if (value.length < PASSWORD_MIN) return new Error(`密码至少 ${PASSWORD_MIN} 个字符`);
      if (value.length > PASSWORD_MAX) return new Error(`密码不能超过 ${PASSWORD_MAX} 个字符`);
      return true;
    },
  },
  confirmPassword: {
    required: true,
    message: '请再次输入密码',
    trigger: ['blur', 'input'],
    validator(_rule, value: string) {
      if (!value) return new Error('请确认密码');
      if (value !== registerForm.password) return new Error('两次输入的密码不一致');
      return true;
    },
  },
};

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

function onTabChange(tab: 'login' | 'register'): void {
  errorMsg.value = '';
  activeTab.value = tab;
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
                type="email"
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
