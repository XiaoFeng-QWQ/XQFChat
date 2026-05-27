"use strict";

import { SSOAuth, $, ThemeManager } from './core.js';

/**
 * 检查 SSO 状态并引导用户
 * @returns {Promise<void>}
 */
const checkLoginStatus = async () => {
    try {
        const ssoData = await SSOAuth.check();

        if (ssoData) {
            // 已登录，获取用户信息后跳转
            $('#statusText').text('已检测到登录状态，正在进入...');
            await SSOAuth.fetchCurrentUser();
            window.location.href = 'index.html';
            return;
        }

        // 未登录
        showNotLoggedIn();
    } catch (error) {
        console.error('SSO check error:', error);
        showError('网络连接异常，请检查网络后重试');
    }
};

/**
 * 显示未登录引导界面
 * @returns {void}
 */
const showNotLoggedIn = () => {
    $('#checkingSpinner').hide();
    $('#statusText').text('请先登录 Flmp 账户');
    $('#notLoggedInCard').show();

    $('#goLoginBtn').on('click', () => {
        SSOAuth.redirectToLogin();
    });
};

/**
 * 显示错误界面
 * @param {string} message 错误消息
 * @returns {void}
 */
const showError = (message) => {
    $('#checkingSpinner').hide();
    $('#statusText').text('连接异常');
    $('#errorText').text(message);
    $('#errorCard').show();

    $('#retryBtn').on('click', () => {
        $('#errorCard').hide();
        $('#checkingSpinner').show();
        $('#statusText').text('正在检测登录状态...');
        checkLoginStatus();
    });
};

/**
 * 初始化主题
 * @returns {void}
 */
const initTheme = () => {
    ThemeManager.applySavedTheme();

    $('#theme-toggle').on('click', () => {
        ThemeManager.toggleTheme();
    });
};

// 页面加载
initTheme();
$(document).ready(checkLoginStatus);
