"use strict";

import $ from './lib/jquery-4.0.0.esm.min.js';


/**
 * localStorage 轻量封装
 * 内联以避免与 util.js 的循环依赖
 * @type {Object}
 */
const storage = {
    getItem(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('localStorage.setItem failed:', e);
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('localStorage.removeItem failed:', e);
        }
    }
};

/**
 * 核心配置常量
 * @type {Object}
 */
const CORE_CONFIG = {
    API_URL: 'https://chat.flmp.uk/api/v1',
    USER_API: 'https://user.flmp.uk/api/v1',
    ENV: 'development',
    STORAGE_KEYS: {
        USER_INFO: 'user_info'
    }
};

/**
 * SSO 单点登录配置
 * Cookie: flmp-user-auth-token, domain .flmp.uk, httponly
 */
const SSO_CONFIG = {
    LOGIN_URL: 'https://user.flmp.uk',
    SSO_CHECK_API: '/sso/check',
    PROFILE_API: '/profile/get-current',
    LOGOUT_API: '/auth/logout'
};

/**
 * SSO 认证模块
 * 基于 Cookie 的无 Token 认证体系
 * @type {Object}
 */
const SSOAuth = {
    /**
     * 检查 SSO 登录状态
     * 调用 /api/v1/sso/check，Cookie 自动携带
     * @returns {Promise<Object|null>} 包含 accounts 数组的 data 对象，或 null
     */
    async check() {
        try {
            const resp = await fetch(`${CORE_CONFIG.USER_API}${SSO_CONFIG.SSO_CHECK_API}`, {
                credentials: 'include'
            });
            const result = await resp.json();
            if (result.code === 0 && result.data && result.data.accounts && result.data.accounts.length > 0) {
                return result.data;
            }
            return null;
        } catch (e) {
            console.error('SSO check failed:', e);
            return null;
        }
    },

    /**
     * 获取当前登录用户完整信息（含 email 等敏感字段）
     * 调用 /api/v1/profile/get-current，Cookie 自动携带
     * 成功后自动缓存到 localStorage
     * @returns {Promise<Object|null>}
     */
    async fetchCurrentUser() {
        try {
            const resp = await fetch(`${CORE_CONFIG.USER_API}${SSO_CONFIG.PROFILE_API}`, {
                credentials: 'include'
            });
            const result = await resp.json();
            if (result.code === 200 && result.data) {
                storage.setItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO, result.data);
                return result.data;
            }
            return null;
        } catch (e) {
            console.error('fetchCurrentUser failed:', e);
            return null;
        }
    },

    /**
     * 从本地缓存获取用户信息（同步）
     * @returns {Object|null}
     */
    getCachedUser() {
        return storage.getItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO);
    },

    /**
     * 同步检查本地是否有用户缓存
     * @returns {boolean}
     */
    isLocallyLoggedIn() {
        return storage.getItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO) !== null;
    },

    /**
     * 退出当前登录
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            await fetch(`${CORE_CONFIG.USER_API}${SSO_CONFIG.LOGOUT_API}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error('SSO logout failed:', e);
        }
        storage.removeItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO);
    },

    /**
     * 跳转到 SSO 统一登录页面
     * @returns {void}
     */
    redirectToLogin() {
        window.location.href = SSO_CONFIG.LOGIN_URL;
    }
};

/**
 * DOM 元素缓存
 * @type {Object.<string, jQuery>}
 */
const elements = {
    themeToggle: $('#theme-toggle')
};

/**
 * 主题管理对象
 * @type {Object}
 */
const ThemeManager = {
    /**
     * 保存主题偏好设置
     * @param {boolean} isDark - 是否为深色主题
     * @returns {void}
     */
    saveThemePreference(isDark) {
        storage.setItem('theme', {
            isDark,
            savedAt: new Date().toISOString()
        });
    },

    /**
     * 加载主题偏好设置
     * @returns {boolean} 是否为深色主题
     */
    loadThemePreference() {
        const themeData = storage.getItem('theme', { isDark: false });
        return themeData.isDark;
    },

    /**
     * 切换主题
     * @returns {void}
     */
    toggleTheme() {
        const $html = $('html');
        const isDark = $html.hasClass('mdui-theme-dark');

        if (isDark) {
            $html.removeClass('mdui-theme-dark').addClass('mdui-theme-light');
        } else {
            $html.removeClass('mdui-theme-light').addClass('mdui-theme-dark');
        }

        elements.themeToggle.attr('icon', !isDark ? 'light_mode' : 'dark_mode');

        this.saveThemePreference(!isDark);
    },

    /**
     * 应用保存的主题设置
     * @returns {void}
     */
    applySavedTheme() {
        const isDark = this.loadThemePreference();
        const $html = $('html');

        if (isDark) {
            $html.addClass('mdui-theme-dark').removeClass('mdui-theme-light');
        } else {
            $html.addClass('mdui-theme-light').removeClass('mdui-theme-dark');
        }

        elements.themeToggle.attr('icon', isDark ? 'light_mode' : 'dark_mode');
    }
};

/**
 * 初始化事件监听器
 * @returns {void}
 */
const initializeEventListeners = () => {
    elements.themeToggle.on('click', () => {
        ThemeManager.toggleTheme();
    });
};

/**
 * 初始化应用
 * @returns {void}
 */
const init = () => {
    ThemeManager.applySavedTheme();

    initializeEventListeners();

    mdui.setColorScheme(storage.getItem('theme_color', '#0061a4'));

    document.addEventListener('touchstart', function () {
        return false;
    }, true);
    document.oncontextmenu = function () {
        return false;
    };

    /**
     * 处理设备返回按钮
     * @returns {void}
     */
    function plusReady() {
        plus.key.addEventListener('backbutton', function () {
            ('iOS' == plus.os.name) ? plus.nativeUI.confirm('确认退出？', function (e) {
                if (e.index > 0) {
                    plus.runtime.quit();
                }
            }, 'HelloH5', ['取消', '确定']) : (confirm('确认退出？') && plus.runtime.quit());
        }, false);
        plus.navigator.closeSplashscreen();
    }

    if (window.plus) {
        plusReady();
    } else {
        document.addEventListener('plusready', plusReady, false);
    }
};

$(document).ready(init);

export { CORE_CONFIG, SSO_CONFIG, SSOAuth, $, ThemeManager };
