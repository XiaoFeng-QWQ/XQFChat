"use strict";

import { CORE_CONFIG, $ } from './core.js';
import { getFormData, HttpUtil, StorageUtil } from './lib/util.js';

const $username = $('#email');
const $password = $('#password');
const $loginBtn = $('#loginBtn');
const $loading = $('#loading');
const $emailVerifyVode = $('#emailVerifyVode');
const $captcha = $('#captcha');
const $captchaInput = $('#captchaInput');
const $form = $('#form'); // 获取表单元素
let $captchaToken = null

/**
 * 刷新验证码
 */
async function refreshCaptcha() {
    try {
        // 添加时间戳防止缓存
        const response = await HttpUtil.get(`${CORE_CONFIG.USER_API}/auth/captcha?t=${Date.now()}`);

        if (response && response.data) {
            $captchaToken = response.data.captcha_token;
            $captcha.attr('src', response.data.captcha_image);

            // 可选：清空验证码输入框
            if ($captchaInput.length) {
                $captchaInput.val('');
            }

            console.debug('验证码刷新成功');
        } else {
            console.error('刷新验证码失败：响应数据无效', response);
        }
    } catch (error) {
        console.error('刷新验证码出错：', error);
        mdui.snackbar({ message: '验证码刷新失败，请稍后重试' });
    }
}

$(document).ready(async () => {
    try {
        const response = await HttpUtil.get(`${CORE_CONFIG.USER_API}/auth/captcha`);

        if (response && response.data) {
            $captchaToken = response.data.captcha_token;
            $captcha.attr('src', response.data.captcha_image);
        } else {
            console.error('获取验证码失败：响应数据无效', response);
        }
    } catch (error) {
        console.error('获取验证码出错：', error);
    }

    // 绑定验证码点击刷新事件
    $captcha.on('click', refreshCaptcha);

    // 绑定回车键刷新（当验证码输入框获得焦点时按回车）
    $captchaInput.on('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            refreshCaptcha();
        }
    });

    // 监听表单提交事件
    $form.on('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
});

// 提取登录/注册处理函数
async function handleLogin() {
    $loading.css('display', 'flex');

    try {
        const pendingRegister = StorageUtil.getItem('pending_register');

        /**
         * ===== 完成注册流程 =====
         */
        if ($emailVerifyVode.val()) {
            if (!pendingRegister) {
                mdui.snackbar({ message: '注册状态已失效，请重新登录' });
                return;
            }

            const result = await HttpUtil.post(
                `${CORE_CONFIG.USER_API}/auth/complete-register`,
                {
                    ...getFormData($('#form')[0]),
                    verify_token: pendingRegister.verify_token,
                    captcha_token: $captchaToken,
                    captcha_code: $captchaInput.val()
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = result.data || result;

            if (result.code === 200) {
                StorageUtil.setItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO, {
                    id: data.id,
                    nickname: data.nickname,
                    avatar_url: data.avatar_url,
                    bio: data.bio,
                    token: data.token,
                    email: data.email
                });

                StorageUtil.removeItem('pending_register');
                window.location.href = 'index.html';
                return;
            }

            mdui.snackbar({ message: result.message || '注册失败' });

            // 如果验证码错误，刷新验证码
            if (result.code === 400 && result.message?.includes('验证码')) {
                refreshCaptcha();
            }
            return;
        }

        /**
         * ===== 登录流程 =====
         */
        if (!$username.val() || !$password.val()) {
            mdui.snackbar({ message: '请输入邮箱和密码' });
            return;
        }

        const result = await HttpUtil.post(
            `${CORE_CONFIG.USER_API}/auth/auth`,
            {
                ...getFormData($('#form')[0]),
                device_id: 'web',
                device_name: navigator.userAgent,
                app_version: 'web-1.0.0',
                captcha_token: $captchaToken,
                captcha_code: $captchaInput.val()
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = result.data || result;
        // 老用户
        if (result.code === 0 && data.token) {
            StorageUtil.setItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO, {
                id: data.id,
                nickname: data.nickname,
                avatar_url: data.avatar_url,
                bio: data.bio,
                token: data.token,
                email: data.email
            });

            window.location.href = 'index.html';
            return;
        }

        // 新用户
        if (result.code === 100) {
            StorageUtil.setItem('pending_register', {
                email: data.email,
                verify_token: data.verify_token
            });

            $emailVerifyVode.css('display', 'block');
            mdui.snackbar({ message: result.message || '验证码已发送' });

            // 注册成功后可以刷新验证码
            refreshCaptcha();
            return;
        }

        mdui.snackbar({ message: result.message || '未知状态' });

        // 如果验证码错误，刷新验证码
        if (result.code === 400 && result.message?.includes('验证码')) {
            refreshCaptcha();
        }

    } finally {
        $loading.css('display', 'none');
    }
}

$loginBtn.on('click', handleLogin);