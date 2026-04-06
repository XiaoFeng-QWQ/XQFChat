"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $ } from './core.js';
import { emojiWidget } from './lib/widget.js';
import { HttpUtil, StorageUtil, formatTime, IndexedDBUtil, progressManager, isInIframe } from './lib/util.js';

/**
 * DOM 元素集合
 * @type {Object.<string, jQuery>}
 */
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
    sidebarRoomAvatar: $('#sidebarRoomAvatar'),
    sidebarRoomName: $('#sidebarRoomName'),
    sidebarRoomOnline: $('#sidebarRoomOnline'),
    sidebarBackBtn: $('#sidebarBackBtn'),
    sidebarRoomInfoBtn: $('#sidebarRoomInfoBtn'),
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

    multiSelectToolbar: $('#multiSelectToolbar'),
    selectedCount: $('#selectedCount'),
    forwardSingleBtn: $('#forwardSingleBtn'),
    forwardMergedBtn: $('#forwardMergedBtn'),
    closeSelectModeBtn: $('#closeSelectModeBtn'),

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

    fileManagerDialog: $('#fileManagerDialog'),
    fileStats: $('#fileStats'),
    fileListContainer: $('#fileListContainer'),
    fileManagerLoading: $('#fileManagerLoading'),
    closeFileManager: $('#closeFileManager'),
    refreshFileList: $('#refreshFileList'),

    manageRoomBots: $('#manageRoomBots'),
    roomBotsDialog: $('#roomBotsDialog'),
    roomBotsLoading: $('#roomBotsLoading'),
    roomBotsList: $('#roomBotsList'),
    closeRoomBotsDialog: $('#closeRoomBotsDialog'),
    refreshRoomBots: $('#refreshRoomBots'),

    installBotDialog: $('#installBotDialog'),
    marketplaceLoading: $('#marketplaceLoading'),
    marketplaceBotsList: $('#marketplaceBotsList'),
    closeInstallBotDialog: $('#closeInstallBotDialog'),

    deleteFileDialog: $('#deleteFileDialog'),
    cancelDeleteFile: $('#cancelDeleteFile'),
    confirmDeleteFile: $('#confirmDeleteFile')
};

/**
 * 应用配置常量
 * @type {Object}
 */
const CONFIG = {
    COMPACT_TIME_LIMIT: 60000,
    HIGHLIGHT_DURATION: 1500,
    TIME_BAR_GAP_MINUTES: 30,
    ME_USER_ID: StorageUtil.getItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO)?.id || null,
    SCROLL_THRESHOLD: 100,
    POLL_INTERVAL: 1000,
    POLL_LIMIT: 50,
    LOCAL_STORAGE_KEY_PREFIX: 'chat_room_',
    STORAGE_KEYS: {
        CHAT_BG: 'chat_background',
        CHAT_BG_TYPE: 'chat_bg_type',
        CHAT_BG_COLOR: 'chat_bg_color',
        CHAT_BG_IMAGE: 'chat_bg_image',
        CHAT_BG_FIT: 'chat_bg_fit',
        CHAT_BG_BLUR: 'chat_bg_blur'
    }
};

/**
 * 应用状态管理
 * @type {Object}
 */
const state = {
    lastSenderId: null,
    lastMsgTime: 0,
    activeMsgRow: null,
    replyingTo: null,
    forwardingMessage: null,
    selectedMessages: new Set(),
    selectedMessagesForForward: [],
    selectedTargetRoomId: null,
    isSelectMode: false,
    timelineItems: [],
    isUserScrolled: false,
    scrollCheckTimer: null,
    currentRoomInfo: [],
    pollTimer: null,
    lastMessageId: 0,
    isPolling: false,
    itemIds: new Set(),
    lastItemTime: 0,
    lastEventId: 0,
    nestedForwardStack: [],
    isMarkdownEnabled: false,
    currentEmojiTab: 'mdui',
    currentDeletingFileId: null
};

/**
 * 通知父窗口切换房间（如果在iframe中）
 * @param {string|number|null} roomId - 房间ID，传null表示返回房间列表
 * @returns {void}
 */
const notifyParentToSwitchRoom = (roomId) => {
    if (isInIframe() && window.parent) {
        window.parent.postMessage({
            type: 'switchRoom',
            roomId: roomId
        }, '*');
    }
};

/**
 * 转义HTML特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
const escapeHTML = (str) => {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * 消息类型常量
 * @enum {string}
 */
const MESSAGE_TYPES = {
    TEXT: 'text',
    MARKDOWN: 'markdown',
    DELETED: 'deleted',
    CARD_FILE: 'card.file',
    CARD_FORWARD: 'card.forward'
};

/**
 * 事件类型常量
 * @enum {string}
 */
const EVENT_TYPES = {
    USER_JOIN: 'user.join',
    USER_LEAVE: 'user.leave',
    USER_KICK: 'user.kick',
    MESSAGE_CREATE: 'message.create',
    MESSAGE_DELETE: 'message.delete',
    ROOM_UPDATE: 'room.update'
};

/**
 * 时间线项目类型常量
 * @enum {string}
 */
const ITEM_TYPES = {
    MESSAGE: 'message',
    EVENT: 'event'
};

/**
 * 聊天背景设置管理对象
 * @type {Object}
 */
const bgSettings = {
    current: null,

    /**
     * 加载保存的背景设置
     * @returns {Promise<Object>} 背景设置对象
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
     * 应用当前背景设置到消息列表
     * @returns {void}
     */
    apply() {
        if (!this.current) return;

        const $messageList = elements.messageList;
        const settings = this.current;

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
     * @returns {void}
     */
    watch() {
        window.addEventListener('storage', (e) => {
            if (e.key === CONFIG.STORAGE_KEYS.CHAT_BG) {
                this.load().then(() => this.apply());
            }
        });
    }
};

/**
 * 获取当前房间的消息存储键
 * @returns {string} 存储键名
 */
const getMessageStorageKey = () => {
    return `${CONFIG.LOCAL_STORAGE_KEY_PREFIX}${state.currentRoomInfo.id}_messages`;
};

/**
 * 获取当前房间的事件存储键
 * @returns {string} 存储键名
 */
const getEventStorageKey = () => {
    return `${CONFIG.LOCAL_STORAGE_KEY_PREFIX}${state.currentRoomInfo.id}_events`;
};

/**
 * 从 IndexedDB 加载当前房间的本地消息和事件
 * 合并后填充到 state.timelineItems 和 state.itemIds，并更新 lastMessageId
 * 同时渲染到界面
 * @returns {Promise<void>}
 */
const loadLocalMessages = async () => {
    const messageKey = getMessageStorageKey();
    const eventKey = getEventStorageKey();

    const [storedMessages, storedEvents] = await Promise.all([
        IndexedDBUtil.getItem(messageKey, null, 'chatData'),
        IndexedDBUtil.getItem(eventKey, null, 'chatData')
    ]);

    const messages = (storedMessages?.items || []).map(msg => ({
        ...msg,
        type: ITEM_TYPES.MESSAGE
    }));

    const events = (storedEvents?.items || []).map(evt => ({
        ...evt,
        type: ITEM_TYPES.EVENT
    }));

    const items = [...messages, ...events].sort((a, b) => a.timestamp - b.timestamp);

    if (items.length === 0) return;

    state.timelineItems = [];
    state.itemIds.clear();
    state.lastMessageId = 0;

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
 * @returns {Promise<void>}
 */
const saveItemsToLocal = async (items) => {
    if (!state.currentRoomInfo?.id || items.length === 0) return;

    const newMessages = items.filter(item => item.type === ITEM_TYPES.MESSAGE);
    const newEvents = items.filter(item => item.type === ITEM_TYPES.EVENT);

    await Promise.all([
        saveMessagesToLocal(newMessages),
        saveEventsToLocal(newEvents)
    ]);
};

/**
 * 保存消息到本地
 * @param {Array} newMessages - 新消息数组
 * @returns {Promise<void>}
 */
const saveMessagesToLocal = async (newMessages) => {
    if (newMessages.length === 0) return;

    const messageKey = getMessageStorageKey();
    const stored = await IndexedDBUtil.getItem(messageKey, { items: [] }, 'chatData');
    const existingMessages = stored.items;

    const messageMap = new Map();
    existingMessages.forEach(msg => {
        messageMap.set(msg.id, msg);
    });
    newMessages.forEach(msg => {
        if (!messageMap.has(msg.id)) {
            messageMap.set(msg.id, msg);
        }
    });

    const mergedMessages = Array.from(messageMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);

    await IndexedDBUtil.setItem(messageKey, { items: mergedMessages }, 'chatData');
};

/**
 * 保存事件到本地
 * @param {Array} newEvents - 新事件数组
 * @returns {Promise<void>}
 */
const saveEventsToLocal = async (newEvents) => {
    if (newEvents.length === 0) return;

    const eventKey = getEventStorageKey();
    const stored = await IndexedDBUtil.getItem(eventKey, { items: [] }, 'chatData');
    const existingEvents = stored.items;

    const eventMap = new Map();
    existingEvents.forEach(evt => {
        eventMap.set(evt.id, evt);
    });
    newEvents.forEach(evt => {
        if (!eventMap.has(evt.id)) {
            eventMap.set(evt.id, evt);
        }
    });

    const mergedEvents = Array.from(eventMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);

    await IndexedDBUtil.setItem(eventKey, { items: mergedEvents }, 'chatData');
};

/**
 * 从本地存储中删除指定消息
 * @param {number} messageId - 消息ID
 * @returns {Promise<void>}
 */
const deleteMessageFromLocal = async (messageId) => {
    const messageKey = getMessageStorageKey();
    const stored = await IndexedDBUtil.getItem(messageKey, { items: [] }, 'chatData');
    const filtered = stored.items.filter(msg => msg.id != messageId);
    await IndexedDBUtil.setItem(messageKey, { items: filtered }, 'chatData');
};

/**
 * 从本地完全删除一条消息（不发送HTTP请求）
 * @param {number} messageId - 消息ID
 * @returns {Promise<void>}
 */
const deleteMessageLocally = async (messageId) => {
    const $messageElement = findMessageById(messageId);
    const itemIndex = state.timelineItems.findIndex(item =>
        item.type === ITEM_TYPES.MESSAGE && item.id == messageId
    );

    if ($messageElement.length && itemIndex !== -1) {
        $messageElement.remove();

        state.timelineItems.splice(itemIndex, 1);

        const uniqueId = `${ITEM_TYPES.MESSAGE}-${messageId}`;
        state.itemIds.delete(uniqueId);

        const messages = state.timelineItems.filter(item => item.type === ITEM_TYPES.MESSAGE);
        if (messageId == state.lastMessageId) {
            state.lastMessageId = messages.length > 0 ? Math.max(...messages.map(msg => msg.id)) : 0;
        }

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

    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    return distanceToBottom <= CONFIG.SCROLL_THRESHOLD;
};

/**
 * 滚动到底部
 * @param {boolean} animated - 是否使用动画
 * @returns {void}
 */
const scrollToBottom = (animated = true) => {
    const $messageList = elements.messageList;
    const container = $messageList[0];
    const scrollHeight = container.scrollHeight;
    if (animated) {
        $messageList.animate({ scrollTop: scrollHeight }, 300);
    } else {
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
 * @returns {void}
 */
const checkAutoScroll = () => {
    if (!state.isUserScrolled || isUserAtBottom()) {
        requestAnimationFrame(() => {
            scrollToBottom(false);
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
 * @returns {jQuery|null} 找到的元素或null
 */
const findMessageById = (messageId) => {
    const elementId = generateMessageElementId(messageId);
    return elements.messageList.find(`[data-msg-id="${elementId}"]`);
};

/**
 * 滚动到指定消息并高亮显示
 * @param {number} messageId - 后端消息ID
 * @returns {void}
 */
const scrollToMessage = (messageId) => {
    const $targetElement = findMessageById(messageId);

    if (!$targetElement.length) {
        mdui.snackbar({ message: '原消息已被撤回或不存在' });
        return;
    }

    const container = elements.messageList[0];
    const targetTop = $targetElement[0].offsetTop - container.clientHeight / 2 + $targetElement[0].clientHeight / 2;

    elements.messageList.animate({
        scrollTop: targetTop
    }, 300);

    $targetElement.addClass('msg-highlight');

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
    if (!prevTimestamp) return true;

    const timeDiffMinutes = (currentTimestamp - prevTimestamp) / 60;
    return timeDiffMinutes >= CONFIG.TIME_BAR_GAP_MINUTES;
};

/**
 * 创建时间条HTML
 * @param {Object} timeInfo - 时间信息
 * @param {string} timeInfo.date - 日期字符串
 * @param {string} timeInfo.time - 时间字符串
 * @param {number} timeInfo.timestamp - 时间戳
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
 * @returns {void}
 */
const appendTimeBar = (timeInfo) => {
    const $timeBarElement = $(createTimeBarHTML(timeInfo));
    elements.messageList.append($timeBarElement);
};

/**
 * 处理文件卡片消息
 * @param {Object} fileData - 文件数据
 * @param {string} fileData.filename - 文件名
 * @param {number} fileData.file_size - 文件大小（字节）
 * @param {string} fileData.file_type - 文件类型
 * @param {string} fileData.mime_type - MIME类型
 * @param {string} fileData.download_url - 下载链接
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
 * @param {Array} forwardData.messages - 消息数组
 * @param {number} forwardData.count - 消息数量
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

        if (index < 3) {
            messagesHTML += `
            <div class="forward-message-item">
                <div class="forward-message-sender">${msg.nickname || '未知用户'}</div>
                <div class="forward-message-content">${contentHTML}</div>
            </div>`;
        }
    });

    if (count > 3) {
        messagesHTML += `
        <div class="forward-message-more" style="cursor: pointer;">
            还有 ${count - 3} 条消息，点击查看全部...
        </div>`;
    }

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
 * @returns {void}
 */
const openNestedForwardDialog = (forwardData) => {
    if (!forwardData || !forwardData.messages || forwardData.messages.length === 0) {
        return;
    }

    const messages = forwardData.messages;
    const count = forwardData.count || messages.length;

    let contentHTML = '';
    messages.forEach((msg) => {
        const messageContent = renderForwardMessageContent(msg, 0);

        let timeText = '';
        if (msg.created_at) {
            let timestamp = msg.created_at;
            if (timestamp > 10000000000) {
                timestamp = Math.floor(timestamp / 1000);
            }
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

    elements.nestedForwardContent.find('.nested-forward-card').off('click').on('click', function (event) {
        event.stopPropagation();
        const nestedData = $(this).attr('data-nested-data');
        if (nestedData) {
            try {
                const data = JSON.parse(nestedData);
                state.nestedForwardStack.push(forwardData);
                elements.nestedForwardDialog.prop('open', false);
                setTimeout(() => {
                    openNestedForwardDialog(data);
                }, 300);
            } catch (e) {
                console.error('解析嵌套转发数据失败:', e);
            }
        }
    });
};

/**
 * 处理消息内容，支持嵌套转发（点击打开新弹窗）
 * @param {Object} msg - 消息对象
 * @param {number} depth - 嵌套深度
 * @returns {string} 渲染后的HTML内容
 */
const renderForwardMessageContent = (msg, depth = 0) => {
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

/**
 * 打开转发详情对话框
 * @param {Object} forwardData - 转发数据
 * @returns {void}
 */
const openForwardDetailDialog = (forwardData) => {
    if (!forwardData || !forwardData.messages || forwardData.messages.length === 0) {
        return;
    }

    const messages = forwardData.messages;
    const count = forwardData.count || messages.length;

    let contentHTML = '';
    messages.forEach((msg) => {
        const messageContent = renderForwardMessageContent(msg, 0);

        let timeText = '';
        if (msg.created_at) {
            let timestamp = msg.created_at;
            if (timestamp > 10000000000) {
                timestamp = Math.floor(timestamp / 1000);
            }
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

    elements.forwardDetailContent.find('.nested-forward-card').off('click').on('click', function (event) {
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

    switch (message_type) {
        case MESSAGE_TYPES.TEXT:
            messageHTML = `<div class="text-body">${parseEmojiInMessage(content)}</div>`;
            break;

        case MESSAGE_TYPES.MARKDOWN:
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
 * @returns {void}
 */
const handleMessageContextMenu = ($messageRow, event) => {
    event.preventDefault();
    event.stopPropagation();

    const { clientX, clientY } = event.touches ?
        event.touches[0] : event;

    state.activeMsgRow = $messageRow;

    const $deleteOption = elements.msgMenu.find('[data-action="message.delete"]');
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

    const menuWidth = 150;
    const menuHeight = 360;

    let menuLeft = clientX;
    let menuTop = clientY;

    if (menuLeft + menuWidth > window.innerWidth) {
        menuLeft = window.innerWidth - menuWidth;
    }

    if (menuTop + menuHeight > window.innerHeight) {
        menuTop = window.innerHeight - menuHeight;
    }

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
 * @returns {void}
 */
const bindMessageEvents = ($messageRow, message) => {
    const $quoteElement = $messageRow.find('.quote-content');
    if ($quoteElement.length && message.reply_to) {
        $quoteElement.on('click', (event) => {
            event.stopPropagation();
            scrollToMessage(message.reply_to);
        });
    }

    $messageRow.on('click', (event) => {
        if ($(event.target).closest('.quote-content').length) {
            return;
        }

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

        if (state.isSelectMode) {
            if (state.selectedMessages.has(message.id)) {
                state.selectedMessages.delete(message.id);
                $messageRow.removeClass('selected');
            } else {
                state.selectedMessages.add(message.id);
                $messageRow.addClass('selected');
            }

            updateSelectedCount();
        }
    });

    const $bubbleElement = $messageRow.find('.message-bubble');
    if ($bubbleElement.length) {
        $bubbleElement.on('contextmenu', (event) => {
            handleMessageContextMenu($messageRow, event);
        });
    }

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
 * @param {Object|null} message - 被回复的消息对象，传null隐藏预览
 * @returns {void}
 */
const updateReplyPreview = (message) => {
    if (!message) {
        elements.replyPreview.hide();
        return;
    }

    const isMe = message.user_id === CONFIG.ME_USER_ID;
    const senderName = isMe ? '我' : (message.nickname || '对方');

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

    messages.forEach(message => {
        if (!isItemExists(message.id, ITEM_TYPES.MESSAGE)) {
            uniqueMessages.push(message);
        }
    });

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
 * @returns {void}
 */
const addItemToIdSet = (item, type) => {
    const uniqueId = `${type}-${item.id}`;
    state.itemIds.add(uniqueId);

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
 * @returns {number} 消息的时间戳
 */
const appendMessageToTimeline = (message) => {
    const { id, user_id, created_at, nickname, avatar_url, message_type } = message;
    const currentTime = created_at * 1000;
    const isMe = user_id === CONFIG.ME_USER_ID;
    const elementId = generateMessageElementId(id);
    const displayName = isMe ? '我' : nickname;

    if (message_type === MESSAGE_TYPES.DELETED) {
        const item = convertMessageToTimelineItem(message);
        state.timelineItems.push(item);
        addItemToIdSet(message, ITEM_TYPES.MESSAGE);
        return created_at;
    }

    const isCompact = (user_id === state.lastSenderId) &&
        (currentTime - state.lastMsgTime < CONFIG.COMPACT_TIME_LIMIT);

    const isSelected = state.selectedMessages.has(message.id);
    const $messageRow = $('<div>')
        .attr('data-msg-id', elementId)
        .attr('data-message-id', message.id)
        .addClass(`message-row ${isMe ? 'sent' : 'received'} ${isCompact ? 'compact' : ''} ${isSelected ? 'selected' : ''}`);

    const avatarHTML = !isCompact ?
        `<mdui-avatar src="${avatar_url}"></mdui-avatar>` :
        '<div class="avatar-spacer"></div>';

    const nicknameHTML = !isCompact ?
        `<div class="message-nickname">${displayName}</div>` :
        '';

    $messageRow.html(`
        ${avatarHTML}
        <div class="message-content-container">
            ${nicknameHTML}
            ${createMessageBubbleHTML(message)}
        </div>
    `);

    bindMessageEvents($messageRow, message);

    elements.messageList.append($messageRow);

    state.lastSenderId = user_id;
    state.lastMsgTime = currentTime;

    const item = convertMessageToTimelineItem(message);
    state.timelineItems.push(item);
    addItemToIdSet(message, ITEM_TYPES.MESSAGE);

    return created_at;
};

/**
 * 添加事件到时间线
 * @param {Object} event - 事件对象
 * @returns {number} 事件的时间戳
 */
const appendEventToTimeline = (event) => {
    const { created_at } = event;

    const $eventElement = $(createEventMessageHTML(event));

    elements.messageList.append($eventElement);

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
 * @returns {void}
 */
const appendTimelineItems = (items, options = {}) => {
    const { autoScroll = true } = options;
    let lastTimestamp = state.lastItemTime;

    items.forEach(item => {
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
 * @returns {Promise<void>}
 */
const handleMessageDelete = async (messageId) => {
    try {
        await deleteMessageLocally(messageId);

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
 * @returns {Object|null} 消息对象
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
 * @returns {void}
 */
const handleMenuAction = (event) => {
    const $menuItem = $(event.target).closest('mdui-menu-item');
    if (!$menuItem.length || !state.activeMsgRow) return;

    const action = $menuItem.attr('data-action');
    const message = getMessageFromElement(state.activeMsgRow);

    if (!message) return;

    switch (action) {
        case 'message.reply':
            state.replyingTo = message;
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

        case 'message.delete':
            if (message.user_id === CONFIG.ME_USER_ID && message.message_type !== MESSAGE_TYPES.DELETED) {
                handleMessageDelete(message.id);
            }
            break;

        case 'message.forward':
            state.forwardingMessage = message;
            openForwardDialog();
            break;

        case 'message.enter_select_mode':
            enterSelectMode();
            break;
    }

    elements.msgMenu.hide();
};

/**
 * 取消回复
 * @returns {void}
 */
const cancelReply = () => {
    state.replyingTo = null;
    elements.replyPreview.hide();
    elements.chatInput.trigger('focus');
};

/**
 * 打开转发对话框
 * @returns {Promise<void>}
 */
const openForwardDialog = async () => {
    const message = state.forwardingMessage;
    if (!message) return;

    state.selectedMessagesForForward = [];

    elements.forwardDialog.prop('open', true);
    elements.forwardLoading.show();
    elements.forwardContent.hide();

    try {
        const result = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/my`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            }
        });

        const rooms = result.data?.rooms || [];

        const roomList = elements.forwardContent.find('#forwardRoomList');
        roomList.empty();

        rooms.forEach(room => {
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

                roomItem.on('click', function () {
                    roomList.find('.forward-room-item').removeClass('selected');
                    $(this).addClass('selected');
                    state.selectedTargetRoomId = parseInt($(this).attr('data-room-id'));
                });

                roomList.append(roomItem);
            }
        });

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

        elements.forwardLoading.hide();
        elements.forwardContent.show();

        state.selectedTargetRoomId = null;

    } catch (error) {
        console.error('加载聊天室列表失败:', error);
        mdui.snackbar({ message: '加载聊天室列表失败' });
        elements.forwardDialog.prop('open', false);
    }
};

/**
 * 处理消息转发
 * @returns {Promise<void>}
 */
const handleForwardMessage = async () => {
    const message = state.forwardingMessage;
    const selectedMessageIds = state.selectedMessagesForForward;

    if (!message && selectedMessageIds.length === 0) {
        mdui.snackbar({ message: '没有要转发的消息' });
        return;
    }

    const targetRoomId = state.selectedTargetRoomId;

    if (!targetRoomId) {
        mdui.snackbar({ message: '请选择目标聊天室' });
        return;
    }

    const $btn = elements.confirmForward;
    $btn.attr('loading', '').attr('disabled', '');

    try {
        const messageIds = selectedMessageIds.length > 0 ? selectedMessageIds : [message.id];

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

        state.selectedMessages.clear();
        state.selectedMessagesForForward = [];
        state.selectedTargetRoomId = null;
        updateMessageSelectionUI();

        if (state.isSelectMode) {
            exitSelectMode();
        }

    } catch (error) {
        console.error('转发消息失败:', error);
        mdui.snackbar({ message: '转发失败，请重试', placement: 'top' });
    } finally {
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

/**
 * 选择所有消息
 * @returns {void}
 */
const selectAllMessages = () => {
    state.selectedMessages.clear();

    state.timelineItems.forEach(item => {
        if (item.type === ITEM_TYPES.MESSAGE && item.message_type !== MESSAGE_TYPES.DELETED) {
            state.selectedMessages.add(item.id);
        }
    });

    updateMessageSelectionUI();
};

/**
 * 取消选择所有消息
 * @returns {void}
 */
const deselectAllMessages = () => {
    state.selectedMessages.clear();
    updateMessageSelectionUI();
};

/**
 * 进入多选模式
 * @returns {void}
 */
const enterSelectMode = () => {
    state.isSelectMode = true;
    elements.multiSelectToolbar[0].hide = false;
    updateSelectedCount();
};

/**
 * 退出多选模式
 * @returns {void}
 */
const exitSelectMode = () => {
    state.isSelectMode = false;
    elements.multiSelectToolbar[0].hide = true;
    state.selectedMessages.clear();
    state.selectedMessagesForForward = [];
    updateMessageSelectionUI();
};

/**
 * 更新选中消息计数
 * @returns {void}
 */
const updateSelectedCount = () => {
    elements.selectedCount.text(state.selectedMessages.size);
};

/**
 * 转发选中的消息
 * @returns {void}
 */
const forwardSelectedMessages = () => {
    const selectedIds = Array.from(state.selectedMessages);

    if (selectedIds.length === 0) {
        mdui.snackbar({ message: '请先选择要转发的消息' });
        return;
    }

    openForwardDialogForMultiple(selectedIds);
};

/**
 * 处理多选模式下的逐条转发
 * @returns {void}
 */
const handleForwardSingle = () => {
    const selectedIds = Array.from(state.selectedMessages);

    if (selectedIds.length === 0) {
        mdui.snackbar({ message: '请先选择要转发的消息' });
        return;
    }

    openForwardDialogForMultiple(selectedIds, 'single');
};

/**
 * 处理多选模式下的合并转发
 * @returns {void}
 */
const handleForwardMerged = () => {
    const selectedIds = Array.from(state.selectedMessages);

    if (selectedIds.length === 0) {
        mdui.snackbar({ message: '请先选择要转发的消息' });
        return;
    }

    openForwardDialogForMultiple(selectedIds, 'merged');
};

/**
 * 更新消息选择状态的UI
 * @returns {void}
 */
const updateMessageSelectionUI = () => {
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
 * @param {Array<number>} messageIds - 消息ID数组
 * @param {string} mode - 转发模式（single/merged）
 * @returns {Promise<void>}
 */
const openForwardDialogForMultiple = async (messageIds, mode = 'single') => {
    elements.forwardDialog.prop('open', true);
    elements.forwardLoading.show();
    elements.forwardContent.hide();

    try {
        const result = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/my`, {}, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            }
        });

        const rooms = result.data?.rooms || [];

        const roomList = elements.forwardContent.find('#forwardRoomList');
        roomList.empty();

        rooms.forEach(room => {
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

                roomItem.on('click', function () {
                    roomList.find('.forward-room-item').removeClass('selected');
                    $(this).addClass('selected');
                    state.selectedTargetRoomId = parseInt($(this).attr('data-room-id'));
                });

                roomList.append(roomItem);
            }
        });

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

        elements.forwardLoading.hide();
        elements.forwardContent.show();

        state.selectedMessagesForForward = messageIds;
        state.selectedTargetRoomId = null;

    } catch (error) {
        console.error('加载聊天室列表失败:', error);
        mdui.snackbar({ message: '加载聊天室列表失败' });
        elements.forwardDialog.prop('open', false);
    }
};

/**
 * 切换底部应用栏显示/隐藏
 * @returns {void}
 */
const toggleActionBar = () => {
    const actionBar = elements.actionBar[0];
    actionBar.hide = !actionBar.hide;
    elements.emojiPanel.css('display', 'none');
};

/**
 * 打开文件管理对话框
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
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
 * @param {Object} stats - 统计数据
 * @param {number} stats.total_files - 文件总数
 * @param {number} stats.total_size - 总大小（字节）
 * @returns {void}
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
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小字符串
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
 * @param {number} page - 页码
 * @returns {Promise<void>}
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
 * @param {Array} files - 文件数组
 * @returns {void}
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

    elements.fileListContainer.find('.file-delete-btn').on('click', function () {
        const fileId = $(this).attr('data-file-id');
        deleteFile(parseInt(fileId));
    });
};

/**
 * 删除文件
 * @param {number} fileId - 文件ID
 * @returns {void}
 */
const deleteFile = (fileId) => {
    state.currentDeletingFileId = fileId;
    elements.deleteFileDialog.prop('open', true);
};

/**
 * 确认删除文件
 * @returns {Promise<void>}
 */
const confirmDeleteFile = async () => {
    const fileId = state.currentDeletingFileId;
    if (!fileId) return;

    const $btn = elements.confirmDeleteFile;
    $btn.attr('loading', '').attr('disabled', '');

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
    } finally {
        $btn.removeAttr('loading').removeAttr('disabled');
        elements.deleteFileDialog.prop('open', false);
        state.currentDeletingFileId = null;
    }
};

/**
 * 取消删除文件
 * @returns {void}
 */
const cancelDeleteFile = () => {
    elements.deleteFileDialog.prop('open', false);
    state.currentDeletingFileId = null;
};

/**
 * 切换 Markdown 模式
 * @returns {void}
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
    closeActionBar();
};

/**
 * 处理消息发送
 * @returns {Promise<void>}
 */
const handleSendMessage = async () => {
    const messageText = elements.chatInput.val().trim();
    if (!messageText) return;

    const $btn = elements.sendBtn;
    $btn.attr('loading', '').attr('disabled', '');

    try {
        const postData = {
            room_id: state.currentRoomInfo.id,
            content: messageText,
            reply_to: state.replyingTo ? state.replyingTo.id : null
        };

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

        elements.chatInput.val('');
        state.replyingTo = null;
        elements.replyPreview.hide();
    } catch (error) {
        console.error('发送消息失败:', error);
        mdui.snackbar({
            message: '发送消息失败，请重试'
        });
    } finally {
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

/**
 * 处理文件上传（打开文件选择器）
 * @returns {void}
 */
const handleFileUpload = () => {
    elements.fileUploadInput.trigger('click');
    closeActionBar();
};

/**
 * 执行文件上传
 * @param {Event} event - 文件选择事件
 * @returns {Promise<void>}
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

    elements.fileUploadInput.val('');
};

/**
 * 关闭 actionBar
 * @returns {void}
 */
const closeActionBar = () => {
    elements.actionBar[0].hide = true;
    elements.emojiPanel.css('display', 'none');
};

/**
 * 初始化表情面板
 * @returns {void}
 */
const initializeEmojiPanel = () => {
    const tabsContainer = elements.emojiTabs[0];

    emojiWidget.initializeEmojiPanel(tabsContainer, (tabId) => {
        state.currentEmojiTab = tabId;
        renderEmojiContent(tabId);
    });

    renderEmojiContent('mdui');
};

/**
 * 渲染表情内容
 * @param {string} tabId - 标签页ID
 * @returns {void}
 */
const renderEmojiContent = (tabId) => {
    const contentContainer = elements.emojiPanel.find('.emoji-panel-content');

    emojiWidget.renderEmojiContent(contentContainer, tabId, (emojiCode, isCustom) => {
        if (isCustom) {
            insertCustomEmoji(emojiCode);
        } else {
            insertEmoji(emojiCode);
        }
    });
};

/**
 * 插入自定义表情到输入框
 * @param {string} emojiUrl - 表情图片URL
 * @returns {void}
 */
const insertCustomEmoji = (emojiUrl) => {
    const input = elements.chatInput[0];
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const currentValue = elements.chatInput.val();

    const newFormat = `[!emoj_custom.${emojiUrl}]`;

    const newValue = currentValue.substring(0, startPos) + newFormat + currentValue.substring(endPos);

    elements.chatInput.val(newValue);
    input.selectionStart = input.selectionEnd = startPos + newFormat.length;
    elements.chatInput.trigger('focus');

    closeActionBar();
};

/**
 * 插入表情到输入框
 * @param {string} emojiCode - 表情代码
 * @returns {void}
 */
const insertEmoji = (emojiCode) => {
    if (!emojiCode) return;

    const input = elements.chatInput[0];
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const currentValue = elements.chatInput.val();

    const parts = emojiCode.split('_');
    const emojiName = parts[0];
    const emojiCodePart = parts.slice(1).join('_');
    const newFormat = `[!emoj_${emojiName}.${emojiCodePart}]`;

    const newValue = currentValue.substring(0, startPos) + newFormat + currentValue.substring(endPos);

    elements.chatInput.val(newValue);
    input.selectionStart = input.selectionEnd = startPos + newFormat.length;
    elements.chatInput.trigger('focus');

    closeActionBar();
};

/**
 * 解析消息中的表情标签
 * @param {string} content - 消息内容
 * @returns {string} 解析后的内容
 */
const parseEmojiInMessage = (content) => {
    return emojiWidget.parseEmojiInMessage(content);
};

/**
 * 切换表情面板显示/隐藏
 * @returns {void}
 */
const toggleEmojiPanel = () => {
    const panel = elements.emojiPanel;
    if (panel.css('display') !== 'none') {
        panel.css('display', 'none');
    } else {
        panel.css('display', 'flex');
        if (panel.find('.emoji-tab').length === 0) {
            initializeEmojiPanel();
        }
    }
};

/**
 * 打开用户信息弹窗
 * @param {number} userId - 用户ID
 * @returns {Promise<void>}
 */
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
 * 轮询新消息
 * @returns {Promise<void>}
 */
const poll = async () => {
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

        if (!state.isPolling || state.currentRoomInfo?.id !== currentRoomId) {
            return;
        }

        let { messages = [], events = [] } = response.data || { messages: [], events: [] };

        if (events && events.length > 0) {
            events.forEach(event => {
                if (event.event_type === 'room.update') {
                    const newData = event.data?.new_data;
                    if (newData) {
                        state.currentRoomInfo = { ...state.currentRoomInfo, ...newData };
                    }
                }
            });
            if (events.some(e => e.event_type === 'room.update')) {
                updateRoomInfoUI(state.currentRoomInfo);
            }
        }

        if (messages && messages.length > 0) {
            const maxMsgId = Math.max(...messages.map(m => m.id));
            if (maxMsgId > state.lastMessageId) state.lastMessageId = maxMsgId;
        }
        if (events && events.length > 0) {
            const maxEventId = Math.max(...events.map(e => e.id));
            if (maxEventId > state.lastEventId) state.lastEventId = maxEventId;
        }

        const uniqueData = filterDuplicateItems(messages, events);

        for (const event of uniqueData.events) {
            if (event.event_type === EVENT_TYPES.MESSAGE_DELETE) {
                const messageId = event.message_ref_id || event.data?.message_id;
                if (messageId) {
                    await deleteMessageLocally(messageId);
                }
            }
        }

        if (!state.isPolling || state.currentRoomInfo?.id !== currentRoomId) {
            return;
        }

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
        if (state.isPolling && state.currentRoomInfo?.id === currentRoomId) {
            state.pollTimer = setTimeout(poll, CONFIG.POLL_INTERVAL);
        }
    }
};

/**
 * 开始轮询新消息（先加载本地消息，再启动轮询）
 * @returns {Promise<void>}
 */
const startPolling = async () => {
    if (!state.currentRoomInfo || !state.currentRoomInfo.id) {
        console.warn('没有房间信息，无法开始轮询');
        return;
    }

    if (state.isPolling) {
        console.warn('轮询已经在进行中');
        return;
    }

    await loadLocalMessages();

    state.isPolling = true;

    poll();
};

/**
 * 打开更新聊天室信息弹窗
 * @returns {void}
 */
const openRoomUpdateDialog = () => {
    elements.roomUpdateLoading.hide();
    const room = state.currentRoomInfo;
    if (!room) return;

    elements.roomUpdateName.val(room.name || '');
    elements.roomUpdateDesc.val(room.description || '');
    elements.roomUpdateMaxUsers.val(room.max_users || '');
    elements.roomUpdateAvatarPreview.attr('src', room.avatar_url || '');

    elements.roomUpdateAvatarFile.val('');

    elements.roomUpdateDialog.prop('open', true);
};

/**
 * 处理更新聊天室信息
 * @returns {Promise<void>}
 */
const handleRoomUpdate = async () => {
    const room = state.currentRoomInfo;
    if (!room) return;

    const name = elements.roomUpdateName.val().trim();
    if (!name) {
        mdui.snackbar({ message: '聊天室名称不能为空' });
        return;
    }

    const $btn = elements.roomUpdateSubmit;
    $btn.attr('loading', '').attr('disabled', '');
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
            const updatedRoom = result.data;
            state.currentRoomInfo = updatedRoom;

            updateRoomInfoUI(updatedRoom);

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
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

/**
 * 更新房间信息UI
 * @param {Object} room - 房间信息
 * @returns {void}
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
 * @returns {void}
 */
const initializeEventListeners = () => {
    elements.navigationDrawertoggle.on("click", () => {
        elements.navigationDrawer.prop('open', true);
    });

    elements.mobileBackBtn.on("click", () => {
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

    elements.sendBtn.on('click', handleSendMessage);
    elements.chatInput.on('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    elements.addBtn.on('click', toggleActionBar);
    elements.toggleMarkdown.on('click', toggleMarkdownMode);
    elements.uploadFile.on('click', handleFileUpload);
    elements.toggleEmoji.on('click', toggleEmojiPanel);
    elements.openFileManager.on('click', openFileManagerDialog);
    elements.closeActionBar.on('click', closeActionBar);
    elements.fileUploadInput.on('change', executeFileUpload);

    elements.closeFileManager.on('click', () => {
        elements.fileManagerDialog.prop('open', false);
    });
    elements.refreshFileList.on('click', async () => {
        const $btn = elements.refreshFileList;
        $btn.attr('loading', '').attr('disabled', '');
        elements.fileManagerLoading.css('display', 'flex');
        try {
            await Promise.all([
                loadFileStats(),
                loadFileList()
            ]);
        } finally {
            elements.fileManagerLoading.css('display', 'none');
            $btn.removeAttr('loading').removeAttr('disabled');
        }
    });

    $(document).on('click', (event) => {
        if (!$(event.target).closest(elements.emojiPanel).length &&
            !$(event.target).closest(elements.toggleEmoji).length) {
            elements.emojiPanel.css('display', 'none');
        }
    });

    elements.chatInput.on('keydown', (event) => {
        if (event.key === 'Escape') {
            if (state.replyingTo) {
                cancelReply();
            } else if (state.isSelectMode) {
                exitSelectMode();
            }
        }
    });

    $(document).on('keydown', (event) => {
        if (event.key === 'Escape' && state.isSelectMode) {
            exitSelectMode();
        }
    });

    elements.cancelReply.on('click', cancelReply);

    elements.msgMenu.on('click', handleMenuAction);

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

    elements.cancelForward.on('click', () => {
        elements.forwardDialog.prop('open', false);
    });

    elements.confirmForward.on('click', handleForwardMessage);

    elements.closeForwardDetail.on('click', () => {
        elements.forwardDetailDialog.prop('open', false);
    });

    elements.closeNestedForward.on('click', () => {
        if (state.nestedForwardStack.length > 0) {
            const previousData = state.nestedForwardStack.pop();
            elements.nestedForwardDialog.prop('open', false);
            setTimeout(() => {
                openNestedForwardDialog(previousData);
            }, 300);
        } else {
            elements.nestedForwardDialog.prop('open', false);
        }
    });

    elements.closeSelectModeBtn.on('click', exitSelectMode);
    elements.forwardSingleBtn.on('click', handleForwardSingle);
    elements.forwardMergedBtn.on('click', handleForwardMerged);

    elements.sidebarBackBtn.on('click', () => {
        window.location.href = 'index.html';
    });

    elements.sidebarRoomInfoBtn.on('click', () => {
        elements.navigationDrawer.prop('open', true);
    });

    elements.manageRoomBots.on('click', openRoomBotsDialog);
    elements.closeRoomBotsDialog.on('click', () => {
        elements.roomBotsDialog.prop('open', false);
    });
    elements.refreshRoomBots.on('click', loadRoomBots);

    // 监听表情上传事件
    document.addEventListener('emoji.upload', async (event) => {
        const { file } = event.detail;
        if (file) {
            await emojiWidget.uploadCustomEmoji(file, USER_LOGIN_TOKEN, CORE_CONFIG.API_URL);
        }
    });

    elements.closeInstallBotDialog.on('click', () => {
        elements.installBotDialog.prop('open', false);
    });

    elements.cancelDeleteFile.on('click', cancelDeleteFile);
    elements.confirmDeleteFile.on('click', confirmDeleteFile);
};

/**
 * 初始化消息列表的滚动监听
 * @returns {void}
 */
const initializeScrollListener = () => {
    const $messageList = elements.messageList;

    $messageList.on('scroll', () => {
        if (!state.isUserScrolled) {
            state.isUserScrolled = true;
        }

        if (state.scrollCheckTimer) {
            clearTimeout(state.scrollCheckTimer);
        }

        state.scrollCheckTimer = setTimeout(() => {
            if (isUserAtBottom()) {
                state.isUserScrolled = false;
            }
        }, 200);
    });

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
 * @param {Object} room - 聊天室对象
 * @returns {string} HTML字符串
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
 * 更新侧边栏当前房间简介
 * @param {Object} room - 房间信息
 * @returns {void}
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
 * @param {Object} roomData - 房间数据
 * @returns {Promise<void>}
 */
const initializecurrentRoomInfo = async (roomData) => {
    if (!roomData?.data) return;

    if (state.pollTimer) {
        clearTimeout(state.pollTimer);
        state.pollTimer = null;
    }
    state.isPolling = false;

    elements.messageList.html('');
    state.lastMessageId = 0;
    state.lastEventId = 0;
    state.replyingMessage = null;
    elements.replyPreview.css('display', 'none');

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

    const isOwner = data.owner_id === CONFIG.ME_USER_ID;
    if (isOwner) {
        $room.updateBtn.css('display', '');
    } else {
        $room.updateBtn.css('display', 'none');
    }

    startPolling();
};

/**
 * 应用初始化
 * @returns {Promise<void>}
 */
// 全局房间ID变量，由父窗口通过postMessage传递
let currentRoomId = null;
let currentActiveRoomId = null;
let isInitialized = false;
let eventListenersInitialized = false;

/**
 * 监听来自父窗口的消息
 * @param {MessageEvent} event - 消息事件
 * @returns {void}
 */
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'setRoomId') {
        const newRoomId = event.data.roomId;

        if (currentActiveRoomId === newRoomId && isInitialized) {
            if (elements.messageList.html() === '') {
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

/**
 * 初始化应用
 * @returns {Promise<void>}
 */
const initializeApp = async () => {
    try {
        if (!USER_LOGIN_TOKEN) {
            window.location.href = 'login.html';
            return;
        }

        if (!currentRoomId) {
            return;
        }

        if (currentActiveRoomId === currentRoomId && isInitialized) {
            console.debug('Same room, skipping re-initialization');
            return;
        }

        if (isInitialized) {
            cleanupChatRoom();
        }

        if (!eventListenersInitialized) {
            initializeEventListeners();
            initializeScrollListener();
            eventListenersInitialized = true;
        }

        const roomData = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/detail`, {
            room_id: currentRoomId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            },
        });

        await initializecurrentRoomInfo(roomData);

        await bgSettings.load();
        bgSettings.apply();
        bgSettings.watch();

        currentActiveRoomId = currentRoomId;
        isInitialized = true;

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

/**
 * 为表情菜单添加样式
 * @returns {void}
 */
const addEmojiMenuStyles = () => {
    if (!$('style#emoji-menu-styles').length) {
        const styles = `
            <style id="emoji-menu-styles">
                .emoji-menu-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .emoji-menu-item:hover {
                    background-color: rgba(0,0,0,0.05);
                }
            </style>
        `;
        $('head').append(styles);
    }
};

addEmojiMenuStyles();

/**
 * 清理聊天室状态
 * @returns {void}
 */
const cleanupChatRoom = () => {
    if (state.pollTimer) {
        clearTimeout(state.pollTimer);
        state.pollTimer = null;
    }
    state.isPolling = false;

    state.lastMessageId = 0;
    state.lastEventId = 0;
    state.timelineItems = [];
    state.itemIds.clear();
    state.lastSenderId = null;
    state.lastMsgTime = 0;
    state.replyingTo = null;
    state.lastItemTime = 0;
    state.currentRoomInfo = null;

    currentActiveRoomId = null;
    isInitialized = false;

    elements.messageList.html('');
    elements.replyPreview.hide();

    elements.chatInput.val('');

    elements.roomData.title.text('');
    document.title = 'XQFChat Room';
};



/**
 * 打开聊天室机器人管理对话框
 * @returns {Promise<void>}
 */
const openRoomBotsDialog = async () => {
    elements.roomBotsDialog.prop('open', true);
    await loadRoomBots();
};

/**
 * 加载聊天室机器人列表
 * @returns {Promise<void>}
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
 * @param {Array} bots - 机器人数组
 * @returns {void}
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

    $('.uninstall-bot-btn').off('click').on('click', function () {
        const botId = $(this).attr('data-bot-id');
        uninstallBot(botId);
    });

    $('#installBotFromMarketplace').off('click').on('click', openMarketplaceDialog);
};

/**
 * 打开机器人市场对话框
 * @returns {Promise<void>}
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
 * @param {Array} bots - 机器人数组
 * @returns {void}
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

    $('.install-bot-btn').off('click').on('click', function () {
        const botId = $(this).attr('data-bot-id');
        installBot(botId);
    });
};

/**
 * 安装机器人到聊天室
 * @param {number} botId - 机器人ID
 * @returns {Promise<void>}
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
 * @param {number} botId - 机器人ID
 * @returns {Promise<void>}
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