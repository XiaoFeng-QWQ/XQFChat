"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $ } from './core.js';
import { HttpUtil, StorageUtil, formatTime, IndexedDBUtil } from './lib/util.js';

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
    navigationDrawer: $('#navigationDrawer'),
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
    }
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
                <b>${senderName}:</b> ${repliedContent}
            </div>`;
        }
    }

    // 根据消息类型处理内容
    switch (message_type) {
        case MESSAGE_TYPES.TEXT:
            messageHTML = `<div class="text-body">${content}</div>`;
            break;

        case MESSAGE_TYPES.MARKDOWN:
            messageHTML = `<div class="text-body markdown-content mdui-prose">${marked.parse(content || '')}</div>`;
            break;

        case MESSAGE_TYPES.CARD_FILE:
            messageHTML = createFileCardHTML(typeof content === 'object' ? content : {});
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

    // 定位菜单
    elements.msgMenu.css({
        display: 'block',
        position: 'fixed',
        left: Math.min(clientX, window.innerWidth - 150) + 'px',
        top: Math.min(clientY, window.innerHeight - 150) + 'px'
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
        $quoteElement.on('click', () => {
            scrollToMessage(message.reply_to);
        });
    }

    // 右键菜单事件
    const $bubbleElement = $messageRow.find('.message-bubble');
    if ($bubbleElement.length) {
        $bubbleElement.on('contextmenu', (event) => {
            handleMessageContextMenu($messageRow, event);
        });
    }

    // 双击消息快速回复
    $bubbleElement.on('dblclick', () => {
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
    const $messageRow = $('<div>')
        .attr('data-msg-id', elementId)
        .addClass(`message-row ${isMe ? 'sent' : 'received'} ${isCompact ? 'compact' : ''}`);

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
 * 处理消息发送
 */
const handleSendMessage = async () => {
    const messageText = elements.chatInput.val().trim();
    if (!messageText) return;

    try {
        // 发送消息到服务器
        await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/chat/send`,
            {
                room_id: state.currentRoomInfo.id,
                content: messageText,
                reply_to: state.replyingTo ? state.replyingTo.id : null
            },
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
    if (!state.currentRoomInfo || !state.currentRoomInfo.id) {
        if (state.isPolling) {
            state.pollTimer = setTimeout(poll, CONFIG.POLL_INTERVAL);
        }
        return;
    }

    try {
        const params = {
            room_id: state.currentRoomInfo.id,
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

        let { messages, events } = response.data;

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
        if (messages.length > 0) {
            const maxMsgId = Math.max(...messages.map(m => m.id));
            if (maxMsgId > state.lastMessageId) state.lastMessageId = maxMsgId;
        }
        if (events.length > 0) {
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
        if (state.isPolling) {
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
    console.debug(room);
};

/**
 * 初始化事件监听器
 */
const initializeEventListeners = () => {
    elements.navigationDrawertoggle.on("click", () => {
        elements.navigationDrawer.prop('open', true);
    });

    elements.leaveRoom.on("click", () => {
        elements.confirmLeaveRoomDialog.prop('open', true);
        elements.confirmLeaveRoom.on('click', (event) => {
            HttpUtil.get(
                `${CORE_CONFIG.API_URL}/rooms/leave`,
                {
                    room_id: state.currentRoomInfo.id
                },
                {
                    headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` }
                }
            ).then(data => {
                if (data.code === 200) {
                    window.location.href = 'index.html';
                } else {
                    mdui.snackbar({ message: '退出失败，请检查网络！' });
                }
            })
        });
        elements.cancelConfirmLeaveRoom.on('click', (event) => {
            elements.confirmLeaveRoomDialog.prop('open', false);
        });
    });

    // 发送消息事件
    elements.sendBtn.on('click', handleSendMessage);
    elements.chatInput.on('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // 按ESC键取消回复
    elements.chatInput.on('keydown', (event) => {
        if (event.key === 'Escape' && state.replyingTo) {
            cancelReply();
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
 * 初始化当前房间信息
 */
const initializecurrentRoomInfo = async (roomData) => {
    if (!roomData?.data) return;

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
const initializeApp = async () => {
    try {
        initializeEventListeners();
        initializeScrollListener();

        const roomId = new URLSearchParams(window.location.search).get('room_id');
        if (!roomId) {
            throw new Error('未指定房间ID');
        }

        // 获取房间详情
        const roomData = await HttpUtil.get(`${CORE_CONFIG.API_URL}/rooms/detail`, {
            room_id: roomId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
            },
        });

        // 等待房间详情初始化完成（包含初始消息加载和轮询启动）
        await initializecurrentRoomInfo(roomData);

        // 添加初始焦点
        setTimeout(() => {
            elements.chatInput.trigger('focus');
        }, 300);

        await bgSettings.load();
        bgSettings.apply();
        bgSettings.watch();

        console.debug(state)
    } catch (error) {
        console.error('初始化失败:', error);
        mdui.snackbar({
            message: `初始化失败：${error.message || error}`
        });
    }
};

initializeApp();

export { elements };