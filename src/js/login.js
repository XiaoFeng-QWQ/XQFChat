"use strict";

import { CORE_CONFIG, $ } from './core.js';
import { getFormData, HttpUtil, StorageUtil } from './lib/util.js';

/**
 * DOM 元素缓存
 * @type {Object.<string, jQuery>}
 */
const elements = {
    username: $('#email'),
    password: $('#password'),
    loginBtn: $('#loginBtn'),
    loading: $('#loading'),
    emailVerifyVode: $('#emailVerifyVode'),
    captcha: $('#captcha'),
    captchaInput: $('#captchaInput'),
    form: $('#form')
};

/**
 * 验证码令牌
 * @type {string|null}
 */
let captchaToken = null;

/**
 * 刷新验证码
 * @returns {Promise<void>}
 */
const refreshCaptcha = async () => {
    try {
        // 添加时间戳防止缓存
        const response = await HttpUtil.get(`${CORE_CONFIG.USER_API}/auth/captcha?t=${Date.now()}`);

        if (response && response.data) {
            captchaToken = response.data.captcha_token;
            elements.captcha.attr('src', response.data.captcha_image);

            // 可选：清空验证码输入框
            if (elements.captchaInput.length) {
                elements.captchaInput.val('');
            }

            console.debug('验证码刷新成功');
        } else {
            console.error('刷新验证码失败：响应数据无效', response);
        }
    } catch (error) {
        console.error('刷新验证码出错：', error);
        mdui.snackbar({ message: '验证码刷新失败，请稍后重试' });
    }
};

/**
 * 处理登录/注册
 * @returns {Promise<void>}
 */
const handleLogin = async () => {
    elements.loading.css('display', 'flex');

    try {
        const pendingRegister = StorageUtil.getItem('pending_register');

        /**
         * ===== 完成注册流程 =====
         */
        if (elements.emailVerifyVode.val()) {
            if (!pendingRegister) {
                mdui.snackbar({ message: '注册状态已失效，请重新登录' });
                return;
            }

            const result = await HttpUtil.post(
                `${CORE_CONFIG.USER_API}/auth/complete-register`,
                {
                    ...getFormData(elements.form[0]),
                    verify_token: pendingRegister.verify_token,
                    captcha_token: captchaToken,
                    captcha_code: elements.captchaInput.val()
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
        if (!elements.username.val() || !elements.password.val()) {
            mdui.snackbar({ message: '请输入邮箱和密码' });
            return;
        }

        const result = await HttpUtil.post(
            `${CORE_CONFIG.USER_API}/auth/auth`,
            {
                ...getFormData(elements.form[0]),
                device_id: 'web',
                device_name: navigator.userAgent,
                app_version: 'web-1.0.0',
                captcha_token: captchaToken,
                captcha_code: elements.captchaInput.val()
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

            elements.emailVerifyVode.css('display', 'block');
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
        elements.loading.css('display', 'none');
    }
};

/**
 * 初始化页面
 * @returns {Promise<void>}
 */
const init = async () => {
    try {
        const response = await HttpUtil.get(`${CORE_CONFIG.USER_API}/auth/captcha`);

        if (response && response.data) {
            captchaToken = response.data.captcha_token;
            elements.captcha.attr('src', response.data.captcha_image);
        } else {
            console.error('获取验证码失败：响应数据无效', response);
        }
    } catch (error) {
        console.error('获取验证码出错：', error);
    }

    // 绑定验证码点击刷新事件
    elements.captcha.on('click', refreshCaptcha);

    // 绑定回车键刷新（当验证码输入框获得焦点时按回车）
    elements.captchaInput.on('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            refreshCaptcha();
        }
    });

    // 监听表单提交事件
    elements.form.on('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    // 绑定登录按钮点击事件
    elements.loginBtn.on('click', handleLogin);
};

$(document).ready(init);