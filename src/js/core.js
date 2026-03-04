"use strict";

import $ from './lib/jquery-4.0.0.esm.min.js';
import { StorageUtil } from "./lib/util.js";

const CORE_CONFIG = {
    API_URL: 'https://chat.flmp.uk/api/v1',
    USER_API: 'https://user.flmp.uk/api/v1',
    ENV: 'development',
    STORAGE_KEYS: {
        USER_INFO: 'user_info',
    },
};
const USER_LOGIN_TOKEN = StorageUtil.getItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO)?.token;
const elements = {
    themeToggle: $('#theme-toggle')
};

/**
 * 主题管理
 */
const ThemeManager = {
    /**
     * 保存主题设置到本地存储
     * @param {boolean} isDark 是否为暗色主题
     */
    saveThemePreference(isDark) {
        StorageUtil.setItem('theme', {
            isDark,
            savedAt: new Date().toISOString()
        });
    },

    /**
     * 从本地存储加载主题设置
     * @returns {boolean} 是否为暗色主题
     */
    loadThemePreference() {
        const themeData = StorageUtil.getItem('theme', { isDark: false });
        return themeData.isDark;
    },

    /**
     * 切换主题
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

        // 保存设置
        this.saveThemePreference(!isDark);
    },

    /**
     * 应用保存的主题
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
 */
const initializeEventListeners = () => {
    // 主题切换
    elements.themeToggle.on('click', () => {
        ThemeManager.toggleTheme();
    });
};

$(document).ready(() => {
    // 应用保存的主题设置
    ThemeManager.applySavedTheme();

    // 初始化事件监听
    initializeEventListeners();

    mdui.setColorScheme(StorageUtil.getItem('theme_color', '#0061a4'));

    //取消浏览器的所有事件，使得active的样式在手机上正常生效
    document.addEventListener('touchstart', function () {
        return false;
    }, true);
    document.oncontextmenu = function () {
        return false;
    };
    // H5 plus事件处理
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
});

export { CORE_CONFIG, USER_LOGIN_TOKEN, $ };