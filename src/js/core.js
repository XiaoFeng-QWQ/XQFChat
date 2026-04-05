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

const emojiList = [
    {
        name: 'MDUI',
        id: 'mdui',
        emojis: [
            { code: 'mdui_sentiment_very_satisfied', icon: '<i class="mdui-icon material-icons">sentiment_very_satisfied</i>', name: '非常满意' },
            { code: 'mdui_sentiment_very_dissatisfied', icon: '<i class="mdui-icon material-icons">sentiment_very_dissatisfied</i>', name: '非常不满意' },
            { code: 'mdui_sentiment_neutral', icon: '<i class="mdui-icon material-icons">sentiment_neutral</i>', name: '中性' },
            { code: 'mdui_sentiment_dissatisfied', icon: '<i class="mdui-icon material-icons">sentiment_dissatisfied</i>', name: '不满意' },
            { code: 'mdui_tag_faces', icon: '<i class="mdui-icon material-icons">tag_faces</i>', name: '笑脸' },
            { code: 'mdui_mood', icon: '<i class="mdui-icon material-icons">mood</i>', name: '心情好' },
            { code: 'mdui_mood_bad', icon: '<i class="mdui-icon material-icons">mood_bad</i>', name: '心情差' }
        ]
    },
    {
        name: 'bilibili',
        id: 'bilibili',
        emojis: [
            { code: 'bilibili_捂脸', icon: '<img src="/src/image/emoji_bilibili/4F7B287549839E77B7794D24F3F371FC.jpg" alt="bilibili_捂脸" class="emoji-img">', name: '捂脸' },
            { code: 'bilibili_酸了', icon: '<img src="/src/image/emoji_bilibili/4F20E1D4A70FE4D11036177C80726C80.jpg" alt="bilibili_酸了" class="emoji-img">', name: '酸了' },
            { code: 'bilibili_doge', icon: '<img src="/src/image/emoji_bilibili/526AF2C09479A04341F231E1D183A466.jpg" alt="bilibili_doge" class="emoji-img">', name: 'doge' },
            { code: 'bilibili_辣眼睛', icon: '<img src="/src/image/emoji_bilibili/54679BEB1C9314414C00BE5BB7F569D3.jpg" alt="bilibili_辣眼睛" class="emoji-img">', name: '辣眼睛' },
            { code: 'bilibili_星星眼', icon: '<img src="/src/image/emoji_bilibili/29143392A781D0EAF968CC3A7620B730.jpg" alt="bilibili_星星眼" class="emoji-img">', name: '星星眼' },
            { code: 'bilibili_笑哭', icon: '<img src="/src/image/emoji_bilibili/A70786955E1FAD75FD1E8A39DC2C5CDA.jpg" alt="bilibili_笑哭" class="emoji-img">', name: '笑哭' },
            { code: 'bilibili_脱单doge', icon: '<img src="/src/image/emoji_bilibili/F49E67F6A85D5518273BE911B020005A.jpg" alt="bilibili_脱单doge" class="emoji-img">', name: '脱单doge' },
            { code: 'bilibili_吃瓜', icon: '<img src="/src/image/emoji_bilibili/FDB64FA824243339EB181C6AC42985D8.jpg" alt="bilibili_吃瓜" class="emoji-img">', name: '吃瓜' }
        ]
    },
    {
        name: 'Emoji',
        id: 'emoji',
        emojis: [
            { code: 'emoji_smile', icon: '😊', name: '微笑' },
            { code: 'emoji_laugh', icon: '😂', name: '大笑' },
            { code: 'emoji_wink', icon: '😉', name: '眨眼' },
            { code: 'emoji_thumbsup', icon: '👍', name: '点赞' },
            { code: 'emoji_heart', icon: '❤️', name: '爱心' },
            { code: 'emoji_sad', icon: '😢', name: '难过' },
            { code: 'emoji_angry', icon: '😡', name: '生气' },
            { code: 'emoji_surprised', icon: '😮', name: '惊讶' },
            { code: 'emoji_cool', icon: '😎', name: '酷' },
            { code: 'emoji_party', icon: '🥳', name: '庆祝' },
            { code: 'emoji_clap', icon: '👏', name: '鼓掌' },
            { code: 'emoji_fire', icon: '🔥', name: '火' },
            { code: 'emoji_star', icon: '⭐', name: '星星' },
            { code: 'emoji_ok', icon: '👌', name: 'OK' },
            { code: 'emoji_wave', icon: '👋', name: '挥手' },
            { code: 'emoji_sleep', icon: '😴', name: '睡觉' },
            { code: 'emoji_confused', icon: '😕', name: '困惑' },
            { code: 'emoji_shock', icon: '😱', name: '震惊' },
            { code: 'emoji_facepalm', icon: '🤦', name: '捂脸' }
        ]
    }
];

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

export { CORE_CONFIG, USER_LOGIN_TOKEN, $, ThemeManager, emojiList };
