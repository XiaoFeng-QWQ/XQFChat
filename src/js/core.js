"use strict";

import $ from './lib/jquery-4.0.0.esm.min.js';
import './lib/mdui.global.min.js';
import { StorageUtil } from './lib/util.js';

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
 * 用户登录令牌
 * @type {string|null}
 */
const USER_LOGIN_TOKEN = StorageUtil.getItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO)?.token;

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
        StorageUtil.setItem('theme', {
            isDark,
            savedAt: new Date().toISOString()
        });
    },

    /**
     * 加载主题偏好设置
     * @returns {boolean} 是否为深色主题
     */
    loadThemePreference() {
        const themeData = StorageUtil.getItem('theme', { isDark: false });
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

    mdui.setColorScheme(StorageUtil.getItem('theme_color', '#0061a4'));

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

export { CORE_CONFIG, USER_LOGIN_TOKEN, $, ThemeManager };
