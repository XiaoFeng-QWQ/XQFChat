"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $, emojiList } from './core.js';
import { HttpUtil, StorageUtil, formatTime, IndexedDBUtil, progressManager } from './lib/util.js';

// 检测是否在iframe环境中
const isInIframe = () => {
    return window.self !== window.top;
};

// 通知父窗口切换房间
const notifyParentToSwitchRoom = (roomId) => {
    if (isInIframe() && window.parent) {
        window.parent.postMessage({
            type: 'switchRoom',
            roomId: roomId
        }, '*');
    }
};

// DOM 元素引用（保持不变）
const elements = {
    messageList: $('#messageList'),
    chatInput: $('#chatInput'),
    sendBtn: $('#sendBtn'),
    msgMenu: $('#msgMenu'),
    replyPreview: $('#replyPreview'),
    replyTitle: $('#replyTitle'),
    replyBody: $('#replyBody'),
    cancelReply: $('#cancelReply'),
    navigationDrawertoggle: $('#navigationDrawertoggle'),
    mobileBackBtn: $('#mobileBackBtn'),
    navigationDrawer: $('#navigationDrawer'),
    chatRoomList: $('#chatRoomList'),
    chatRoomListEmpty: $('#chatRoomListEmpty'),
    sidebarRoomAvatar: $('#sidebarRoomAvatar'),
    sidebarRoomName: $('#sidebarRoomName'),
    sidebarRoomOnline: $('#sidebarRoomOnline'),
    sidebarBackBtn: $('#sidebarBackBtn'),
    sidebarRoomInfoBtn: $('#sidebarRoomInfoBtn'),
    refreshRoomListBtn: $('#refreshRoomListBtn'),
    leaveRoom: $('#leaveRoom'),
    confirmLeaveRoomDialog: $('#confirmLeaveRoomDialog'),
    cancelConfirmLeaveRoom: $('#cancelConfirmLeaveRoom'),
    confirmLeaveRoom: $('#confirmLeaveRoom'),
    userInfoDialog: $('#userInfoDialog'),
    userInfoElements: {
        loading: $('#userInfoLoading'),
        content: $('#userInfoContent'),
        avatar: $('#userInfoAvatar'),
        nickname: $('#userInfoNickname'),
        bio: $('#userInfoBio'),
        id: $('#userInfoId'),
        createdAt: $('#userInfoCreatedAt'),
        lastActive: $('#userInfoLastActive')
    },

    roomUpdateDialog: $('#roomUpdateDialog'),
    roomUpdateForm: $('#roomUpdateForm'),
    roomUpdateLoading: $('#roomUpdateLoading'),
    roomUpdateContent: $('#roomUpdateContent'),
    roomUpdateName: $('#roomUpdateName'),
    roomUpdateDesc: $('#roomUpdateDesc'),
    roomUpdateMaxUsers: $('#roomUpdateMaxUsers'),
    roomUpdateAvatar: $('#roomUpdateAvatar'),
    roomUpdateAvatarPreview: $('#roomUpdateAvatarPreview'),
    roomUpdateAvatarBtn: $('#roomUpdateAvatarBtn'),
    roomUpdateAvatarFile: $('#roomUpdateAvatarFile'),
    roomUpdateSubmit: $('#roomUpdateSubmit'),
    roomUpdateCancel: $('#roomUpdateCancel'),
    roomData: {
        title: $('#title'),
        roomInfoProgress: $('#roomInfoProgress'),
        avatar: $('#roomAvatar'),
        name: $('#roomName'),
        desc: $('#roomDesc'),
        id: $('#roomId'),
        onlineCount: $('#roomOnlineCount'),
        owner: $('#roomOwner'),
        createTime: $('#roomCreateTime'),
        memberList: $('#roomMemberList'),
        updateBtn: $('#updateRoomBtn')
    },

    // 转发相关元素
    forwardDialog: $('#forwardDialog'),
    forwardLoading: $('#forwardLoading'),
    forwardContent: $('#forwardContent'),
    forwardRoomSelect: $('#forwardRoomSelect'),
    forwardModeSelect: $('#forwardModeSelect'),
    forwardPreview: $('#forwardPreview'),
    forwardPreviewContent: $('#forwardPreviewContent'),
    cancelForward: $('#cancelForward'),
    confirmForward: $('#confirmForward'),
    forwardDetailDialog: $('#forwardDetailDialog'),
    forwardDetailContent: $('#forwardDetailContent'),
    closeForwardDetail: $('#closeForwardDetail'),
    nestedForwardDialog: $('#nestedForwardDialog'),
    nestedForwardContent: $('#nestedForwardContent'),
    closeNestedForward: $('#closeNestedForward'),

    // 多选模式相关元素
    multiSelectToolbar: $('#multiSelectToolbar'),
    selectedCount: $('#selectedCount'),
    forwardSingleBtn: $('#forwardSingleBtn'),
    forwardMergedBtn: $('#forwardMergedBtn'),
    closeSelectModeBtn: $('#closeSelectModeBtn'),

    // 新增功能元素
    addBtn: $('#addBtn'),
    actionBar: $('#actionBar'),
    toggleMarkdown: $('#toggleMarkdown'),
    uploadFile: $('#uploadFile'),
    toggleEmoji: $('#toggleEmoji'),
    openFileManager: $('#openFileManager'),
    closeActionBar: $('#closeActionBar'),
    emojiPanel: $('#emojiPanel'),
    emojiTabs: $('#emojiTabs'),
    fileUploadInput: $('#fileUploadInput'),
    
    // 文件管理元素
    fileManagerDialog: $('#fileManagerDialog'),
    fileStats: $('#fileStats'),
    fileListContainer: $('#fileListContainer'),
    fileManagerLoading: $('#fileManagerLoading'),
    closeFileManager: $('#closeFileManager'),
    refreshFileList: $('#refreshFileList'),
    
    // 机器人管理元素
    manageRoomBots: $('#manageRoomBots'),
    roomBotsDialog: $('#roomBotsDialog'),
    roomBotsLoading: $('#roomBotsLoading'),
    roomBotsList: $('#roomBotsList'),
    closeRoomBotsDialog: $('#closeRoomBotsDialog'),
    refreshRoomBots: $('#refreshRoomBots'),
    
    installBotDialog: $('#installBotDialog'),
    marketplaceLoading: $('#marketplaceLoading'),
    marketplaceBotsList: $('#marketplaceBotsList'),
    closeInstallBotDialog: $('#closeInstallBotDialog')
};

// 配置常量
const CONFIG = {
    COMPACT_TIME_LIMIT: 60000, // 紧凑消息时间限制(毫秒)
    HIGHLIGHT_DURATION: 1500,  // 高亮动画持续时间
    TIME_BAR_GAP_MINUTES: 30,   // 时间条间隔时间（分钟）
    ME_USER_ID: StorageUtil.getItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO)?.id || null,
    SCROLL_THRESHOLD: 100, // 距离底部的阈值（像素），小于此值视为在底部
    POLL_INTERVAL: 1000, // 轮询间隔（毫秒）
    POLL_LIMIT: 50, // 每次轮询获取的消息数量限制
    LOCAL_STORAGE_KEY_PREFIX: 'chat_room_', // 本地存储键前缀
    STORAGE_KEYS: {
        CHAT_BG: 'chat_background',
        CHAT_BG_TYPE: 'chat_bg_type',
        CHAT_BG_COLOR: 'chat_bg_color',
        CHAT_BG_IMAGE: 'chat_bg_image',
        CHAT_BG_FIT: 'chat_bg_fit',
        CHAT_BG_BLUR: 'chat_bg_blur'
    }
};

// 状态管理
const state = {
    lastSenderId: null,
    lastMsgTime: 0,
    activeMsgRow: null,
    replyingTo: null, // 存储被回复的消息对象
    forwardingMessage: null, // 存储要转发的消息对象
    selectedMessages: new Set(), // 存储选中的消息ID
    selectedMessagesForForward: [], // 存储要转发的选中消息ID
    selectedTargetRoomId: null, // 存储选中的目标聊天室ID
    isSelectMode: false, // 是否处于多选模式
    timelineItems: [], // 存储所有时间线项目（消息+事件）
    isUserScrolled: false, // 用户是否手动滚动
    scrollCheckTimer: null, // 滚动检查定时器
    currentRoomInfo: [],
    pollTimer: null, // 轮询定时器
    lastMessageId: 0, // 最后一条消息的ID，用于轮询
    isPolling: false, // 是否正在轮询中
    itemIds: new Set(), // 存储已存在的时间线项目ID，用于去重
    lastItemTime: 0, // 上一条时间线项目的时间戳
    lastEventId: 0, // 最后一条事件的ID
    nestedForwardStack: [], // 嵌套转发数据堆栈
    isMarkdownEnabled: false, // 是否启用 Markdown
    currentEmojiTab: 'mdui' // 当前表情标签
};

/**
 * 转义HTML特殊字符
 */
const escapeHTML = (str) => {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// 消息类型定义
const MESSAGE_TYPES = {
    TEXT: 'text',
    MARKDOWN: 'markdown',
    DELETED: 'deleted',
    CARD_FILE: 'card.file',
    CARD_FORWARD: 'card.forward'
};

// 事件类型定义
const EVENT_TYPES = {
    USER_JOIN: 'user.join',
    USER_LEAVE: 'user.leave',
    USER_KICK: 'user.kick',
    MESSAGE_CREATE: 'message.create',
    MESSAGE_DELETE: 'message.delete',
    ROOM_UPDATE: 'room.update'
};

// 时间线项目类型定义
const ITEM_TYPES = {
    MESSAGE: 'message',
    EVENT: 'event'
};

// 背景设置管理
const bgSettings = {
    current: null,

    /**
     * 加载保存的背景设置
     */
    async load() {
        const saved = StorageUtil.getItem(CONFIG.STORAGE_KEYS.CHAT_BG, {
            type: 'default',
            color: '#f5f5f5',
            image: null,
            fit: 'cover',
            blur: 0
        });
        this.current = saved;
        return saved;
    },

    /**
     * 应用背景设置到消息列表
     */
    apply() {
        if (!this.current) return;

        const $messageList = elements.messageList;
        const settings = this.current;

        // 重置样式
        $messageList.css({
            'background-color': '',
            'background-image': '',
            'background-size': '',
            'background-repeat': '',
            'background-position': '',
            'filter': ''
        });

        switch (settings.type) {
            case 'default':
                // 使用主题默认背景
                const isDark = $('html').hasClass('mdui-theme-dark');
                $messageList.css('background-color', isDark ? '#1e1e1e' : '#f5f5f5');
                break;

            case 'color':
                $messageList.css('background-color', settings.color);
                break;

            case 'image':
                if (settings.image) {
                    $messageList.css('background-image', `url(${settings.image})`);

                    const bgStyles = {
                        'background-size': settings.fit === 'contain' ? 'contain' : 'cover',
                        'background-repeat': settings.fit === 'repeat' ? 'repeat' : 'no-repeat',
                        'background-position': 'center'
                    };

                    if (settings.fit === 'repeat') {
                        bgStyles['background-size'] = 'auto';
                    }

                    $messageList.css(bgStyles);
                }
                break;

            case 'blur':
                // 模糊效果通常需要结合其他背景使用
                if (settings.image) {
                    $messageList.css({
                        'background-image': `url(${settings.image})`,
                        'background-size': 'cover',
                        'background-position': 'center',
                        'filter': `blur(${settings.blur}px)`
                    });
                } else {
                    $messageList.css('filter', `blur(${settings.blur}px)`);
                }
                break;
        }
    },

    /**
     * 监听背景设置变化
     */
    watch() {
        // 监听 storage 事件，当其他标签页修改设置时同步
        window.addEventListener('storage', (e) => {
            if (e.key === CONFIG.STORAGE_KEYS.CHAT_BG) {
                this.load().then(() => this.apply());
            }
        });
    }
};

/**
 * 获取当前房间的消息存储键
 * @returns {string}
 */
const getMessageStorageKey = () => {
    return `${CONFIG.LOCAL_STORAGE_KEY_PREFIX}${state.currentRoomInfo.id}_messages`;
};

/**
 * 获取当前房间的事件存储键
 * @returns {string}
 */
const getEventStorageKey = () => {
    return `${CONFIG.LOCAL_STORAGE_KEY_PREFIX}${state.currentRoomInfo.id}_events`;
};

/**
 * 从 IndexedDB 加载当前房间的本地消息和事件
 * 合并后填充到 state.timelineItems 和 state.itemIds，并更新 lastMessageId
 * 同时渲染到界面
 */
const loadLocalMessages = async () => {
    const messageKey = getMessageStorageKey();
    const eventKey = getEventStorageKey();

    // 并行获取消息和事件
    const [storedMessages, storedEvents] = await Promise.all([
        IndexedDBUtil.getItem(messageKey),
        IndexedDBUtil.getItem(eventKey)
    ]);

    const messages = (storedMessages?.items || []).map(msg => ({
        ...msg,
        type: ITEM_TYPES.MESSAGE
    }));

    const events = (storedEvents?.items || []).map(evt => ({
        ...evt,
        type: ITEM_TYPES.EVENT
    }));

    // 合并并按时间戳排序
    const items = [...messages, ...events].sort((a, b) => a.timestamp - b.timestamp);

    if (items.length === 0) return;

    // 清空当前状态
    state.timelineItems = [];
    state.itemIds.clear();
    state.lastMessageId = 0;

    // 逐个添加到状态和 ID 集合
    items.forEach(item => {
        state.timelineItems.push(item);
        const uniqueId = `${item.type}-${item.id}`;
        state.itemIds.add(uniqueId);
        if (item.type === ITEM_TYPES.MESSAGE && item.id > state.lastMessageId) {
            state.lastMessageId = item.id;
        }
        if (item.type === ITEM_TYPES.EVENT && item.id > state.lastEventId) {
            state.lastEventId = item.id;
        }
    });

    appendTimelineItems(items, { autoScroll: false });

    // 更新最后一条消息的时间，用于后续紧凑布局
    const lastItem = items[items.length - 1];
    if (lastItem.type === ITEM_TYPES.MESSAGE) {
        state.lastSenderId = lastItem.user_id;
        state.lastMsgTime = lastItem.created_at * 1000;
    }
    state.lastItemTime = lastItem.timestamp;
    scrollToBottom(false);
};

/**
 * 将一批时间线项目分别保存到 IndexedDB（消息和事件分开存储）
 * @param {Array} items - 新项目数组
 */
const saveItemsToLocal = async (items) => {
    if (!state.currentRoomInfo?.id || items.length === 0) return;

    // 分离消息和事件
    const newMessages = items.filter(item => item.type === ITEM_TYPES.MESSAGE);
    const newEvents = items.filter(item => item.type === ITEM_TYPES.EVENT);

    // 并行处理消息和事件
    await Promise.all([
        saveMessagesToLocal(newMessages),
        saveEventsToLocal(newEvents)
    ]);
};

/**
 * 保存消息到本地
 * @param {Array} newMessages - 新消息数组
 */
const saveMessagesToLocal = async (newMessages) => {
    if (newMessages.length === 0) return;

    const messageKey = getMessageStorageKey();
    const stored = await IndexedDBUtil.getItem(messageKey, { items: [] });
    const existingMessages = stored.items;

    // 合并去重
    const messageMap = new Map();
    existingMessages.forEach(msg => {
        messageMap.set(msg.id, msg);
    });
    newMessages.forEach(msg => {
        if (!messageMap.has(msg.id)) {
            messageMap.set(msg.id, msg);
        }
    });

    // 转换回数组并按时间戳排序
    const mergedMessages = Array.from(messageMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);

    await IndexedDBUtil.setItem(messageKey, { items: mergedMessages });
};

/**
 * 保存事件到本地
 * @param {Array} newEvents - 新事件数组
 */
const saveEventsToLocal = async (newEvents) => {
    if (newEvents.length === 0) return;

    const eventKey = getEventStorageKey();
    const stored = await IndexedDBUtil.getItem(eventKey, { items: [] });
    const existingEvents = stored.items;

    // 合并去重
    const eventMap = new Map();
    existingEvents.forEach(evt => {
        eventMap.set(evt.id, evt);
    });
    newEvents.forEach(evt => {
        if (!eventMap.has(evt.id)) {
            eventMap.set(evt.id, evt);
        }
    });

    // 转换回数组并按时间戳排序
    const mergedEvents = Array.from(eventMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);

    await IndexedDBUtil.setItem(eventKey, { items: mergedEvents });
};

/**
 * 从本地存储中删除指定消息
 * @param {number} messageId
 */
const deleteMessageFromLocal = async (messageId) => {
    const messageKey = getMessageStorageKey();
    const stored = await IndexedDBUtil.getItem(messageKey, { items: [] });
    const filtered = stored.items.filter(msg => msg.id != messageId);
    await IndexedDBUtil.setItem(messageKey, { items: filtered });
};

/**
 * 从本地完全删除一条消息（不发送HTTP请求）
 * @param {number} messageId - 消息ID
 */
const deleteMessageLocally = async (messageId) => {
    // 查找消息元素
    const $messageElement = findMessageById(messageId);
    // 查找时间线项目索引
    const itemIndex = state.timelineItems.findIndex(item =>
        item.type === ITEM_TYPES.MESSAGE && item.id == messageId
    );

    if ($messageElement.length && itemIndex !== -1) {
        // 从DOM移除
        $messageElement.remove();

        // 从时间线数组移除
        state.timelineItems.splice(itemIndex, 1);

        // 从ID集合移除
        const uniqueId = `${ITEM_TYPES.MESSAGE}-${messageId}`;
        state.itemIds.delete(uniqueId);

        // 更新 lastMessageId（如果删除的是最后一条）
        const messages = state.timelineItems.filter(item => item.type === ITEM_TYPES.MESSAGE);
        if (messageId == state.lastMessageId) {
            state.lastMessageId = messages.length > 0 ? Math.max(...messages.map(msg => msg.id)) : 0;
        }

        // 从本地存储删除消息
        await deleteMessageFromLocal(messageId);
    }
};

/**
 * 检查用户是否在底部
 * @returns {boolean} 是否在底部
 */
const isUserAtBottom = () => {
    const $messageList = elements.messageList;
    const scrollTop = $messageList.scrollTop();
    const scrollHeight = $messageList[0].scrollHeight;
    const clientHeight = $messageList[0].clientHeight;

    // 计算距离底部的距离
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    return distanceToBottom <= CONFIG.SCROLL_THRESHOLD;
};

/**
 * 滚动到底部
 * @param {boolean} animated - 是否使用动画
 */
const scrollToBottom = (animated = true) => {
    const $messageList = elements.messageList;
    const container = $messageList[0];
    const scrollHeight = container.scrollHeight;
    if (animated) {
        $messageList.animate({ scrollTop: scrollHeight }, 300);
    } else {
        // 临时禁用 CSS 平滑滚动
        const originalBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        container.scrollTop = scrollHeight;
        container.style.scrollBehavior = originalBehavior;
    }
    state.isUserScrolled = false;
};

/**
 * 检查是否需要自动滚动
 * 条件：用户没有手动滚动或用户已经在底部
 */
const checkAutoScroll = () => {
    // 如果用户没有手动滚动，或者用户在底部附近，则自动滚动
    if (!state.isUserScrolled || isUserAtBottom()) {
        requestAnimationFrame(() => {
            scrollToBottom();
        });
    }
};

/**
 * 生成消息唯一ID
 * @param {number} messageId - 后端消息ID
 * @returns {string} 消息元素ID
 */
const generateMessageElementId = (messageId) => {
    return `msg-${messageId}`;
};

/**
 * 生成事件唯一ID
 * @param {number} eventId - 后端事件ID
 * @returns {string} 事件元素ID
 */
const generateEventElementId = (eventId) => {
    return `event-${eventId}`;
};

/**
 * 查找包含指定消息ID的元素
 * @param {number} messageId - 后端消息ID
 * @returns {jQuery | null} 找到的元素或null
 */
const findMessageById = (messageId) => {
    const elementId = generateMessageElementId(messageId);
    return elements.messageList.find(`[data-msg-id="${elementId}"]`);
};

/**
 * 滚动到指定消息并高亮显示
 * @param {number} messageId - 后端消息ID
 */
const scrollToMessage = (messageId) => {
    const $targetElement = findMessageById(messageId);

    if (!$targetElement.length) {
        mdui.snackbar({ message: '原消息已被撤回或不存在' });
        return;
    }

    // 平滑滚动到消息位置
    const container = elements.messageList[0];
    const targetTop = $targetElement[0].offsetTop - container.clientHeight / 2 + $targetElement[0].clientHeight / 2;

    elements.messageList.animate({
        scrollTop: targetTop
    }, 300);

    // 添加高亮效果
    $targetElement.addClass('msg-highlight');

    // 动画结束后移除高亮类
    setTimeout(() => {
        $targetElement.removeClass('msg-highlight');
    }, CONFIG.HIGHLIGHT_DURATION);
};

/**
 * 判断是否需要显示时间条
 * @param {number} prevTimestamp - 上一条消息的时间戳（秒）
 * @param {number} currentTimestamp - 当前消息的时间戳（秒）
 * @returns {boolean} 是否需要显示时间条
 */
const shouldShowTimeBar = (prevTimestamp, currentTimestamp) => {
    if (!prevTimestamp) return true; // 第一条消息显示时间条

    const timeDiffMinutes = (currentTimestamp - prevTimestamp) / 60;
    return timeDiffMinutes >= CONFIG.TIME_BAR_GAP_MINUTES;
};

/**
 * 创建时间条HTML
 * @param {Object} timeInfo - 时间信息
 * @returns {string} 时间条HTML
 */
const createTimeBarHTML = (timeInfo) => {
    return `
    <div class="time-bar" data-timestamp="${timeInfo.timestamp}">
        <div class="time-bar-text">
            <span class="time-bar-date">${timeInfo.date}</span>
            <span class="time-bar-time">${timeInfo.time}</span>
        </div>
    </div>`;
};

/**
 * 添加时间条到消息列表
 * @param {Object} timeInfo - 时间信息
 */
const appendTimeBar = (timeInfo) => {
    const $timeBarElement = $(createTimeBarHTML(timeInfo));
    elements.messageList.append($timeBarElement);
};

/**
 * 处理文件卡片消息
 * @param {Object} fileData - 文件数据
 * @returns {string} 文件卡片HTML
 */
const createFileCardHTML = (fileData) => {
    if (!fileData) return '';

    const fileSizeMB = (fileData.file_size / (1024 * 1024)).toFixed(2);
    const fileType = fileData.file_type || 'file';
    const fileName = fileData.filename || '未命名文件';

    return `
    <div class="file-card">
        <div class="file-icon">
            <i class="material-icons">${fileType === 'image' ? 'image' : 'insert_drive_file'}</i>
        </div>
        <div class="file-info">
            <div class="file-name">${fileName}</div>
            <div class="file-meta">
                <span class="file-size">${fileSizeMB} MB</span>
                <span class="file-type">${fileData.mime_type || '未知类型'}</span>
            </div>
        </div>
        <a href="${fileData.download_url || '#'}" class="download-btn" target="_blank" download>
            <i class="material-icons">download</i>
        </a>
    </div>`;
};

/**
 * 处理转发卡片消息
 * @param {Object} forwardData - 转发数据
 * @returns {string} 转发卡片HTML
 */
const createForwardCardHTML = (forwardData) => {
    if (!forwardData || !forwardData.messages || forwardData.messages.length === 0) {
        return '<div class="forward-card">转发消息加载失败</div>';
    }

    const messages = forwardData.messages;
    const count = forwardData.count || messages.length;

    let messagesHTML = '';
    messages.forEach((msg, index) => {
        let contentHTML = '';
        switch (msg.message_type) {
            case MESSAGE_TYPES.TEXT:
            case MESSAGE_TYPES.MARKDOWN:
                contentHTML = msg.content || '';
                break;
            case MESSAGE_TYPES.CARD_FILE:
                const fileData = typeof msg.content === 'object' ? msg.content : {};
                contentHTML = `[文件] ${fileData.filename || '未命名文件'}`;
                break;
            default:
                contentHTML = '[不支持的消息类型]';
        }

        // 只显示前3条消息
        if (index < 3) {
            messagesHTML += `
            <div class="forward-message-item">
                <div class="forward-message-sender">${msg.nickname || '未知用户'}</div>
                <div class="forward-message-content">${contentHTML}</div>
            </div>`;
        }
    });

    // 如果超过3条消息，显示"点击查看更多"
    if (count > 3) {
        messagesHTML += `
        <div class="forward-message-more" style="cursor: pointer;">
            还有 ${count - 3} 条消息，点击查看全部...
        </div>`;
    }

    // 将 forwardData 保存为 data 属性，用于点击事件
    return `
    <div class="forward-card" style="cursor: pointer;" data-forward-data='${escapeHTML(JSON.stringify(forwardData))}'>
        <div class="forward-card-header">
            <span>合并转发 (${count}条)</span>
        </div>
        <div class="forward-card-content">
            ${messagesHTML}
        </div>
    </div>`;
};

/**
 * 打开详细转发记录弹窗
 * @param {Object} forwardData - 转发数据
 */
const openNestedForwardDialog = (forwardData) => {
    if (!forwardData || !forwardData.messages || forwardData.messages.length === 0) {
        return;
    }

    const messages = forwardData.messages;
    const count = forwardData.count || messages.length;

    let contentHTML = '';
    messages.forEach((msg) => {
        // 处理消息内容，支持嵌套转发
        const messageContent = renderForwardMessageContent(msg, 0);

        // 格式化时间
        let timeText = '';
        if (msg.created_at) {
            // 检查是秒级时间戳还是毫秒级时间戳
            let timestamp = msg.created_at;
            // 如果是毫秒级时间戳，转换为秒级
            if (timestamp > 10000000000) {
                timestamp = Math.floor(timestamp / 1000);
            }
            // 使用formatTime函数来格式化时间
            timeText = formatTime(timestamp, { format: 'fullDateTime' });
        }

        contentHTML += `
        <div class="detail-forward-item" style="padding: 12px; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: rgb(var(--mdui-color-surface-container-high)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
                    ${msg.avatar_url ? `<img src="${msg.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">` : `<mdui-icon style="font-size: 18px;">person</mdui-icon>`}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 14px;">${msg.nickname || '未知用户'}</div>
                    <div style="font-size: 12px; color: rgb(var(--mdui-color-on-surface-variant));">${timeText}</div>
                </div>
            </div>
            <div style="padding-left: 48px; font-size: 14px; color: rgb(var(--mdui-color-on-surface)); line-height: 1.5;">
                ${messageContent}
            </div>
        </div>`;
    });

    elements.nestedForwardContent.html(contentHTML);
    elements.nestedForwardDialog.prop('open', true);
    
    // 绑定嵌套转发消息的点击事件
    elements.nestedForwardContent.find('.nested-forward-card').off('click').on('click', function(event) {
        event.stopPropagation();
        const nestedData = $(this).attr('data-nested-data');
        if (nestedData) {
            try {
                const data = JSON.parse(nestedData);
                // 将当前转发数据推入堆栈
                state.nestedForwardStack.push(forwardData);
                // 关闭当前弹窗
                elements.nestedForwardDialog.prop('open', false);
                // 打开新的弹窗
                setTimeout(() => {
                    openNestedForwardDialog(data);
                }, 300); // 等待动画完成
            } catch (e) {
                console.error('解析嵌套转发数据失败:', e);
            }
        }
    });
};

/**
 * 处理消息内容，支持嵌套转发（点击打开新弹窗）
 */
const renderForwardMessageContent = (msg, depth = 0) => {
    // 防止无限递归，最多嵌套10层
    if (depth > 10) {
        return '<div style="color: rgb(var(--mdui-color-on-surface-variant)); font-style: italic;">嵌套转发过多，无法显示</div>';
    }
    
    let messageContent = '';
    
    switch (msg.message_type) {
        case MESSAGE_TYPES.TEXT:
        case MESSAGE_TYPES.MARKDOWN:
            messageContent = msg.content || '';
            break;
        case MESSAGE_TYPES.CARD_FILE:
            const fileData = typeof msg.content === 'object' ? msg.content : {};
            messageContent = `[文件] ${fileData.filename || '未命名文件'}`;
            break;
        case MESSAGE_TYPES.CARD_FORWARD:
            // 处理嵌套的转发消息，使用可点击的卡片样式
            let nestedData = msg.content;
            if (typeof nestedData === 'string') {
                try {
                    nestedData = JSON.parse(nestedData);
                } catch (e) {
                    nestedData = null;
                }
            }
            
            if (nestedData && nestedData.messages && nestedData.messages.length > 0) {
                const nestedCount = nestedData.count || nestedData.messages.length;
                
                // 将嵌套数据保存为 data 属性
                const escapedData = escapeHTML(JSON.stringify(nestedData));
                
                messageContent = `
                <div class="nested-forward-card" style="padding: 12px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; cursor: pointer; background: rgba(var(--mdui-color-primary), 0.05); transition: background-color 0.2s;" data-nested-data='${escapedData}'>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1;">
                            <div style="font-size: 13px; font-weight: 500; color: rgb(var(--mdui-color-on-surface));">合并转发 ${nestedCount} 条消息</div>
                            <div style="font-size: 12px; color: rgb(var(--mdui-color-on-surface-variant)); margin-top: 2px;">点击查看详情</div>
                        </div>
                        <mdui-icon style="font-size: 18px; color: rgb(var(--mdui-color-on-surface-variant));">open_in_new</mdui-icon>
                    </div>
                </div>`;
            } else {
                messageContent = '[转发消息加载失败]';
            }
            break;
        default:
            messageContent = '[不支持的消息类型]';
    }
    
    return messageContent;
};

const openForwardDetailDialog = (forwardData) => {
    if (!forwardData || !forwardData.messages || forwardData.messages.length === 0) {
        return;
    }

    const messages = forwardData.messages;
    const count = forwardData.count || messages.length;

    let contentHTML = '';
    messages.forEach((msg) => {
        // 处理消息内容，支持嵌套转发
        const messageContent = renderForwardMessageContent(msg, 0);

        // 格式化时间
        let timeText = '';
        if (msg.created_at) {
            // 检查是秒级时间戳还是毫秒级时间戳
            let timestamp = msg.created_at;
            // 如果是毫秒级时间戳，转换为秒级
            if (timestamp > 10000000000) {
                timestamp = Math.floor(timestamp / 1000);
            }
            // 使用formatTime函数来格式化时间
            timeText = formatTime(timestamp, { format: 'fullDateTime' });
        }

        contentHTML += `
        <div class="detail-forward-item" style="padding: 12px; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: rgb(var(--mdui-color-surface-container-high)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
                    ${msg.avatar_url ? `<img src="${msg.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">` : `<mdui-icon style="font-size: 18px;">person</mdui-icon>`}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 14px;">${msg.nickname || '未知用户'}</div>
                    <div style="font-size: 12px; color: rgb(var(--mdui-color-on-surface-variant));">${timeText}</div>
                </div>
            </div>
            <div style="padding-left: 48px; font-size: 14px; color: rgb(var(--mdui-color-on-surface)); line-height: 1.5;">
                ${messageContent}
            </div>
        </div>`;
    });

    elements.forwardDetailContent.html(contentHTML);
    elements.forwardDetailDialog.prop('open', true);
    
    // 绑定嵌套转发卡片的点击事件
    elements.forwardDetailContent.find('.nested-forward-card').off('click').on('click', function(event) {
        event.stopPropagation();
        const nestedData = $(this).attr('data-nested-data');
        if (nestedData) {
            try {
                const data = JSON.parse(nestedData);
                openNestedForwardDialog(data);
            } catch (e) {
                console.error('解析嵌套转发数据失败:', e);
            }
        }
    });
};

/**
 * 创建消息气泡HTML
 * @param {Object} message - 消息对象
 * @returns {string} HTML字符串
 */
const createMessageBubbleHTML = (message) => {
    const { content, message_type, reply_to } = message;
    if (message_type === MESSAGE_TYPES.DELETED) return;
    let messageHTML = '';

    // 处理引用
    let quoteHTML = '';
    if (reply_to) {
        const repliedMessage = state.timelineItems.find(item =>
            item.type === ITEM_TYPES.MESSAGE && item.id === reply_to
        );
        if (repliedMessage) {
            const senderName = repliedMessage.user_id === CONFIG.ME_USER_ID ? '我' : repliedMessage.nickname;
            const repliedContent = repliedMessage.message_type === MESSAGE_TYPES.DELETED ?
                '[消息已被删除]' :
                (repliedMessage.content || '');

            quoteHTML = `
            <div class="quote-content" data-target-msg-id="${generateMessageElementId(reply_to)}">
                <b>${senderName}:</b> ${parseEmojiInMessage(repliedContent)}
            </div>`;
        }
    }

    // 根据消息类型处理内容
    switch (message_type) {
        case MESSAGE_TYPES.TEXT:
            messageHTML = `<div class="text-body">${parseEmojiInMessage(content)}</div>`;
            break;

        case MESSAGE_TYPES.MARKDOWN:
            // 对于 Markdown，先解析表情再解析 Markdown
            const parsedContent = parseEmojiInMessage(content || '');
            messageHTML = `<div class="text-body markdown-content mdui-prose">${marked.parse(parsedContent)}</div>`;
            break;

        case MESSAGE_TYPES.CARD_FILE:
            messageHTML = createFileCardHTML(typeof content === 'object' ? content : {});
            break;

        case MESSAGE_TYPES.CARD_FORWARD:
            messageHTML = createForwardCardHTML(typeof content === 'object' ? content : (typeof content === 'string' ? JSON.parse(content) : {}));
            break;

        default:
            messageHTML = `<div class="text-body unknown-type">[不支持的消息类型: ${message_type}]</div>`;
    }

    return `
    <div class="message-bubble">
        ${quoteHTML}
        ${messageHTML}
    </div>`;
};

/**
 * 创建事件消息HTML
 * @param {Object} event - 事件对象
 * @returns {string} HTML字符串
 */
const createEventMessageHTML = (event) => {
    const { event_type, description, nickname, created_at } = event;

    if (event_type === EVENT_TYPES.ROOM_UPDATE) return;

    // 根据事件类型生成显示文本
    const getEventDisplayText = () => {
        switch (event_type) {
            case EVENT_TYPES.MESSAGE_DELETE:
                return `${nickname} 撤回了一条消息`;
            case EVENT_TYPES.USER_JOIN:
                return `${nickname} 加入了聊天室`;
            case EVENT_TYPES.USER_LEAVE:
                return `${nickname} 离开了聊天室`;
            case EVENT_TYPES.USER_KICK:
                return `${nickname} 被移出聊天室`;
            case EVENT_TYPES.MESSAGE_CREATE:
                return `${nickname} ${description}`;
            default:
                return description || '未知事件';
        }
    };

    const displayText = getEventDisplayText();

    return `
    <div class="event-message" data-event-id="${event.id}" data-event-type="${event.event_type}"}">
        <div class="event-content">
            <span class="event-text">${displayText}</span>
        </div>
    </div>`;
};

/**
 * 处理消息右键菜单
 * @param {jQuery} $messageRow - 消息行元素
 * @param {Event} event - 事件对象
 */
const handleMessageContextMenu = ($messageRow, event) => {
    event.preventDefault();
    event.stopPropagation();

    const { clientX, clientY } = event.touches ?
        event.touches[0] : event;

    state.activeMsgRow = $messageRow;

    // 根据发送者显示/隐藏撤回选项
    const $deleteOption = elements.msgMenu.find('[data-action="message.delect"]');
    const messageId = $messageRow.attr('data-msg-id');
    const originalId = messageId.replace('msg-', '');
    const message = state.timelineItems.find(item =>
        item.type === ITEM_TYPES.MESSAGE && item.id == originalId
    );

    if (message) {
        const isMe = message.user_id === CONFIG.ME_USER_ID;
        const isDeleted = message.message_type === MESSAGE_TYPES.DELETED;
        $deleteOption.css('display', (isMe && !isDeleted) ? 'flex' : 'none');
    } else {
        $deleteOption.css('display', 'none');
    }

    // 定位菜单，确保在屏幕可见区域内
    const menuWidth = 150;
    const menuHeight = 360;
    
    // 计算菜单位置，确保不超出屏幕
    let menuLeft = clientX;
    let menuTop = clientY;
    
    // 调整水平位置
    if (menuLeft + menuWidth > window.innerWidth) {
        menuLeft = window.innerWidth - menuWidth;
    }
    
    // 调整垂直位置
    if (menuTop + menuHeight > window.innerHeight) {
        menuTop = window.innerHeight - menuHeight;
    }
    
    // 确保位置不小于0
    menuLeft = Math.max(0, menuLeft);
    menuTop = Math.max(0, menuTop);
    
    elements.msgMenu.css({
        display: 'block',
        position: 'fixed',
        left: menuLeft + 'px',
        top: menuTop + 'px'
    });
};

/**
 * 为消息元素绑定事件监听器
 * @param {jQuery} $messageRow - 消息行元素
 * @param {Object} message - 消息对象
 */
const bindMessageEvents = ($messageRow, message) => {
    // 引用点击事件
    const $quoteElement = $messageRow.find('.quote-content');
    if ($quoteElement.length && message.reply_to) {
        $quoteElement.on('click', (event) => {
            event.stopPropagation();
            scrollToMessage(message.reply_to);
        });
    }

    // 消息点击事件，用于切换选中状态
    $messageRow.on('click', (event) => {
        // 如果点击的是引用内容，不处理选中状态
        if ($(event.target).closest('.quote-content').length) {
            return;
        }

        // 如果点击的是转发卡片，打开详细弹窗
        const $forwardCard = $(event.target).closest('.forward-card');
        if ($forwardCard.length && !state.isSelectMode) {
            event.stopPropagation();
            const forwardData = $forwardCard.attr('data-forward-data');
            if (forwardData) {
                try {
                    const data = JSON.parse(forwardData);
                    openForwardDetailDialog(data);
                } catch (e) {
                    console.error('解析转发数据失败:', e);
                }
            }
            return;
        }

        // 只有在多选模式下才处理选中状态
        if (state.isSelectMode) {
            // 切换选中状态
            if (state.selectedMessages.has(message.id)) {
                state.selectedMessages.delete(message.id);
                $messageRow.removeClass('selected');
            } else {
                state.selectedMessages.add(message.id);
                $messageRow.addClass('selected');
            }

            // 更新选中计数
            updateSelectedCount();
        }
    });

    // 右键菜单事件
    const $bubbleElement = $messageRow.find('.message-bubble');
    if ($bubbleElement.length) {
        $bubbleElement.on('contextmenu', (event) => {
            handleMessageContextMenu($messageRow, event);
        });
    }

    // 双击消息快速回复
    $bubbleElement.on('dblclick', (event) => {
        event.stopPropagation();
        if (message.message_type !== MESSAGE_TYPES.DELETED) {
            state.replyingTo = message;
            updateReplyPreview(message);
            elements.chatInput.trigger('focus');
        }
    });
};

/**
 * 更新回复预览
 * @param {Object} message - 被回复的消息对象
 */
const updateReplyPreview = (message) => {
    if (!message) {
        elements.replyPreview.hide();
        return;
    }

    const isMe = message.user_id === CONFIG.ME_USER_ID;
    const senderName = isMe ? '我' : (message.nickname || '对方');

    // 根据消息类型获取预览内容
    let previewContent = '';
    switch (message.message_type) {
        case MESSAGE_TYPES.TEXT:
        case MESSAGE_TYPES.MARKDOWN:
            previewContent = message.content || '';
            break;
        case MESSAGE_TYPES.CARD_FILE:
            const fileData = typeof message.content === 'object' ? message.content : {};
            previewContent = `[文件] ${fileData.filename || '未命名文件'}`;
            break;
        case MESSAGE_TYPES.DELETED:
            previewContent = '[消息已被删除]';
            break;
        default:
            previewContent = '[不支持的消息类型]';
    }

    // 截断过长的预览内容
    if (previewContent.length > 50) {
        previewContent = previewContent.substring(0, 47) + '...';
    }

    elements.replyTitle.text(`回复给：${senderName}`);
    elements.replyBody.text(previewContent);
    elements.replyPreview.css('display', 'flex');
};

/**
 * 检查时间线项目是否已存在
 * @param {number} id - 项目ID
 * @param {string} type - 项目类型（message/event）
 * @returns {boolean} 是否已存在
 */
const isItemExists = (id, type) => {
    const uniqueId = `${type}-${id}`;
    return state.itemIds.has(uniqueId);
};

/**
 * 过滤重复的时间线项目
 * @param {Array} messages - 消息数组
 * @param {Array} events - 事件数组
 * @returns {Object} 过滤后的消息和事件
 */
const filterDuplicateItems = (messages, events) => {
    const uniqueMessages = [];
    const uniqueEvents = [];

    // 过滤重复消息
    messages.forEach(message => {
        if (!isItemExists(message.id, ITEM_TYPES.MESSAGE)) {
            uniqueMessages.push(message);
        }
    });

    // 过滤重复事件
    events.forEach(event => {
        if (!isItemExists(event.id, ITEM_TYPES.EVENT)) {
            uniqueEvents.push(event);
        }
    });

    return {
        messages: uniqueMessages,
        events: uniqueEvents
    };
};

/**
 * 为消息或事件添加唯一ID到集合
 * @param {Object} item - 消息或事件对象
 * @param {string} type - 项目类型
 */
const addItemToIdSet = (item, type) => {
    const uniqueId = `${type}-${item.id}`;
    state.itemIds.add(uniqueId);

    // 如果是消息，更新最后一条消息ID
    if (type === ITEM_TYPES.MESSAGE && item.id > state.lastMessageId) {
        state.lastMessageId = item.id;
    }
};

/**
 * 转换消息为时间线项目
 * @param {Object} message - 消息对象
 * @returns {Object} 时间线项目
 */
const convertMessageToTimelineItem = (message) => {
    return {
        ...message,
        type: ITEM_TYPES.MESSAGE,
        timestamp: message.created_at
    };
};

/**
 * 转换事件为时间线项目
 * @param {Object} event - 事件对象
 * @returns {Object} 时间线项目
 */
const convertEventToTimelineItem = (event) => {
    return {
        ...event,
        type: ITEM_TYPES.EVENT,
        timestamp: event.created_at
    };
};

/**
 * 添加消息到时间线
 * @param {Object} message - 消息对象
 */
const appendMessageToTimeline = (message) => {
    const { id, user_id, created_at, nickname, avatar_url, message_type } = message;
    const currentTime = created_at * 1000; // 转换为毫秒
    const isMe = user_id === CONFIG.ME_USER_ID;
    const elementId = generateMessageElementId(id);
    const displayName = isMe ? '我' : nickname;

    // 如果是删除的消息，不添加到DOM中，但仍然添加到时间线项目
    if (message_type === MESSAGE_TYPES.DELETED) {
        // 但仍然更新状态和ID集合
        const item = convertMessageToTimelineItem(message);
        state.timelineItems.push(item);
        addItemToIdSet(message, ITEM_TYPES.MESSAGE);
        return created_at;
    }

    // 判断是否为紧凑布局
    const isCompact = (user_id === state.lastSenderId) &&
        (currentTime - state.lastMsgTime < CONFIG.COMPACT_TIME_LIMIT);

    // 创建消息行元素
    const isSelected = state.selectedMessages.has(message.id);
    const $messageRow = $('<div>')
        .attr('data-msg-id', elementId)
        .attr('data-message-id', message.id)
        .addClass(`message-row ${isMe ? 'sent' : 'received'} ${isCompact ? 'compact' : ''} ${isSelected ? 'selected' : ''}`);

    // 头像或占位符
    const avatarHTML = !isCompact ?
        `<mdui-avatar src="${avatar_url}"></mdui-avatar>` :
        '<div class="avatar-spacer"></div>';

    // 只有在非紧凑模式下才显示昵称
    const nicknameHTML = !isCompact ?
        `<div class="message-nickname">${displayName}</div>` :
        '';

    // 设置消息内容
    $messageRow.html(`
        ${avatarHTML}
        <div class="message-content-container">
            ${nicknameHTML}
            ${createMessageBubbleHTML(message)}
        </div>
    `);

    // 绑定事件
    bindMessageEvents($messageRow, message);

    // 添加到列表
    elements.messageList.append($messageRow);

    // 更新状态
    state.lastSenderId = user_id;
    state.lastMsgTime = currentTime;

    // 添加到时间线项目和ID集合
    const item = convertMessageToTimelineItem(message);
    state.timelineItems.push(item);
    addItemToIdSet(message, ITEM_TYPES.MESSAGE);

    return created_at;
};

/**
 * 添加事件到时间线
 * @param {Object} event - 事件对象
 */
const appendEventToTimeline = (event) => {
    const { created_at } = event;

    const $eventElement = $(createEventMessageHTML(event));

    elements.messageList.append($eventElement);

    // 添加到时间线项目和ID集合
    const item = convertEventToTimelineItem(event);
    state.timelineItems.push(item);
    addItemToIdSet(event, ITEM_TYPES.EVENT);

    return created_at;
};

/**
 * 添加时间线项目（统一处理消息和事件）
 * @param {Array} items - 时间线项目数组
 * @param {Object} options - 附加选项
 * @param {boolean} options.autoScroll - 是否在批量追加后检查自动滚动
 */
const appendTimelineItems = (items, options = {}) => {
    const { autoScroll = true } = options;
    let lastTimestamp = state.lastItemTime;

    items.forEach(item => {
        // 判断是否需要显示时间条
        if (shouldShowTimeBar(lastTimestamp, item.timestamp)) {
            const timeInfo = formatTime(item.timestamp);
            appendTimeBar(timeInfo);
        }

        if (item.type === ITEM_TYPES.MESSAGE) {
            lastTimestamp = appendMessageToTimeline(item);
        } else if (item.type === ITEM_TYPES.EVENT) {
            lastTimestamp = appendEventToTimeline(item);
        }
    });

    state.lastItemTime = lastTimestamp;

    // 保存到 IndexedDB（异步，不阻塞）- 消息和事件分开存储
    saveItemsToLocal(items).catch(err => console.error('保存消息到 IndexedDB 失败:', err));

    if (autoScroll && items.length > 0) {
        requestAnimationFrame(() => {
            checkAutoScroll();
        });
    }
};

/**
 * 处理消息删除
 * @param {number} messageId - 被删除的消息ID
 */
const handleMessageDelete = async (messageId) => {
    try {
        // 先执行本地删除
        await deleteMessageLocally(messageId);

        // 再发送HTTP请求通知服务器
        await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/chat/delete`,
            {
                room_id: state.currentRoomInfo.id,
                message_id: messageId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
    } catch (error) {
        console.error('撤回消息失败:', error);
        mdui.snackbar({ message: '撤回失败，请重试', placement: 'top' });
    }
};

/**
 * 获取消息元素对应的消息对象
 * @param {jQuery} $messageElement - 消息元素
 * @returns {Object | null} 消息对象
 */
const getMessageFromElement = ($messageElement) => {
    const messageId = $messageElement.attr('data-msg-id');
    if (!messageId) return null;

    const originalId = messageId.replace('msg-', '');
    return state.timelineItems.find(item =>
        item.type === ITEM_TYPES.MESSAGE && item.id == originalId
    );
};

/**
 * 处理菜单项点击
 * @param {Event} event - 点击事件
 */
const handleMenuAction = (event) => {
    const $menuItem = $(event.target).closest('mdui-menu-item');
    if (!$menuItem.length || !state.activeMsgRow) return;

    const action = $menuItem.attr('data-action');
    const message = getMessageFromElement(state.activeMsgRow);

    if (!message) return;

    switch (action) {
        case 'message.reply':
            // 存储完整的消息对象
            state.replyingTo = message;
            // 更新回复预览
            updateReplyPreview(message);
            elements.chatInput.trigger('focus');
            break;

        case 'message.copy':
            const textToCopy = message.content || '';
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    mdui.snackbar({
                        message: '已复制',
                        placement: 'top'
                    });
                })
                .catch(() => {
                    mdui.snackbar({
                        message: '复制失败，请手动复制',
                        placement: 'top'
                    });
                });
            break;

        case 'message.delect':
            if (message.user_id === CONFIG.ME_USER_ID && message.message_type !== MESSAGE_TYPES.DELETED) {
                handleMessageDelete(message.id);
            }
            break;

        case 'message.forward':
            // 存储要转发的消息
            state.forwardingMessage = message;
            // 打开转发对话框
            openForwardDialog();
            break;

        case 'message.enter_select_mode':
            // 进入多选模式
            enterSelectMode();
            break;
    }

    elements.msgMenu.hide();
};

/**
 * 取消回复
 */
const cancelReply = () => {
    state.replyingTo = null;
    elements.replyPreview.hide();
    elements.chatInput.trigger('focus');
};

/**
 * 打开转发对话框
 */
const openForwardDialog = async () => {
    const message = state.forwardingMessage;
    if (!message) return;

    // 清空之前的选中状态
    state.selectedMessagesForForward = [];

    // 显示对话框和加载状态
    elements.forwardDialog.prop('open', true);
    elements.forwardLoading.show();
    elements.forwardContent.hide();

    try {
        // 加载用户的聊天室列表
        const result = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/my`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            }
        });

        const rooms = result.data?.rooms || [];

        // 填充聊天室列表
        const roomList = elements.forwardContent.find('#forwardRoomList');
        roomList.empty();

        rooms.forEach(room => {
            // 排除当前聊天室
            if (room.id !== state.currentRoomInfo.id) {
                const roomItem = $(`
                    <div class="forward-room-item" data-room-id="${room.id}" style="padding: 12px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background-color 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgb(var(--mdui-color-surface-container-high)); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${room.avatar_url ? `<img src="${room.avatar_url}" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;">` : '<mdui-icon>meeting_room</mdui-icon>'}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${room.name}</div>
                                <div style="font-size: 12px; color: rgb(var(--mdui-color-on-surface-variant));">在线 ${room.online_users || 0}</div>
                            </div>
                        </div>
                    </div>
                `);

                // 添加点击事件
                roomItem.on('click', function() {
                    // 移除其他房间的选中状态
                    roomList.find('.forward-room-item').removeClass('selected');
                    // 添加当前房间的选中状态
                    $(this).addClass('selected');
                    // 存储选中的目标聊天室ID
                    state.selectedTargetRoomId = parseInt($(this).attr('data-room-id'));
                });

                roomList.append(roomItem);
            }
        });

        // 填充转发预览
        let previewContent = '';
        switch (message.message_type) {
            case MESSAGE_TYPES.TEXT:
            case MESSAGE_TYPES.MARKDOWN:
                previewContent = message.content || '';
                break;
            case MESSAGE_TYPES.CARD_FILE:
                const fileData = typeof message.content === 'object' ? message.content : {};
                previewContent = `[文件] ${fileData.filename || '未命名文件'}`;
                break;
            case MESSAGE_TYPES.DELETED:
                previewContent = '[消息已被删除]';
                break;
            default:
                previewContent = '[不支持的消息类型]';
        }

        const senderName = message.user_id === CONFIG.ME_USER_ID ? '我' : (message.nickname || '对方');
        elements.forwardPreviewContent.html(`
            <div class="forward-message-item" style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px; color: rgb(var(--mdui-color-on-surface-variant));">${senderName}</div>
                <div style="font-size: 14px; color: rgb(var(--mdui-color-on-surface));">${previewContent}</div>
            </div>
        `);

        // 显示内容，隐藏加载
        elements.forwardLoading.hide();
        elements.forwardContent.show();
        
        // 重置选中的目标聊天室ID
        state.selectedTargetRoomId = null;

    } catch (error) {
        console.error('加载聊天室列表失败:', error);
        mdui.snackbar({ message: '加载聊天室列表失败' });
        elements.forwardDialog.prop('open', false);
    }
};

/**
 * 处理消息转发
 */
const handleForwardMessage = async () => {
    const message = state.forwardingMessage;
    const selectedMessageIds = state.selectedMessagesForForward;
    
    // 检查是否有消息要转发
    if (!message && selectedMessageIds.length === 0) {
        mdui.snackbar({ message: '没有要转发的消息' });
        return;
    }
    
    const targetRoomId = state.selectedTargetRoomId;
    
    if (!targetRoomId) {
        mdui.snackbar({ message: '请选择目标聊天室' });
        return;
    }
    
    try {
        // 确定要转发的消息ID
        const messageIds = selectedMessageIds.length > 0 ? selectedMessageIds : [message.id];
        
        // 发送转发请求，默认使用合并转发模式
        await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/chat/forward`,
            {
                room_id: state.currentRoomInfo.id,
                target_room_id: targetRoomId,
                message_ids: messageIds,
                mode: 'merged'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        mdui.snackbar({ message: '转发成功', placement: 'top' });
        elements.forwardDialog.prop('open', false);
        
        // 清空选中状态并退出多选模式
        state.selectedMessages.clear();
        state.selectedMessagesForForward = [];
        state.selectedTargetRoomId = null;
        updateMessageSelectionUI();
        
        // 如果处于多选模式，退出多选模式
        if (state.isSelectMode) {
            exitSelectMode();
        }
        
    } catch (error) {
        console.error('转发消息失败:', error);
        mdui.snackbar({ message: '转发失败，请重试', placement: 'top' });
    }
};

/**
 * 选择所有消息
 */
const selectAllMessages = () => {
    // 清空当前选中状态
    state.selectedMessages.clear();

    // 选择所有消息
    state.timelineItems.forEach(item => {
        if (item.type === ITEM_TYPES.MESSAGE && item.message_type !== MESSAGE_TYPES.DELETED) {
            state.selectedMessages.add(item.id);
        }
    });

    // 更新UI
    updateMessageSelectionUI();
};

/**
 * 取消选择所有消息
 */
const deselectAllMessages = () => {
    // 清空选中状态
    state.selectedMessages.clear();

    // 更新UI
    updateMessageSelectionUI();
};

/**
 * 进入多选模式
 */
const enterSelectMode = () => {
    // 设置为多选模式
    state.isSelectMode = true;

    // 显示多选模式UI
    elements.multiSelectToolbar[0].hide = false;

    // 更新选中计数
    updateSelectedCount();

    // 禁用消息的双击回复功能，避免与选择冲突
    // 实际实现中，我们会在消息点击事件中检查是否处于多选模式
};

/**
 * 退出多选模式
 */
const exitSelectMode = () => {
    // 退出多选模式
    state.isSelectMode = false;

    // 隐藏多选模式UI
    elements.multiSelectToolbar[0].hide = true;

    // 清空选中状态
    state.selectedMessages.clear();
    state.selectedMessagesForForward = [];
    updateMessageSelectionUI();
};

/**
 * 更新选中消息计数
 */
const updateSelectedCount = () => {
    elements.selectedCount.text(state.selectedMessages.size);
};

/**
 * 转发选中的消息
 */
const forwardSelectedMessages = () => {
    const selectedIds = Array.from(state.selectedMessages);

    if (selectedIds.length === 0) {
        mdui.snackbar({ message: '请先选择要转发的消息' });
        return;
    }

    // 打开转发对话框，处理多个消息
    openForwardDialogForMultiple(selectedIds);
};

/**
 * 处理多选模式下的逐条转发
 */
const handleForwardSingle = () => {
    const selectedIds = Array.from(state.selectedMessages);

    if (selectedIds.length === 0) {
        mdui.snackbar({ message: '请先选择要转发的消息' });
        return;
    }

    // 打开转发对话框，设置转发模式为逐条转发
    openForwardDialogForMultiple(selectedIds, 'single');
};

/**
 * 处理多选模式下的合并转发
 */
const handleForwardMerged = () => {
    const selectedIds = Array.from(state.selectedMessages);

    if (selectedIds.length === 0) {
        mdui.snackbar({ message: '请先选择要转发的消息' });
        return;
    }

    // 打开转发对话框，设置转发模式为合并转发
    openForwardDialogForMultiple(selectedIds, 'merged');
};

/**
 * 更新消息选择状态的UI
 */
const updateMessageSelectionUI = () => {
    // 遍历所有消息元素，更新选中状态
    elements.messageList.find('.message-row').each((index, element) => {
        const $element = $(element);
        const messageId = parseInt($element.attr('data-message-id'));

        if (state.selectedMessages.has(messageId)) {
            $element.addClass('selected');
        } else {
            $element.removeClass('selected');
        }
    });
};

/**
 * 打开转发对话框，处理多个消息
 */
const openForwardDialogForMultiple = async (messageIds, mode = 'single') => {
    // 显示对话框和加载状态
    elements.forwardDialog.prop('open', true);
    elements.forwardLoading.show();
    elements.forwardContent.hide();
    
    try {
        // 加载用户的聊天室列表
        const result = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/my`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            }
        });
        
        const rooms = result.data?.rooms || [];
        
        // 填充聊天室列表
        const roomList = elements.forwardContent.find('#forwardRoomList');
        roomList.empty();
        
        rooms.forEach(room => {
            // 排除当前聊天室
            if (room.id !== state.currentRoomInfo.id) {
                const roomItem = $(`
                    <div class="forward-room-item" data-room-id="${room.id}" style="padding: 12px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background-color 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgb(var(--mdui-color-surface-container-high)); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${room.avatar_url ? `<img src="${room.avatar_url}" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;">` : '<mdui-icon>meeting_room</mdui-icon>'}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${room.name}</div>
                                <div style="font-size: 12px; color: rgb(var(--mdui-color-on-surface-variant));">在线 ${room.online_users || 0}</div>
                            </div>
                        </div>
                    </div>
                `);
                
                // 添加点击事件
                roomItem.on('click', function() {
                    // 移除其他房间的选中状态
                    roomList.find('.forward-room-item').removeClass('selected');
                    // 添加当前房间的选中状态
                    $(this).addClass('selected');
                    // 存储选中的目标聊天室ID
                    state.selectedTargetRoomId = parseInt($(this).attr('data-room-id'));
                });
                
                roomList.append(roomItem);
            }
        });
        
        // 填充转发预览
        let previewContent = '';
        const selectedMessages = state.timelineItems.filter(item => 
            item.type === ITEM_TYPES.MESSAGE && messageIds.includes(item.id)
        );
        
        selectedMessages.forEach((msg, index) => {
            let contentHTML = '';
            switch (msg.message_type) {
                case MESSAGE_TYPES.TEXT:
                case MESSAGE_TYPES.MARKDOWN:
                    contentHTML = msg.content || '';
                    break;
                case MESSAGE_TYPES.CARD_FILE:
                    const fileData = typeof msg.content === 'object' ? msg.content : {};
                    contentHTML = `[文件] ${fileData.filename || '未命名文件'}`;
                    break;
                default:
                    contentHTML = '[不支持的消息类型]';
            }
            
            // 限制显示的消息数量
            if (index < 5) {
                const senderName = msg.user_id === CONFIG.ME_USER_ID ? '我' : (msg.nickname || '对方');
                previewContent += `
                <div class="forward-message-item" style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px; color: rgb(var(--mdui-color-on-surface-variant));">${senderName}</div>
                    <div style="font-size: 14px; color: rgb(var(--mdui-color-on-surface));">${contentHTML}</div>
                </div>`;
            } else if (index === 5) {
                previewContent += `
                <div style="padding: 8px; text-align: center; font-size: 12px; color: rgb(var(--mdui-color-on-surface-variant)); font-style: italic;">
                    还有 ${selectedMessages.length - 5} 条消息...
                </div>`;
            }
        });
        
        elements.forwardPreviewContent.html(previewContent);
        
        // 显示内容，隐藏加载
        elements.forwardLoading.hide();
        elements.forwardContent.show();
        
        // 存储选中的消息ID，供转发时使用
        state.selectedMessagesForForward = messageIds;
        // 重置选中的目标聊天室ID
        state.selectedTargetRoomId = null;
        
    } catch (error) {
        console.error('加载聊天室列表失败:', error);
        mdui.snackbar({ message: '加载聊天室列表失败' });
        elements.forwardDialog.prop('open', false);
    }
};

/**
 * 切换底部应用栏显示/隐藏
 */
const toggleActionBar = () => {
    const actionBar = elements.actionBar[0];
    actionBar.hide = !actionBar.hide;
    // 同时关闭表情面板
    elements.emojiPanel.css('display', 'none');
};

/**
 * 打开文件管理对话框
 */
const openFileManagerDialog = async () => {
    elements.fileManagerDialog.prop('open', true);
    elements.fileManagerLoading.css('display', 'flex');
    elements.fileListContainer.html('');
    elements.fileStats.html('');
    
    try {
        await Promise.all([
            loadFileStats(),
            loadFileList()
        ]);
    } catch (error) {
        console.error('加载文件管理数据失败:', error);
        mdui.snackbar({ message: '加载失败，请重试' });
    } finally {
        elements.fileManagerLoading.css('display', 'none');
    }
};

/**
 * 加载文件统计信息
 */
const loadFileStats = async () => {
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/files/stats`,
            { room_id: state.currentRoomInfo.id },
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            renderFileStats(result.data);
        }
    } catch (error) {
        console.error('加载文件统计失败:', error);
    }
};

/**
 * 渲染文件统计
 */
const renderFileStats = (stats) => {
    if (!stats) return;
    
    const statsHTML = `
        <mdui-chip>
            <mdui-icon slot="icon">description</mdui-icon>
            文件总数：${stats.total_files || 0}
        </mdui-chip>
        <mdui-chip>
            <mdui-icon slot="icon">folder</mdui-icon>
            总大小：${formatFileSize(stats.total_size || 0)}
        </mdui-chip>
    `;
    elements.fileStats.html(statsHTML);
};

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 加载文件列表
 */
const loadFileList = async (page = 1) => {
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/files/list`,
            { 
                room_id: state.currentRoomInfo.id,
                page: page,
                limit: 50
            },
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            renderFileList(result.data.files || []);
        }
    } catch (error) {
        console.error('加载文件列表失败:', error);
        mdui.snackbar({ message: '加载文件列表失败' });
    }
};

/**
 * 渲染文件列表
 */
const renderFileList = (files) => {
    if (!files || files.length === 0) {
        elements.fileListContainer.html(`
            <div style="text-align: center; padding: 32px; color: rgb(var(--mdui-color-on-surface-variant));">
                暂无文件
            </div>
        `);
        return;
    }
    
    let listHTML = '';
    files.forEach(file => {
        const canDelete = file.user_id === CONFIG.ME_USER_ID;
        listHTML += `
            <div class="file-manager-item" data-file-id="${file.id}">
                <div class="file-manager-icon">
                    <mdui-icon>${file.file_type === 'image' ? 'image' : 'insert_drive_file'}</mdui-icon>
                </div>
                <div class="file-manager-info">
                    <div class="file-manager-name">${escapeHTML(file.original_name)}</div>
                    <div class="file-manager-meta">
                        <span>${formatFileSize(file.file_size)}</span>
                        <span>·</span>
                        <span>${formatTime(file.created_at).date} ${formatTime(file.created_at).time}</span>
                    </div>
                </div>
                <div class="file-manager-actions">
                    <a href="${file.download_url}" target="_blank" class="file-action-btn" title="下载">
                        <mdui-icon>download</mdui-icon>
                    </a>
                    ${canDelete ? `
                        <mdui-button-icon class="file-delete-btn" icon="delete" title="删除" data-file-id="${file.id}"></mdui-button-icon>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    elements.fileListContainer.html(listHTML);
    
    // 绑定删除按钮事件
    elements.fileListContainer.find('.file-delete-btn').on('click', function() {
        const fileId = $(this).attr('data-file-id');
        deleteFile(parseInt(fileId));
    });
};

/**
 * 删除文件
 */
const deleteFile = async (fileId) => {
    if (!confirm('确定要删除这个文件吗？')) return;
    
    try {
        mdui.snackbar({ message: '正在删除...' });
        
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/files/delete`,
            {
                room_id: state.currentRoomInfo.id,
                file_id: fileId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '删除成功' });
            // 重新加载文件列表和统计
            elements.fileManagerLoading.css('display', 'flex');
            await Promise.all([
                loadFileStats(),
                loadFileList()
            ]);
            elements.fileManagerLoading.css('display', 'none');
        } else {
            throw new Error(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除文件失败:', error);
        mdui.snackbar({ message: error.message || '删除失败，请重试' });
    }
};

/**
 * 切换 Markdown 模式
 */
const toggleMarkdownMode = () => {
    state.isMarkdownEnabled = !state.isMarkdownEnabled;
    const btn = elements.toggleMarkdown[0];
    if (state.isMarkdownEnabled) {
        btn.style.color = 'rgb(var(--mdui-color-primary))';
        mdui.snackbar({ message: 'Markdown 模式已开启' });
    } else {
        btn.style.color = '';
        mdui.snackbar({ message: 'Markdown 模式已关闭' });
    }
    // 点击后关闭 actionBar
    closeActionBar();
};

/**
 * 处理消息发送
 */
const handleSendMessage = async () => {
    const messageText = elements.chatInput.val().trim();
    if (!messageText) return;

    try {
        // 发送消息到服务器
        const postData = {
            room_id: state.currentRoomInfo.id,
            content: messageText,
            reply_to: state.replyingTo ? state.replyingTo.id : null
        };
        
        // 如果启用了 Markdown，添加 type 参数
        if (state.isMarkdownEnabled) {
            postData.type = 'markdown';
        }
        
        await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/chat/send`,
            postData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );

        poll();

        // 重置输入和回复状态
        elements.chatInput.val('');
        state.replyingTo = null;
        elements.replyPreview.hide();
    } catch (error) {
        console.error('发送消息失败:', error);
        mdui.snackbar({
            message: '发送消息失败，请重试'
        });
    }
};

/**
 * 处理文件上传
 */
const handleFileUpload = () => {
    elements.fileUploadInput.trigger('click');
    // 点击后关闭 actionBar
    closeActionBar();
};

/**
 * 执行文件上传
 */
const executeFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        mdui.snackbar({ message: '正在上传文件...' });
        
        const formData = new FormData();
        formData.append('room_id', state.currentRoomInfo.id);
        formData.append('file', file);

        const result = await HttpUtil.upload(
            `${CORE_CONFIG.API_URL}/files/upload`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );

        if (result.code === 200) {
            mdui.snackbar({ message: '文件上传成功' });
            poll();
        } else {
            throw new Error(result.message || '上传失败');
        }
    } catch (error) {
        console.error('文件上传失败:', error);
        mdui.snackbar({ message: error.message || '文件上传失败，请重试' });
    }

    // 清空文件输入
    elements.fileUploadInput.val('');
};

/**
 * 关闭 actionBar
 */
const closeActionBar = () => {
    elements.actionBar[0].hide = true;
    elements.emojiPanel.css('display', 'none');
};

/**
 * 初始化表情面板
 */
const initializeEmojiPanel = () => {
    const tabsContainer = elements.emojiTabs[0];
    
    // 清空现有的 tabs
    tabsContainer.innerHTML = '';

    // 生成标签
    emojiList.forEach((category) => {
        const tab = document.createElement('mdui-tab');
        tab.value = category.id;
        tab.textContent = category.name;
        tabsContainer.appendChild(tab);
    });

    // 生成内容
    renderEmojiContent('mdui');

    // 绑定标签切换事件
    tabsContainer.addEventListener('change', (event) => {
        const tabId = event.target.value;
        state.currentEmojiTab = tabId;
        renderEmojiContent(tabId);
    });
};

/**
 * 渲染表情内容
 */
const renderEmojiContent = (tabId) => {
    const contentContainer = elements.emojiPanel.find('.emoji-panel-content');
    const category = emojiList.find(c => c.id === tabId);
    if (!category) return;

    let contentHTML = '<div class="emoji-grid">';
    category.emojis.forEach(emoji => {
        contentHTML += `<div class="emoji-item" data-emoji-code="${emoji.code}" title="${emoji.name}">${emoji.icon}</div>`;
    });
    contentHTML += '</div>';
    contentContainer.html(contentHTML);

    // 绑定表情点击事件
    contentContainer.off('click', '.emoji-item').on('click', '.emoji-item', function() {
        const emojiCode = $(this).attr('data-emoji-code');
        insertEmoji(emojiCode);
    });
};

/**
 * 插入表情到输入框
 */
const insertEmoji = (emojiCode) => {
    const input = elements.chatInput[0];
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const currentValue = elements.chatInput.val();
    
    // 解析表情名称和代码
    const parts = emojiCode.split('_');
    const emojiName = parts[0];
    const emojiCodePart = parts.slice(1).join('_');
    const newFormat = `[!emoj_${emojiName}.${emojiCodePart}]`;
    
    const newValue = currentValue.substring(0, startPos) + newFormat + currentValue.substring(endPos);
    
    elements.chatInput.val(newValue);
    input.selectionStart = input.selectionEnd = startPos + newFormat.length;
    elements.chatInput.trigger('focus');
    
    // 插入表情后关闭面板和 actionBar
    closeActionBar();
};

/**
 * 解析表情代码为 HTML
 */
const parseEmojiCode = (emojiCode) => {
    // 查找表情
    for (const category of emojiList) {
        for (const emoji of category.emojis) {
            if (emoji.code === emojiCode) {
                return emoji.icon;
            }
        }
    }
    return `[${emojiCode}]`;
};

/**
 * 解析消息中的表情标签
 */
const parseEmojiInMessage = (content) => {
    if (!content) return content;
    
    // 匹配新格式: [!emoj_name.code]
    const emojiRegex = /\[!emoj_([^\.]+)\.([^\]]+)\]/g;
    
    return content.replace(emojiRegex, (match, emojiName, emojiCodePart) => {
        const fullCode = `${emojiName}_${emojiCodePart}`;
        return parseEmojiCode(fullCode);
    });
};

/**
 * 切换表情面板显示/隐藏
 */
const toggleEmojiPanel = () => {
    const panel = elements.emojiPanel;
    if (panel.css('display') !== 'none') {
        panel.css('display', 'none');
    } else {
        panel.css('display', 'flex');
        // 初始化表情面板（如果还没有初始化）
        if (panel.find('.emoji-tab').length === 0) {
            initializeEmojiPanel();
        }
    }
};

const openUserInfo = async (userId) => {
    const $dialog = elements.userInfoDialog;
    const $ui = elements.userInfoElements;

    $dialog.prop('open', true);
    $ui.loading.css('display', 'flex');
    $ui.content.hide();

    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.USER_API}/profile/get-info`,
            { user_id: userId },
            { headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` } }
        );

        const { data } = result;

        $ui.avatar.attr('src', data.avatar_url);
        $ui.nickname.text(data.nickname);
        $ui.bio.text(data.bio || '这个人很懒，什么都没写');
        $ui.id.text(data.id);

        $ui.createdAt.text(new Date(data.created_at * 1000).toLocaleString());
        $ui.lastActive.text(
            data.last_active_at
                ? new Date(data.last_active_at * 1000).toLocaleString()
                : '暂无记录'
        );

        $ui.loading.hide();
        $ui.content.fadeIn(200);

    } catch (err) {
        $dialog.prop('open', false);
        mdui.snackbar({ message: '获取用户信息失败' });
    }
};

/**
 * 轮询新消息（优化：有本地消息时获取增量，无本地消息时获取最新）
 */
const poll = async () => {
    // 保存当前轮询时的房间ID，用于后面检查是否已切换房间
    const currentRoomId = state.currentRoomInfo?.id;
    
    if (!state.currentRoomInfo || !currentRoomId) {
        if (state.isPolling) {
            state.pollTimer = setTimeout(poll, CONFIG.POLL_INTERVAL);
        }
        return;
    }

    try {
        const params = {
            room_id: currentRoomId,
            limit: CONFIG.POLL_LIMIT
        };
        // 同时传递两个 ID
        if (state.lastMessageId > 0) {
            params.last_message_id = state.lastMessageId;
        }
        if (state.lastEventId > 0) {
            params.last_event_id = state.lastEventId + 1;
        }

        const response = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/chat/new`,
            params,
            { headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` } }
        );

        // 检查在请求过程中是否已经切换房间或停止轮询
        if (!state.isPolling || state.currentRoomInfo?.id !== currentRoomId) {
            return;
        }

        let { messages = [], events = [] } = response.data || { messages: [], events: [] };

        // 处理房间更新事件（不要过滤，但要更新房间信息）
        if (events && events.length > 0) {
            // 遍历所有事件，遇到 room.update 则更新房间信息
            events.forEach(event => {
                if (event.event_type === 'room.update') {
                    const newData = event.data?.new_data;
                    if (newData) {
                        state.currentRoomInfo = { ...state.currentRoomInfo, ...newData };
                    }
                }
            });
            // 如果有任何 room.update 事件，刷新 UI 一次
            if (events.some(e => e.event_type === 'room.update')) {
                updateRoomInfoUI(state.currentRoomInfo);
            }
        }

        // 更新 lastMessageId 和 lastEventId（在过滤重复之前）
        if (messages && messages.length > 0) {
            const maxMsgId = Math.max(...messages.map(m => m.id));
            if (maxMsgId > state.lastMessageId) state.lastMessageId = maxMsgId;
        }
        if (events && events.length > 0) {
            const maxEventId = Math.max(...events.map(e => e.id));
            if (maxEventId > state.lastEventId) state.lastEventId = maxEventId;
        }

        // 过滤重复的消息和事件
        const uniqueData = filterDuplicateItems(messages, events);

        for (const event of uniqueData.events) {
            if (event.event_type === EVENT_TYPES.MESSAGE_DELETE) {
                // 根据事件中的消息ID删除本地消息
                const messageId = event.message_ref_id || event.data?.message_id;
                if (messageId) {
                    await deleteMessageLocally(messageId);
                }
            }
        }

        // 再次检查在处理过程中是否已经切换房间或停止轮询
        if (!state.isPolling || state.currentRoomInfo?.id !== currentRoomId) {
            return;
        }

        // 转换并添加时间线项目
        if (uniqueData.messages.length > 0 || uniqueData.events.length > 0) {
            const messageItems = uniqueData.messages.map(msg => convertMessageToTimelineItem(msg));
            const eventItems = uniqueData.events.map(evt => convertEventToTimelineItem(evt));
            const allItems = [...messageItems, ...eventItems].sort((a, b) => a.timestamp - b.timestamp);
            appendTimelineItems(allItems);
        }

        elements.roomData.roomInfoProgress.hide();
    } catch (error) {
        console.error('轮询失败:', error);
    } finally {
        // 最后检查一次是否还在轮询状态，并且房间ID没有变化
        if (state.isPolling && state.currentRoomInfo?.id === currentRoomId) {
            state.pollTimer = setTimeout(poll, CONFIG.POLL_INTERVAL);
        }
    }
};

/**
 * 开始轮询新消息（先加载本地消息，再启动轮询）
 */
const startPolling = async () => {
    // 检查是否有当前房间信息
    if (!state.currentRoomInfo || !state.currentRoomInfo.id) {
        console.warn('没有房间信息，无法开始轮询');
        return;
    }

    if (state.isPolling) {
        console.warn('轮询已经在进行中');
        return;
    }

    // 先加载本地消息
    await loadLocalMessages();

    state.isPolling = true;

    // 开始第一次轮询
    poll();
};

/**
 * 打开更新聊天室信息弹窗
 */
const openRoomUpdateDialog = () => {
    elements.roomUpdateLoading.hide();
    const room = state.currentRoomInfo;
    if (!room) return;

    // 填充当前房间信息到表单
    elements.roomUpdateName.val(room.name || '');
    elements.roomUpdateDesc.val(room.description || '');
    elements.roomUpdateMaxUsers.val(room.max_users || '');
    elements.roomUpdateAvatarPreview.attr('src', room.avatar_url || '');

    // 清空文件输入
    elements.roomUpdateAvatarFile.val('');

    // 显示弹窗
    elements.roomUpdateDialog.prop('open', true);
};

/**
 * 处理更新聊天室信息
 */
const handleRoomUpdate = async () => {
    const room = state.currentRoomInfo;
    if (!room) return;

    const name = elements.roomUpdateName.val().trim();
    if (!name) {
        mdui.snackbar({ message: '聊天室名称不能为空' });
        return;
    }

    // 显示加载状态
    elements.roomUpdateLoading.show();

    try {
        const formData = new FormData();
        formData.append('room_id', room.id);
        formData.append('name', name);

        const description = elements.roomUpdateDesc.val().trim();
        if (description) {
            formData.append('description', description);
        }

        const maxUsers = elements.roomUpdateMaxUsers.val();
        if (maxUsers) {
            formData.append('max_users', parseInt(maxUsers));
        }

        const avatarFile = elements.roomUpdateAvatarFile[0]?.files[0];
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        const result = await HttpUtil.upload(
            `${CORE_CONFIG.API_URL}/rooms/update`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );

        if (result.code === 200) {
            // 更新成功，更新本地房间信息
            const updatedRoom = result.data;
            state.currentRoomInfo = updatedRoom;

            // 更新UI显示
            updateRoomInfoUI(updatedRoom);

            // 关闭弹窗
            elements.roomUpdateDialog.prop('open', false);

            mdui.snackbar({
                message: '聊天室信息更新成功',
                placement: 'top'
            });
        } else {
            throw new Error(result.message || '更新失败');
        }
    } catch (error) {
        console.error('更新聊天室信息失败:', error);
        mdui.snackbar({
            message: error.message || '更新失败，请重试',
            placement: 'top'
        });
    } finally {
        elements.roomUpdateLoading.hide();
    }
};

/**
 * 更新房间信息UI
 * @param {Object} room - 房间信息
 */
const updateRoomInfoUI = (room) => {
    const $room = elements.roomData;

    document.title = `${room.name} - XQFChat Room`;

    if (room.avatar_url) {
        $room.avatar.attr('src', room.avatar_url);
    } else {
        $room.avatar.html('<mdui-icon style="font-size: 32px;">meeting_room</mdui-icon>');
    }

    $room.title.text(room.name);
    $room.name.text(room.name);
    $room.desc.text(room.description || '-');
    $room.onlineCount.text(room.online_users || 0);
    updateSidebarRoomInfo(room);
    console.debug(room);
};

/**
 * 初始化事件监听器
 */
const initializeEventListeners = () => {
    elements.navigationDrawertoggle.on("click", () => {
        elements.navigationDrawer.prop('open', true);
    });

    elements.mobileBackBtn.on("click", () => {
        // 手机端返回按钮：通知父窗口返回房间列表
        if (isInIframe()) {
            notifyParentToSwitchRoom(null);
        } else {
            window.location.href = 'index.html';
        }
    });

    elements.leaveRoom.on("click", () => {
        elements.confirmLeaveRoomDialog.prop('open', true);
    });
    
    elements.confirmLeaveRoom.on('click', async () => {
        const $btn = elements.confirmLeaveRoom;
        $btn.attr('loading', '').attr('disabled', '');
        
        try {
            const data = await HttpUtil.get(
                `${CORE_CONFIG.API_URL}/rooms/leave`,
                {
                    room_id: state.currentRoomInfo.id
                },
                {
                    headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` }
                }
            );
            
            if (data.code === 200) {
                if (isInIframe()) {
                    notifyParentToSwitchRoom(null);
                } else {
                    // 不在iframe中，直接重定向到index.html
                    window.location.href = 'index.html';
                }
            } else {
                mdui.snackbar({ message: '退出失败，请检查网络！' });
            }
        } catch (error) {
            console.error('退出聊天室失败:', error);
            mdui.snackbar({ message: '退出失败，请检查网络！' });
        } finally {
            $btn.removeAttr('loading').removeAttr('disabled');
        }
    });
    
    elements.cancelConfirmLeaveRoom.on('click', (event) => {
        elements.confirmLeaveRoomDialog.prop('open', false);
    });

    // 发送消息事件
    elements.sendBtn.on('click', handleSendMessage);
    elements.chatInput.on('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // 新增功能事件
    elements.addBtn.on('click', toggleActionBar);
    elements.toggleMarkdown.on('click', toggleMarkdownMode);
    elements.uploadFile.on('click', handleFileUpload);
    elements.toggleEmoji.on('click', toggleEmojiPanel);
    elements.openFileManager.on('click', openFileManagerDialog);
    elements.closeActionBar.on('click', closeActionBar);
    elements.fileUploadInput.on('change', executeFileUpload);
    
    // 文件管理事件
    elements.closeFileManager.on('click', () => {
        elements.fileManagerDialog.prop('open', false);
    });
    elements.refreshFileList.on('click', async () => {
        elements.fileManagerLoading.css('display', 'flex');
        await Promise.all([
            loadFileStats(),
            loadFileList()
        ]);
        elements.fileManagerLoading.css('display', 'none');
    });

    // 点击外部区域关闭表情面板
    $(document).on('click', (event) => {
        if (!$(event.target).closest(elements.emojiPanel).length && 
            !$(event.target).closest(elements.toggleEmoji).length) {
            elements.emojiPanel.css('display', 'none');
        }
    });

    // 按ESC键取消回复或退出多选模式
    elements.chatInput.on('keydown', (event) => {
        if (event.key === 'Escape') {
            if (state.replyingTo) {
                cancelReply();
            } else if (state.isSelectMode) {
                exitSelectMode();
            }
        }
    });

    // 全局ESC键监听，用于退出多选模式
    $(document).on('keydown', (event) => {
        if (event.key === 'Escape' && state.isSelectMode) {
            exitSelectMode();
        }
    });

    // 取消回复
    elements.cancelReply.on('click', cancelReply);

    // 菜单事件
    elements.msgMenu.on('click', handleMenuAction);

    // 点击外部关闭菜单
    $(document).on('click', (event) => {
        if (!$(event.target).closest(elements.msgMenu).length) {
            elements.msgMenu.hide();
        }
    });

    elements.roomData.memberList.on('click', async (event) => {
        const $item = $(event.target).closest('.member-item');
        if (!$item.length) return;

        const userId = $item.attr('data-user-id');
        if (!userId) return;

        await openUserInfo(userId);
    });

    elements.roomData.updateBtn.on('click', () => {
        openRoomUpdateDialog();
    });

    elements.roomUpdateAvatarBtn.on('click', () => {
        elements.roomUpdateAvatarFile.trigger('click');
    });

    elements.roomUpdateAvatarFile.on('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                elements.roomUpdateAvatarPreview.attr('src', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    elements.roomUpdateSubmit.on('click', handleRoomUpdate);

    elements.roomUpdateCancel.on('click', () => {
        elements.roomUpdateDialog.prop('open', false);
    });

    // 转发对话框事件
    elements.cancelForward.on('click', () => {
        elements.forwardDialog.prop('open', false);
    });

    elements.confirmForward.on('click', handleForwardMessage);
    
    // 详细转发记录对话框事件
    elements.closeForwardDetail.on('click', () => {
        elements.forwardDetailDialog.prop('open', false);
    });
    
    // 嵌套转发记录对话框事件
    elements.closeNestedForward.on('click', () => {
        // 如果堆栈不为空，弹出上一层数据并打开
        if (state.nestedForwardStack.length > 0) {
            const previousData = state.nestedForwardStack.pop();
            // 关闭当前弹窗
            elements.nestedForwardDialog.prop('open', false);
            // 打开上一层弹窗
            setTimeout(() => {
                openNestedForwardDialog(previousData);
            }, 300); // 等待动画完成
        } else {
            // 堆栈为空，关闭弹窗
            elements.nestedForwardDialog.prop('open', false);
        }
    });

    // 多选模式事件
    elements.closeSelectModeBtn.on('click', exitSelectMode);
    elements.forwardSingleBtn.on('click', handleForwardSingle);
    elements.forwardMergedBtn.on('click', handleForwardMerged);

    elements.sidebarBackBtn.on('click', () => {
        window.location.href = 'index.html';
    });

    elements.sidebarRoomInfoBtn.on('click', () => {
        elements.navigationDrawer.prop('open', true);
    });

    elements.refreshRoomListBtn.on('click', () => {
        loadChatRoomList();
    });

    elements.chatRoomList.on('click', '.chat-room-item', function () {
        const roomId = $(this).attr('data-room-id');
        if (!roomId || String(roomId) === String(state.currentRoomInfo?.id)) {
            return;
        }

        if (isInIframe()) {
            // 在iframe中，通过postMessage通知父窗口切换房间
            notifyParentToSwitchRoom(roomId);
        } else {
            // 在非iframe环境中，重定向（虽然现在应该不会发生）
            window.location.href = `chat.html?room_id=${roomId}`;
        }
    });

    // 机器人管理事件
    elements.manageRoomBots.on('click', openRoomBotsDialog);
    elements.closeRoomBotsDialog.on('click', () => {
        elements.roomBotsDialog.prop('open', false);
    });
    elements.refreshRoomBots.on('click', loadRoomBots);
    
    elements.closeInstallBotDialog.on('click', () => {
        elements.installBotDialog.prop('open', false);
    });
};

/**
 * 初始化消息列表的滚动监听
 */
const initializeScrollListener = () => {
    const $messageList = elements.messageList;

    // 监听滚动事件
    $messageList.on('scroll', () => {
        // 用户手动滚动时，标记为已滚动
        if (!state.isUserScrolled) {
            state.isUserScrolled = true;
        }

        // 清除之前的定时器
        if (state.scrollCheckTimer) {
            clearTimeout(state.scrollCheckTimer);
        }

        // 设置新的定时器：如果用户滚动到底部，则重置滚动状态
        state.scrollCheckTimer = setTimeout(() => {
            if (isUserAtBottom()) {
                state.isUserScrolled = false;
            }
        }, 200);
    });

    // 监听触摸事件（移动端）
    $messageList.on('touchstart', () => {
        state.isUserScrolled = true;
    });

    $messageList.on('touchend', () => {
        setTimeout(() => {
            if (isUserAtBottom()) {
                state.isUserScrolled = false;
            }
        }, 200);
    });
};

/**
 * 渲染聊天室列表项 HTML
 * @param {Object} room
 * @returns {string}
 */
const renderChatRoomItemHTML = (room) => {
    const isActive = state.currentRoomInfo?.id === room.id;
    const activeClass = isActive ? ' active' : '';
    return `
        <div class="chat-room-item${activeClass}" data-room-id="${room.id}">
            <div class="room-item-avatar">
                ${room.avatar_url ? `<img src="${room.avatar_url}" alt="${room.name}" />` : '<mdui-icon>meeting_room</mdui-icon>'}
            </div>
            <div class="room-item-meta">
                <div class="room-item-title">${room.name}</div>
                <div class="room-item-subtitle">在线 ${room.online_users || 0} · 最大 ${room.max_users || '-'} 人</div>
            </div>
        </div>`;
};

/**
 * 渲染聊天室列表
 * @param {Array} rooms
 */
const renderChatRoomList = (rooms) => {
    if (!rooms || rooms.length === 0) {
        elements.chatRoomList.html('');
        elements.chatRoomListEmpty.text('暂无聊天室可切换').show();
        return;
    }

    const itemsHTML = rooms.map(room => renderChatRoomItemHTML(room)).join('');
    elements.chatRoomList.html(itemsHTML);
    elements.chatRoomListEmpty.hide();
};

/**
 * 加载当前用户的聊天室列表
 */
const loadChatRoomList = async () => {
    elements.chatRoomListEmpty.text('正在加载我的聊天室...').show();
    elements.chatRoomList.html('');

    try {
        const result = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/my`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            }
        });

        renderChatRoomList(result.data?.rooms || []);
    } catch (error) {
        console.error('加载聊天室列表失败:', error);
        elements.chatRoomListEmpty.text('加载聊天室列表失败，请稍后重试').show();
    }
};

/**
 * 更新侧边栏当前房间简介
 * @param {Object} room
 */
const updateSidebarRoomInfo = (room) => {
    if (!room) return;

    if (room.avatar_url) {
        elements.sidebarRoomAvatar.attr('src', room.avatar_url);
    } else {
        elements.sidebarRoomAvatar.html('<mdui-icon style="font-size: 28px;">meeting_room</mdui-icon>');
    }

    elements.sidebarRoomName.text(room.name || '-');
    elements.sidebarRoomOnline.text(`在线：${room.online_users || 0}`);
};

/**
 * 初始化当前房间信息
 */
const initializecurrentRoomInfo = async (roomData) => {
    if (!roomData?.data) return;

    // 停止旧的轮询
    if (state.pollTimer) {
        clearTimeout(state.pollTimer);
        state.pollTimer = null;
    }
    state.isPolling = false;

    // 清空旧消息和状态
    elements.messageList.html('');
    state.lastMessageId = 0;
    state.lastEventId = 0;
    state.replyingMessage = null;
    elements.replyPreview.css('display', 'none');

    // 显示/隐藏手机端返回按钮
    if (window.innerWidth < 1024 && isInIframe()) {
        elements.mobileBackBtn.css('display', '');
    } else {
        elements.mobileBackBtn.css('display', 'none');
    }

    const { data } = roomData;
    const $room = elements.roomData;
    state.currentRoomInfo = data;

    document.title = `${data.name} - XQFChat Room`;

    if (data.avatar_url) {
        $room.avatar.attr('src', data.avatar_url);
    } else {
        $room.avatar.html('<mdui-icon style="font-size: 32px;">meeting_room</mdui-icon>');
    }

    $room.title.text(data.name);
    $room.name.text(data.name);
    $room.desc.text(data.description);
    $room.id.text(data.id);
    $room.onlineCount.text(data.online_users);
    $room.createTime.text(formatTime(data.created_at).fullDateTime);
    updateSidebarRoomInfo(data);

    try {
        const roomMembers = await HttpUtil.get(`${CORE_CONFIG.API_URL}/chat/members`, {
            room_id: data.id,
            limit: 50,
            type: "all"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            },
        });

        // 使用 map 生成字符串后，一次性交给 jQuery 的 .html() 渲染
        const memberListHTML = roomMembers.data.members.map(item => `
            <mdui-list-item class="member-item" data-user-id="${item.id}" rounded>
                <mdui-avatar slot="icon" src="${item.avatar_url}"></mdui-avatar>
                <mdui-list-item-title>${item.nickname}</mdui-list-item-title>
                <mdui-list-item-description>${item.is_online ? '在线' : '离线'}</mdui-list-item-description>
            </mdui-list-item>
        `).join('');

        $room.memberList.html(memberListHTML);

    } catch (error) {
        console.error('加载房间成员失败:', error);
        mdui.snackbar({ message: '加载房间成员失败' });
    }

    // 判断当前用户是否是房主，控制更新按钮显示
    const isOwner = data.owner_id === CONFIG.ME_USER_ID;
    if (isOwner) {
        // 显示更新按钮
        $room.updateBtn.css('display', '');
    } else {
        // 隐藏更新按钮
        $room.updateBtn.css('display', 'none');
    }

    // 3. 启动轮询（先加载本地消息，再轮询）
    startPolling();
};

/**
 * 应用初始化
 */
// 全局房间ID变量，由父窗口通过postMessage传递
let currentRoomId = null;
let currentActiveRoomId = null;
let isInitialized = false;
let eventListenersInitialized = false; // 标记事件监听器是否已初始化

// 监听来自父窗口的消息
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'setRoomId') {
        const newRoomId = event.data.roomId;

        // 如果是同一个房间，不处理
        if (currentActiveRoomId === newRoomId && isInitialized) {
            // 确保界面正常显示
            if (elements.messageList.html() === '') {
                // 如果消息列表为空，重新加载
                initializeApp();
            }
            return;
        }

        currentRoomId = newRoomId;

        if (currentRoomId) {
            initializeApp();
        }
    }
});

// 在文件末尾的 initializeApp 函数中添加/修改
const initializeApp = async () => {
    try {
        // 检查登录状态：如果没有令牌，重定向到登录页面
        if (!USER_LOGIN_TOKEN) {
            window.location.href = 'login.html';
            return;
        }

        if (!currentRoomId) {
            // 如果还没有房间ID，等待postMessage
            return;
        }

        // 如果是同一个房间，不需要重新初始化
        if (currentActiveRoomId === currentRoomId && isInitialized) {
            console.debug('Same room, skipping re-initialization');
            return;
        }

        // 清理之前的聊天室状态
        if (isInitialized) {
            cleanupChatRoom();
        }

        // 只在第一次初始化时绑定事件监听器
        if (!eventListenersInitialized) {
            initializeEventListeners();
            initializeScrollListener();
            eventListenersInitialized = true;
        }

        // 获取房间详情
        const roomData = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/detail`, {
            room_id: currentRoomId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            },
        });

        // 等待房间详情初始化完成（包含初始消息加载和轮询启动）
        await initializecurrentRoomInfo(roomData);
        loadChatRoomList();

        await bgSettings.load();
        bgSettings.apply();
        bgSettings.watch();

        // 标记已初始化
        currentActiveRoomId = currentRoomId;
        isInitialized = true;

        // 通知父窗口 iframe 已准备就绪
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'chatRoomReady'
            }, '*');
        }

        console.debug(state)
    } catch (error) {
        console.error('初始化失败:', error);
        mdui.snackbar({
            message: `初始化失败：${error.message || error}`
        });
    }
};

// 添加清理函数
const cleanupChatRoom = () => {
    // 停止轮询
    if (state.pollTimer) {
        clearTimeout(state.pollTimer);
        state.pollTimer = null;
    }
    state.isPolling = false;

    // 清空状态
    state.lastMessageId = 0;
    state.lastEventId = 0;
    state.timelineItems = [];
    state.itemIds.clear();
    state.lastSenderId = null;
    state.lastMsgTime = 0;
    state.replyingTo = null;
    state.lastItemTime = 0;
    state.currentRoomInfo = null;

    // 重置初始化标志，允许重新加载新房间
    currentActiveRoomId = null;
    isInitialized = false;

    // 清空消息列表
    elements.messageList.html('');
    elements.replyPreview.hide();

    // 清空输入框
    elements.chatInput.val('');
    
    // 安全地清空标题栏（使用与 updateRoomInfoUI 相同的方式）
    elements.roomData.title.text('');
    document.title = 'XQFChat Room';
};

/**
 * 打开聊天室机器人管理对话框
 */
const openRoomBotsDialog = async () => {
    elements.roomBotsDialog.prop('open', true);
    await loadRoomBots();
};

/**
 * 加载聊天室机器人列表
 */
const loadRoomBots = async () => {
    elements.roomBotsLoading.css('display', 'flex');
    elements.roomBotsList.html('');
    
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/bots/room`,
            { room_id: state.currentRoomInfo.id },
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        renderRoomBots(result.data || []);
    } catch (error) {
        console.error('加载聊天室机器人失败:', error);
        mdui.snackbar({ message: '加载失败，请重试' });
        elements.roomBotsList.html(`
            <div style="padding: 48px; text-align: center;">
                <mdui-icon style="font-size: 48px; margin-bottom: 16px;">error</mdui-icon>
                <div style="color: rgba(var(--mdui-color-on-surface), 0.7);">加载失败，请重试</div>
            </div>
        `);
    } finally {
        elements.roomBotsLoading.css('display', 'none');
    }
};

/**
 * 渲染聊天室机器人列表
 */
const renderRoomBots = (bots) => {
    if (!bots || bots.length === 0) {
        elements.roomBotsList.html(`
            <div style="padding: 48px; text-align: center;">
                <mdui-icon style="font-size: 48px; margin-bottom: 16px;">smart_toy</mdui-icon>
                <div style="color: rgba(var(--mdui-color-on-surface), 0.7); margin-bottom: 16px;">
                    当前聊天室还没有安装机器人
                </div>
                <mdui-button variant="tonal" id="installBotFromMarketplace">
                    <mdui-icon slot="icon">add</mdui-icon>
                    从市场安装
                </mdui-button>
            </div>
        `);
        
        $('#installBotFromMarketplace').off('click').on('click', openMarketplaceDialog);
        return;
    }
    
    elements.roomBotsList.html(bots.map(bot => `
        <mdui-card variant="outlined" style="margin: 8px 0;">
            <div style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <mdui-avatar src="${bot.avatar_url || ''}"></mdui-avatar>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${bot.name}</div>
                        <div style="font-size: 13px; opacity: 0.7;">${bot.description || '暂无描述'}</div>
                    </div>
                    <mdui-button variant="text" class="uninstall-bot-btn" data-bot-id="${bot.id}">
                        卸载
                    </mdui-button>
                </div>
            </div>
        </mdui-card>
    `).join('') + `
        <div style="margin-top: 16px; text-align: center;">
            <mdui-button variant="tonal" id="installBotFromMarketplace">
                <mdui-icon slot="icon">add</mdui-icon>
                从市场安装更多
            </mdui-button>
        </div>
    `);
    
    $('.uninstall-bot-btn').off('click').on('click', function() {
        const botId = $(this).attr('data-bot-id');
        uninstallBot(botId);
    });
    
    $('#installBotFromMarketplace').off('click').on('click', openMarketplaceDialog);
};

/**
 * 打开机器人市场对话框
 */
const openMarketplaceDialog = async () => {
    elements.installBotDialog.prop('open', true);
    elements.marketplaceLoading.css('display', 'flex');
    elements.marketplaceBotsList.html('');
    
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/bots/marketplace`,
            { page: 1, limit: 20 },
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        renderMarketplaceBots(result.data?.bots || []);
    } catch (error) {
        console.error('加载机器人市场失败:', error);
        mdui.snackbar({ message: '加载失败，请重试' });
    } finally {
        elements.marketplaceLoading.css('display', 'none');
    }
};

/**
 * 渲染机器人市场列表
 */
const renderMarketplaceBots = (bots) => {
    if (!bots || bots.length === 0) {
        elements.marketplaceBotsList.html(`
            <div style="padding: 48px; text-align: center;">
                <mdui-icon style="font-size: 48px; margin-bottom: 16px;">storefront</mdui-icon>
                <div style="color: rgba(var(--mdui-color-on-surface), 0.7);">暂无可用机器人</div>
            </div>
        `);
        return;
    }
    
    elements.marketplaceBotsList.html(bots.map(bot => `
        <mdui-card variant="outlined" style="margin: 8px 0;">
            <div style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <mdui-avatar src="${bot.avatar_url || ''}"></mdui-avatar>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${bot.name}</div>
                        <div style="font-size: 13px; opacity: 0.7;">${bot.description || '暂无描述'}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                    ${(bot.tags || []).map(tag => `<mdui-chip size="small">${tag}</mdui-chip>`).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 13px; opacity: 0.7;">
                        <mdui-icon style="font-size: 16px; vertical-align: middle;">download</mdui-icon>
                        ${bot.download_count || 0} 次安装
                    </div>
                    <mdui-button variant="tonal" class="install-bot-btn" data-bot-id="${bot.id}">
                        <mdui-icon slot="icon">add</mdui-icon>
                        安装
                    </mdui-button>
                </div>
            </div>
        </mdui-card>
    `).join(''));
    
    $('.install-bot-btn').off('click').on('click', function() {
        const botId = $(this).attr('data-bot-id');
        installBot(botId);
    });
};

/**
 * 安装机器人到聊天室
 */
const installBot = async (botId) => {
    const $btn = $(`.install-bot-btn[data-bot-id="${botId}"]`);
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/install`,
            {
                bot_id: parseInt(botId),
                room_id: state.currentRoomInfo.id
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人安装成功' });
            elements.installBotDialog.prop('open', false);
            await loadRoomBots();
        } else {
            throw new Error(result.message || '安装失败');
        }
    } catch (error) {
        console.error('安装机器人失败:', error);
        mdui.snackbar({ message: error?.message || '安装失败，请重试' });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

/**
 * 从聊天室卸载机器人
 */
const uninstallBot = async (botId) => {
    const $btn = $(`.uninstall-bot-btn[data-bot-id="${botId}"]`);
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/uninstall`,
            {
                bot_id: parseInt(botId),
                room_id: state.currentRoomInfo.id
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人卸载成功' });
            await loadRoomBots();
        } else {
            throw new Error(result.message || '卸载失败');
        }
    } catch (error) {
        console.error('卸载机器人失败:', error);
        mdui.snackbar({ message: error?.message || '卸载失败，请重试' });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

export { elements, cleanupChatRoom };