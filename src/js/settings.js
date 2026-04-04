"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $ } from './core.js';
import { StorageUtil, IndexedDBUtil, progressManager } from './lib/util.js';

// 从 mdui 全局对象中获取函数
const { setColorScheme, getColorFromImage } = mdui;

// DOM 元素引用
const elements = {
    // 返回按钮（仅在手机端 iframe 中出现）
    settingsBack: $('#settings-back'),

    // 预设配色
    colorPresets: $('.color-preset'),
    customColorPicker: $('#customColorPicker'),
    customColorHex: $('#customColorHex'),
    applyCustomColor: $('#applyCustomColor'),

    // 壁纸提取颜色
    wallpaperFile: $('#wallpaperFile'),
    selectWallpaperBtn: $('#selectWallpaperBtn'),
    extractedColorPreview: $('#extractedColorPreview'),
    extractedColorSwatch: $('.extracted-color-swatch'),
    extractedColorValue: $('.extracted-color-value'),
    applyExtractedColor: $('#applyExtractedColor'),

    // 聊天背景
    chatBgPreview: $('#chatBgPreview'),
    bgTypeRadios: $('[name="bgType"]'),
    bgColorPicker: $('#bgColorPicker'),
    bgColorHex: $('#bgColorHex'),
    bgImageFile: $('#bgImageFile'),
    selectBgImageBtn: $('#selectBgImageBtn'),
    clearBgImage: $('#clearBgImage'),
    bgImageFit: $('#bgImageFit'),
    blurAmount: $('#blurAmount'),
    blurValue: $('#blurValue'),
    applyBgSettings: $('#applyBgSettings'),
    resetBgSettings: $('#resetBgSettings'),

    // 背景选项容器
    bgColorInput: $('.bg-color-input'),
    bgImageInput: $('.bg-image-input'),
    bgBlurInput: $('.bg-blur-input'),

    // 本地消息管理
    totalMessagesSize: $('#totalMessagesSize'),
    currentRoomMessagesSize: $('#currentRoomMessagesSize'),
    totalMessagesCount: $('#totalMessagesCount'),
    clearCurrentRoomMessages: $('#clearCurrentRoomMessages'),
    clearAllMessages: $('#clearAllMessages'),
    exportMessages: $('#exportMessages'),

    // 消息显示设置
    showMessageTime: $('#showMessageTime'),
    compactMessages: $('#compactMessages'),
    timeBarGap: $('#timeBarGap'),
    timeBarGapValue: $('#timeBarGapValue'),
    autoLoadMore: $('#autoLoadMore'),
    loadLimit: $('#loadLimit'),
    loadLimitValue: $('#loadLimitValue'),

    // 隐私与安全
    messagePreview: $('#messagePreview'),
    typingIndicator: $('#typingIndicator'),
    readReceipt: $('#readReceipt'),

    // 对话框
    confirmClearDialog: $('#confirmClearDialog'),
    cancelClear: $('#cancelClear'),
    confirmClear: $('#confirmClear'),
    licenseDialog: $('#licenseDialog'),
    openSourceLicense: $('#openSourceLicense'),
    closeLicenseDialog: $('#closeLicenseDialog'),

    // 加载指示器
    loading: $('#loading')
};

// 存储键名常量
const STORAGE_KEYS = {
    THEME_COLOR: 'theme_color',
    CHAT_BG: 'chat_background',
    CHAT_BG_TYPE: 'chat_bg_type',
    CHAT_BG_COLOR: 'chat_bg_color',
    CHAT_BG_IMAGE: 'chat_bg_image',
    CHAT_BG_FIT: 'chat_bg_fit',
    CHAT_BG_BLUR: 'chat_bg_blur',
    MESSAGE_SETTINGS: 'message_settings',
    PRIVACY_SETTINGS: 'privacy_settings'
};

// 存储键辅助函数（与主聊天室保持一致）
const getMessageStorageKey = (roomId) => `chat_room_${roomId}_messages`;
const getEventStorageKey = (roomId) => `chat_room_${roomId}_events`;

// 状态管理
const state = {
    currentRoomId: null,
    extractedColor: null,
    tempBgImage: null,
    currentBgType: 'default' // 新增：当前选中的背景类型
};

let isSettingsInitialized = false;

/**
 * 初始化页面
 */
const init = async () => {
    // 检查登录状态：如果没有令牌，重定向到登录页面
    if (!USER_LOGIN_TOKEN) {
        window.location.href = 'login.html';
        return;
    }

    // 如果已经初始化过，直接返回，避免重复初始化
    if (isSettingsInitialized) {
        console.debug('Settings already initialized');
        return;
    }

    // 获取当前房间ID（如果存在）
    const urlParams = new URLSearchParams(window.location.search);
    state.currentRoomId = urlParams.get('room_id');

    // 加载保存的设置
    await loadSavedSettings();

    // 绑定事件
    bindEvents();

    // 计算存储使用情况
    await calculateStorageUsage();

    // 标记已初始化
    isSettingsInitialized = true;

    // 通知父窗口设置页面已准备就绪
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'settingsReady'
        }, '*');
    }
};

/**
 * 加载保存的设置
 */
const loadSavedSettings = async () => {
    // 加载主题颜色
    const savedColor = StorageUtil.getItem(STORAGE_KEYS.THEME_COLOR, '#0061a4');
    elements.customColorPicker.val(savedColor);
    elements.customColorHex.val(savedColor);

    // 标记当前激活的预设
    elements.colorPresets.each((_, preset) => {
        const $preset = $(preset);
        if ($preset.attr('data-color') === savedColor) {
            $preset.addClass('active');
        }
    });

    // 加载聊天背景设置
    loadChatBackgroundSettings();

    // 加载消息显示设置
    const msgSettings = StorageUtil.getItem(STORAGE_KEYS.MESSAGE_SETTINGS, {
        showTime: true,
        compact: true,
        timeBarGap: 30,
        autoLoad: true,
        loadLimit: 50
    });

    elements.showMessageTime.prop('checked', msgSettings.showTime);
    elements.compactMessages.prop('checked', msgSettings.compact);
    elements.timeBarGap.val(msgSettings.timeBarGap);
    elements.timeBarGapValue.text(`${msgSettings.timeBarGap}分钟`);
    elements.autoLoadMore.prop('checked', msgSettings.autoLoad);
    elements.loadLimit.val(msgSettings.loadLimit);
    elements.loadLimitValue.text(`${msgSettings.loadLimit}条`);

    // 加载隐私设置
    const privacySettings = StorageUtil.getItem(STORAGE_KEYS.PRIVACY_SETTINGS, {
        messagePreview: true,
        typingIndicator: true,
        readReceipt: true
    });

    elements.messagePreview.prop('checked', privacySettings.messagePreview);
    elements.typingIndicator.prop('checked', privacySettings.typingIndicator);
    elements.readReceipt.prop('checked', privacySettings.readReceipt);
};

/**
 * 加载聊天背景设置
 */
const loadChatBackgroundSettings = () => {
    const bgSettings = StorageUtil.getItem(STORAGE_KEYS.CHAT_BG, {
        type: 'default',
        color: '#f5f5f5',
        image: null,
        fit: 'cover',
        blur: 0
    });

    // 设置单选按钮
    elements.bgTypeRadios.each((_, radio) => {
        if (radio.value === bgSettings.type) {
            radio.checked = true;
        }
    });

    // 更新当前类型状态
    state.currentBgType = bgSettings.type;

    // 设置颜色
    elements.bgColorPicker.val(bgSettings.color);
    elements.bgColorHex.val(bgSettings.color);

    // 设置适应方式
    elements.bgImageFit.val(bgSettings.fit);

    // 设置模糊度
    elements.blurAmount.val(bgSettings.blur);
    elements.blurValue.text(`${bgSettings.blur}px`);

    // 如果有背景图片，保存到临时状态
    if (bgSettings.image) {
        state.tempBgImage = bgSettings.image;
    }

    // 更新UI显示状态
    updateBgOptionsVisibility(bgSettings.type);

    // 如果有背景图片，显示清除按钮
    if (bgSettings.image) {
        elements.clearBgImage.prop('disabled', false);
    }

    // 应用背景到预览
    applyBgToPreview(bgSettings);
};

/**
 * 更新背景选项可见性，同时更新当前类型状态
 * @param {string} type - 背景类型
 */
const updateBgOptionsVisibility = (type) => {
    // 更新当前类型状态
    state.currentBgType = type;

    elements.bgColorInput.hide();
    elements.bgImageInput.hide();
    elements.bgBlurInput.hide();

    switch (type) {
        case 'color':
            elements.bgColorInput.show();
            break;
        case 'image':
            elements.bgImageInput.show();
            break;
        case 'blur':
            elements.bgBlurInput.show();
            break;
    }
};

/**
 * 应用背景到预览
 * @param {Object} settings - 背景设置对象
 */
const applyBgToPreview = (settings) => {
    // 确保 settings 对象存在，并提取 type（默认 'default'）
    settings = settings || {};
    const type = settings.type || 'default';

    const $preview = elements.chatBgPreview;

    // 重置样式
    $preview.css({
        'background-color': '',
        'background-image': '',
        'background-size': '',
        'background-repeat': '',
        'background-position': '',
        'filter': ''
    });

    switch (type) {
        case 'default':
            // 使用主题的背景色
            const isDark = $('html').hasClass('mdui-theme-dark');
            $preview.css('background-color', isDark ? '#1e1e1e' : '#f5f5f5');
            break;

        case 'color':
            $preview.css('background-color', settings.color);
            break;

        case 'image':
            if (settings.image) {
                $preview.css('background-image', `url(${settings.image})`);

                if (settings.fit === 'cover') {
                    $preview.css({
                        'background-size': 'cover',
                        'background-repeat': 'no-repeat',
                        'background-position': 'center'
                    });
                } else if (settings.fit === 'contain') {
                    $preview.css({
                        'background-size': 'contain',
                        'background-repeat': 'no-repeat',
                        'background-position': 'center'
                    });
                } else if (settings.fit === 'repeat') {
                    $preview.css({
                        'background-size': 'auto',
                        'background-repeat': 'repeat',
                        'background-position': '0 0'
                    });
                }
            }
            break;

        case 'blur':
            // 保持原有背景，添加模糊效果
            $preview.css('filter', `blur(${settings.blur}px)`);
            break;

        default:
            console.warn(`未知背景类型: ${type}，使用默认背景`);
            // 回退到默认背景
            const isDarkFallback = $('html').hasClass('mdui-theme-dark');
            $preview.css('background-color', isDarkFallback ? '#1e1e1e' : '#f5f5f5');
    }
};

/**
 * 计算存储使用情况（使用 IndexedDB）
 */
const calculateStorageUsage = async () => {
    if (!state.currentRoomId) {
        elements.totalMessagesSize.text('-');
        elements.currentRoomMessagesSize.text('-');
        elements.totalMessagesCount.text('-');
        return;
    }

    try {
        // 获取当前房间的消息和事件
        const messages = await IndexedDBUtil.getItem(getMessageStorageKey(state.currentRoomId), []);
        const events = await IndexedDBUtil.getItem(getEventStorageKey(state.currentRoomId), []);

        const messagesStr = JSON.stringify(messages);
        const eventsStr = JSON.stringify(events);

        const messagesSize = new Blob([messagesStr]).size;
        const eventsSize = new Blob([eventsStr]).size;
        const totalSize = messagesSize + eventsSize;
        const totalCount = messages.length + events.length;

        elements.totalMessagesSize.text(formatBytes(totalSize));
        elements.currentRoomMessagesSize.text(formatBytes(totalSize)); // 当前房间即为总大小
        elements.totalMessagesCount.text(totalCount);
    } catch (error) {
        console.error('计算存储使用情况失败:', error);
        elements.totalMessagesSize.text('计算失败');
        elements.currentRoomMessagesSize.text('计算失败');
        elements.totalMessagesCount.text('-');
    }
};

/**
 * 格式化字节数
 */
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 获取当前背景设置（使用 state.currentBgType）
 */
const getCurrentBgSettings = () => {
    return {
        type: state.currentBgType,
        color: elements.bgColorPicker.val(),
        image: state.tempBgImage || null,
        fit: elements.bgImageFit.val(),
        blur: parseInt(elements.blurAmount.val()) || 0
    };
};

/**
 * 应用配色方案
 */
const applyColorScheme = (color) => {
    try {
        setColorScheme(color);
        // 保存到存储
        StorageUtil.setItem(STORAGE_KEYS.THEME_COLOR, color);
        mdui.snackbar({ message: '配色方案已应用' });
    } catch (error) {
        console.error('应用配色失败:', error);
        mdui.snackbar({ message: '应用配色失败' });
    }
};

/**
 * 绑定事件
 */
const bindEvents = () => {
    // 预设配色点击
    elements.colorPresets.on('click', function () {
        const color = $(this).attr('data-color');

        // 移除其他激活状态
        elements.colorPresets.removeClass('active');
        $(this).addClass('active');

        // 更新颜色选择器
        elements.customColorPicker.val(color);
        elements.customColorHex.val(color);

        // 应用配色
        applyColorScheme(color);
    });

    // 自定义颜色输入同步
    elements.customColorPicker.on('input', (e) => {
        const color = e.target.value;
        elements.customColorHex.val(color);
    });

    elements.customColorHex.on('input', (e) => {
        const color = e.target.value;
        // 简单的颜色格式验证
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            elements.customColorPicker.val(color);
        }
    });

    // 应用自定义颜色
    elements.applyCustomColor.on('click', () => {
        const color = elements.customColorHex.val();
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            // 移除预设激活状态
            elements.colorPresets.removeClass('active');
            applyColorScheme(color);
        } else {
            mdui.snackbar({ message: '请输入有效的十六进制颜色值' });
        }
    });

    // 选择壁纸图片
    elements.selectWallpaperBtn.on('click', () => {
        elements.wallpaperFile.trigger('click');
    });

    elements.wallpaperFile.on('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        progressManager.start();

        try {
            const image = new Image();
            image.src = URL.createObjectURL(file);

            await new Promise((resolve) => {
                image.onload = resolve;
            });

            const color = await getColorFromImage(image);
            state.extractedColor = color;

            // 显示预览
            elements.extractedColorSwatch.css('background-color', color);
            elements.extractedColorValue.text(color);
            elements.extractedColorPreview.show();

            URL.revokeObjectURL(image.src);

        } catch (error) {
            console.error('提取颜色失败:', error);
            mdui.snackbar({ message: '提取颜色失败，请重试' });
        } finally {
            progressManager.stop();
        }
    });

    // 应用提取的颜色
    elements.applyExtractedColor.on('click', () => {
        if (state.extractedColor) {
            elements.customColorPicker.val(state.extractedColor);
            elements.customColorHex.val(state.extractedColor);
            applyColorScheme(state.extractedColor);
            elements.extractedColorPreview.hide();
        }
    });

    // 背景类型切换（只处理实际选中的 radio）
    elements.bgTypeRadios.on('change', (e) => {
        if (e.target.checked) {
            // 更新当前类型状态
            state.currentBgType = e.target.value;
            updateBgOptionsVisibility(e.target.value);
            const currentSettings = getCurrentBgSettings();
            applyBgToPreview(currentSettings);
        }
    });

    // 背景颜色选择
    elements.bgColorPicker.on('input', (e) => {
        const color = e.target.value;
        elements.bgColorHex.val(color);

        // 实时预览
        const currentSettings = getCurrentBgSettings();
        applyBgToPreview(currentSettings);
    });

    elements.bgColorHex.on('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            elements.bgColorPicker.val(color);

            // 实时预览
            const currentSettings = getCurrentBgSettings();
            applyBgToPreview(currentSettings);
        }
    });

    // 选择背景图片
    elements.selectBgImageBtn.on('click', () => {
        elements.bgImageFile.trigger('click');
    });

    elements.bgImageFile.on('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            // 临时保存到状态，应用时才保存
            state.tempBgImage = e.target.result;
            elements.clearBgImage.prop('disabled', false);

            // 预览
            const currentSettings = getCurrentBgSettings();
            currentSettings.image = e.target.result;
            applyBgToPreview(currentSettings);
        };
        reader.readAsDataURL(file);
    });

    // 清除背景图片
    elements.clearBgImage.on('click', () => {
        state.tempBgImage = null;
        elements.clearBgImage.prop('disabled', true);
        elements.bgImageFile.val('');

        const currentSettings = getCurrentBgSettings();
        currentSettings.image = null;
        applyBgToPreview(currentSettings);
    });

    // 背景适应方式改变
    elements.bgImageFit.on('change', () => {
        const currentSettings = getCurrentBgSettings();
        applyBgToPreview(currentSettings);
    });

    // 模糊度调节
    elements.blurAmount.on('input', (e) => {
        const val = e.target.value;
        elements.blurValue.text(`${val}px`);

        // 实时预览
        const currentSettings = getCurrentBgSettings();
        currentSettings.blur = val;
        applyBgToPreview(currentSettings);
    });

    // 应用背景设置
    elements.applyBgSettings.on('click', () => {
        const settings = getCurrentBgSettings();

        // 保存设置
        StorageUtil.setItem(STORAGE_KEYS.CHAT_BG, settings);

        mdui.snackbar({ message: '背景设置已保存' });
    });

    // 重置背景设置
    elements.resetBgSettings.on('click', () => {
        StorageUtil.removeItem(STORAGE_KEYS.CHAT_BG);

        // 重置为默认值
        elements.bgTypeRadios.each((_, radio) => {
            if (radio.value === 'default') {
                radio.checked = true;
            }
        });

        // 更新当前类型状态
        state.currentBgType = 'default';

        elements.bgColorPicker.val('#f5f5f5');
        elements.bgColorHex.val('#f5f5f5');
        elements.bgImageFit.val('cover');
        elements.blurAmount.val(0);
        elements.blurValue.text('0px');
        elements.clearBgImage.prop('disabled', true);
        elements.bgImageFile.val('');
        state.tempBgImage = null;

        updateBgOptionsVisibility('default');

        // 应用默认背景到预览
        applyBgToPreview({ type: 'default' });

        mdui.snackbar({ message: '已重置为默认背景' });
    });

    // 时间条间隔滑块
    elements.timeBarGap.on('input', (e) => {
        const val = e.target.value;
        elements.timeBarGapValue.text(`${val}分钟`);
    });

    // 加载数量滑块
    elements.loadLimit.on('input', (e) => {
        const val = e.target.value;
        elements.loadLimitValue.text(`${val}条`);
    });

    // 返回按钮（仅在手机端 iframe 中出现）
    elements.settingsBack.on('click', () => {
        // 发送消息给父窗口，通知返回
        window.parent.postMessage({
            type: 'settingsBack'
        }, '*');
    });

    // 本地消息管理（使用 IndexedDB）

    // 清空当前房间消息
    elements.clearCurrentRoomMessages.on('click', () => {
        if (!state.currentRoomId) {
            mdui.snackbar({ message: '当前不在聊天室中' });
            return;
        }

        $('#confirmClearMessage').text('确定要清空当前聊天室的本地消息记录吗？此操作不可恢复。');
        elements.confirmClearDialog.prop('open', true);

        // 绑定确认事件（一次性）
        elements.confirmClear.off('click').on('click', async () => {
            try {
                // 使用正确的存储键名删除
                await IndexedDBUtil.removeItem(getMessageStorageKey(state.currentRoomId));
                await IndexedDBUtil.removeItem(getEventStorageKey(state.currentRoomId));
                elements.confirmClearDialog.prop('open', false);
                await calculateStorageUsage(); // 重新计算
                mdui.snackbar({ message: '已清空当前聊天室消息记录' });
            } catch (error) {
                console.error('清空消息失败:', error);
                mdui.snackbar({ message: '清空失败，请重试' });
            }
        });
    });

    // 清空所有消息（暂不支持一键清空所有房间）
    elements.clearAllMessages.on('click', () => {
        mdui.snackbar({ message: '暂不支持一键清空所有房间，请单独清空每个房间' });
        return;
    });

    // 导出消息
    elements.exportMessages.on('click', async () => {
        if (!state.currentRoomId) {
            mdui.snackbar({ message: '当前不在聊天室中' });
            return;
        }

        try {
            const messages = await IndexedDBUtil.getItem(getMessageStorageKey(state.currentRoomId), []);
            const events = await IndexedDBUtil.getItem(getEventStorageKey(state.currentRoomId), []);

            const exportData = {
                roomId: state.currentRoomId,
                exportTime: new Date().toISOString(),
                messageCount: messages.length,
                messages: messages,
                events: events
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_export_${state.currentRoomId}_${new Date().getTime()}.json`;
            a.click();

            URL.revokeObjectURL(url);

            mdui.snackbar({ message: '导出成功' });
        } catch (error) {
            console.error('导出消息失败:', error);
            mdui.snackbar({ message: '导出失败' });
        }
    });

    // 取消清空
    elements.cancelClear.on('click', () => {
        elements.confirmClearDialog.prop('open', false);
    });

    // 开源协议
    elements.openSourceLicense.on('click', (e) => {
        e.preventDefault();
        elements.licenseDialog.prop('open', true);
    });

    elements.closeLicenseDialog.on('click', () => {
        elements.licenseDialog.prop('open', false);
    });

    // 保存消息显示设置
    const saveMessageSettings = () => {
        const settings = {
            showTime: elements.showMessageTime.prop('checked'),
            compact: elements.compactMessages.prop('checked'),
            timeBarGap: parseInt(elements.timeBarGap.val()),
            autoLoad: elements.autoLoadMore.prop('checked'),
            loadLimit: parseInt(elements.loadLimit.val())
        };
        StorageUtil.setItem(STORAGE_KEYS.MESSAGE_SETTINGS, settings);
    };

    elements.showMessageTime.on('change', saveMessageSettings);
    elements.compactMessages.on('change', saveMessageSettings);
    elements.timeBarGap.on('change', saveMessageSettings);
    elements.autoLoadMore.on('change', saveMessageSettings);
    elements.loadLimit.on('change', saveMessageSettings);

    // 保存隐私设置
    const savePrivacySettings = () => {
        const settings = {
            messagePreview: elements.messagePreview.prop('checked'),
            typingIndicator: elements.typingIndicator.prop('checked'),
            readReceipt: elements.readReceipt.prop('checked')
        };
        StorageUtil.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, settings);
    };

    elements.messagePreview.on('change', savePrivacySettings);
    elements.typingIndicator.on('change', savePrivacySettings);
    elements.readReceipt.on('change', savePrivacySettings);
};

// 启动
$(document).ready(init);