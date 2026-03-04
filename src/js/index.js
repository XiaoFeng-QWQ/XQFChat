"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $ } from './core.js';
import { getFormData, HttpUtil, StorageUtil } from './lib/util.js';

// DOM 元素管理
const elements = {
    // 主页面元素
    roomList: $('#roomList'),
    loading: $('#loading'),
    bottomNav: $('#bottomNav'),
    logoutBtn: $('#logoutBtn'),
    confirmLogoutDialog: $('#confirmLogoutDialog'),
    cancelConfirmLogout: $('#cancelConfirmLogout'),
    confirmLogout: $('#confirmLogout'),
    globalSearchInput: $('#globalSearchInput'),
    globalSearchResults: $('#globalSearchResults'),

    createRoomBtn: $('#createRoomBtn'),

    // 页面容器
    pages: {
        rooms: $('#page-rooms'),
        create: $('#page-create'),
        me: $('#page-me')
    },

    // "我"
    meAvatar: $('#meAvatar'),
    meNickname: $('#meNickname'),
    meEmail: $('#meEmail')
};

// 常量配置
const LAST_TAB_KEY = 'last_tab';

// 下拉刷新状态
const pullToRefreshState = {
    isDragging: false,
    startY: 0,
    currentY: 0,
    isRefreshing: false,
    pullDistance: 0,
    threshold: 60, // 触发刷新的阈值（像素）
    maxPullDistance: 120 // 最大拉动距离
};

/**
 * 初始化下拉刷新
 */
const initializePullToRefresh = () => {
    const $roomList = elements.roomList;

    // 触摸事件处理
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isTouchActive = false;

    // 触摸开始
    const handleTouchStart = (e) => {
        // 只有在顶部且不是正在刷新时才能下拉
        if ($roomList.scrollTop() !== 0 || pullToRefreshState.isRefreshing) {
            return;
        }

        touchStartY = e.originalEvent.touches[0].clientY;
        isTouchActive = true;
        pullToRefreshState.isDragging = true;
        pullToRefreshState.startY = touchStartY;

        // 添加平滑过渡效果
        $roomList.css('transition', 'none');
    };

    // 触摸移动
    const handleTouchMove = (e) => {
        if (!isTouchActive || pullToRefreshState.isRefreshing) return;

        touchCurrentY = e.originalEvent.touches[0].clientY;
        const pullDistance = Math.max(0, touchCurrentY - touchStartY);

        // 限制最大拉动距离
        pullToRefreshState.pullDistance = Math.min(
            pullDistance,
            pullToRefreshState.maxPullDistance
        );

        // 移动房间列表
        updateRoomListPosition(pullToRefreshState.pullDistance);

        // 如果下拉距离超过阈值，阻止默认滚动行为
        if (pullToRefreshState.pullDistance > 10) {
            e.preventDefault();
        }
    };

    // 触摸结束
    const handleTouchEnd = () => {
        if (!isTouchActive) return;

        isTouchActive = false;
        pullToRefreshState.isDragging = false;

        // 如果下拉距离超过阈值，触发刷新
        if (pullToRefreshState.pullDistance >= pullToRefreshState.threshold) {
            triggerRefresh();
        } else {
            resetRoomListPosition();
        }
    };

    // 鼠标事件处理（桌面端）
    let mouseStartY = 0;
    let mouseCurrentY = 0;
    let isMouseActive = false;

    const handleMouseDown = (e) => {
        if ($roomList.scrollTop() !== 0 || pullToRefreshState.isRefreshing) {
            return;
        }

        mouseStartY = e.clientY;
        isMouseActive = true;
        pullToRefreshState.isDragging = true;
        pullToRefreshState.startY = mouseStartY;

        // 添加平滑过渡效果
        $roomList.css('transition', 'none');
    };

    const handleMouseMove = (e) => {
        if (!isMouseActive || pullToRefreshState.isRefreshing) return;

        mouseCurrentY = e.clientY;
        const pullDistance = Math.max(0, mouseCurrentY - mouseStartY);

        pullToRefreshState.pullDistance = Math.min(
            pullDistance,
            pullToRefreshState.maxPullDistance
        );

        updateRoomListPosition(pullToRefreshState.pullDistance);
    };

    const handleMouseUp = () => {
        if (!isMouseActive) return;

        isMouseActive = false;
        pullToRefreshState.isDragging = false;

        if (pullToRefreshState.pullDistance >= pullToRefreshState.threshold) {
            triggerRefresh();
        } else {
            resetRoomListPosition();
        }
    };

    // 添加事件监听器
    $roomList.on('touchstart', handleTouchStart);
    $roomList.on('touchmove', handleTouchMove);
    $roomList.on('touchend', handleTouchEnd);

    $roomList.on('mousedown', handleMouseDown);
    $roomList.on('mousemove', handleMouseMove);
    $roomList.on('mouseup', handleMouseUp);
    $roomList.on('mouseleave', handleMouseUp);

    // 添加滚动监听，滚动时重置下拉状态
    $roomList.on('scroll', () => {
        if ($roomList.scrollTop() > 0 && isTouchActive) {
            isTouchActive = false;
            resetRoomListPosition();
        }
        if ($roomList.scrollTop() > 0 && isMouseActive) {
            isMouseActive = false;
            resetRoomListPosition();
        }
    });

    return {
        refresh: () => triggerRefresh(true) // 手动触发刷新
    };
};

/**
 * 更新房间列表位置
 */
const updateRoomListPosition = (distance) => {
    if (!elements.roomList.length) return;

    // 添加弹性效果：随着下拉距离增加，移动距离减少
    const elasticDistance = distance * 0.6;

    // 移动整个房间列表
    elements.roomList.css('transform', `translateY(${elasticDistance}px)`);

    // 更新提示文本
    updatePullHint(distance);
};

/**
 * 更新下拉提示
 */
const updatePullHint = (distance) => {
    // 创建或获取提示元素
    let $hint = $('.pull-hint');
    if (!$hint.length) {
        $hint = $('<div>').addClass('pull-hint');
        $('body').append($hint);
    }

    if (distance > 0) {
        $hint.css('transform', 'translateY(0)');

        if (distance >= pullToRefreshState.threshold) {
            $hint.text('释放刷新').css('color', 'rgb(var(--mdui-color-primary))');
        } else {
            $hint.text('下拉刷新').css('color', 'rgba(var(--mdui-color-on-surface), 0.7)');
        }
    } else {
        $hint.css('transform', 'translateY(-100%)');
    }
};

/**
 * 重置房间列表位置
 */
const resetRoomListPosition = () => {
    if (!elements.roomList.length) return;

    // 平滑回到原位
    elements.roomList.css({
        transition: 'transform 0.3s ease',
        transform: 'translateY(0)'
    });

    // 移除提示
    const $hint = $('.pull-hint');
    if ($hint.length) {
        $hint.css('transform', 'translateY(-100%)');
    }

    pullToRefreshState.pullDistance = 0;

    // 清除过渡效果
    setTimeout(() => {
        elements.roomList.css('transition', '');
    }, 300);
};

/**
 * 触发刷新
 */
const triggerRefresh = async (manual = false) => {
    if (pullToRefreshState.isRefreshing) return;

    pullToRefreshState.isRefreshing = true;

    // 显示加载动画
    elements.loading.css('display', 'flex');

    // 移动房间列表到刷新位置
    elements.roomList.css({
        transition: 'transform 0.3s ease',
        transform: `translateY(${pullToRefreshState.threshold * 0.6}px)`
    });

    try {
        // 执行刷新操作
        await loadRooms(true); // 传递 true 表示是刷新操作
    } catch (error) {
        console.error('刷新失败:', error);
        mdui.snackbar({
            message: '刷新失败，请重试',
            placement: 'top'
        });
    } finally {
        // 延迟隐藏加载动画并恢复位置
        setTimeout(() => {
            resetRoomListPosition();
            elements.loading.css('display', 'none');
            pullToRefreshState.isRefreshing = false;
        }, 500);
    }
};

// 页面切换功能
const switchPage = (() => {
    let originalSwitch = (name) => {
        // 隐藏所有页面
        Object.values(elements.pages).forEach($page => {
            $page.removeClass('active');
        });

        // 显示目标页面
        elements.pages[name]?.addClass('active');
    };

    // 增强版页面切换，包含特殊页面逻辑
    const enhancedSwitch = (name) => {
        originalSwitch(name);

        // 特殊页面逻辑
        if (name === 'me') {
            loadCurrentUser();
        }
        // 清空全局搜索框
        if (name !== 'rooms') {
            elements.globalSearchInput.val('');
            hideGlobalSearchResults();
        }
    };

    return enhancedSwitch;
})();

// 房间列表渲染
const renderRooms = (rooms) => {
    if (!rooms || rooms.length === 0) {
        elements.roomList.html(`
            <div class="empty-state">
                <mdui-icon style="font-size: 48px;">chat</mdui-icon>
                <p>暂无聊天室</p>
            </div>
        `);
        return;
    }

    elements.roomList.html(rooms.map(room => {
        const lastMsg = room.last_message;
        const lastMessageText = lastMsg?.nickname && lastMsg?.content
            ? `${lastMsg.nickname}: ${lastMsg.content}`
            : '暂无消息';

        const unreadBadge = room.unread_count > 0
            ? `<mdui-badge slot="end-icon" class="unread-badge">${room.unread_count}</mdui-badge>`
            : '';

        return `
        <mdui-list-item clickable data-room-id="${room.id}" mdui-list-item rounded>
            <mdui-avatar slot="icon" src="${room.avatar_url}"></mdui-avatar>
            
            <mdui-list-item-title>${room.name}</mdui-list-item-title>
            
            <mdui-list-item-description>
                <div class="last-message">${lastMessageText}</div>
                <div class="room-meta">
                    <span>
                        <mdui-icon style="font-size: 16px;">groups</mdui-icon>
                        ${room.member_count}
                    </span>
                    <span>
                        <mdui-icon style="font-size: 16px;">circle</mdui-icon>
                        在线 ${room.online_users}
                    </span>
                    <span>
                        <mdui-icon style="font-size: 16px;">person</mdui-icon>
                        ${room.role}
                    </span>
                </div>
            </mdui-list-item-description>
            
            ${unreadBadge}
        </mdui-list-item>
        `;
    }).join(''));
};

// 全局搜索结果显示
const showGlobalSearchResults = () => {
    elements.globalSearchResults.css('display', 'block');
    elements.roomList.css('display', 'none');
};

const hideGlobalSearchResults = () => {
    if (elements.globalSearchResults.length) {
        elements.globalSearchResults.css('display', 'none');
    }
    elements.roomList.css('display', 'block');
};

const renderGlobalSearchResults = (rooms, keyword) => {
    showGlobalSearchResults();

    if (!rooms.length) {
        elements.globalSearchResults.html(`<div style="padding:16px;text-align:center;color:#888;"><b>'${keyword}'</b> 没有找到聊天室</div>`);
        return;
    }

    elements.globalSearchResults.html(rooms.map(room => {
        const joinedText = room.is_joined ? '已加入' : '加入';
        const lastMsg = room.last_message;
        const lastMessageText = lastMsg?.nickname && lastMsg?.content
            ? `${lastMsg.nickname}: ${lastMsg.content}`
            : '暂无消息';

        return `
        <mdui-list-item clickable data-room-id="${room.id}" data-joined="${room.is_joined}" style="margin-bottom:8px; rounded">
            <mdui-avatar slot="icon" src="${room.avatar_url}"></mdui-avatar>
            <mdui-list-item-title>${room.name}</mdui-list-item-title>
            <mdui-list-item-description>
                ${lastMessageText}
                <div class="room-meta">
                    <span><mdui-icon style="font-size:16px">groups</mdui-icon> ${room.member_count}</span>
                    <span><mdui-icon style="font-size:16px">circle</mdui-icon> 在线 ${room.online_users}</span>
                    <span style="float:right;font-weight:600">${joinedText}</span>
                </div>
            </mdui-list-item-description>
        </mdui-list-item>`;
    }).join(''));
};

// 数据加载函数
const loadRooms = async (isRefresh = false) => {
    if (!isRefresh) {
        elements.loading.css('display', 'flex');
    }

    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/rooms/my`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );

        renderRooms(result.data?.rooms || []);
    } catch (err) {
        console.error('加载房间列表失败:', err);
        mdui.snackbar({
            message: '加载房间列表失败',
            timeout: 3000
        });

        // 显示错误状态
        elements.roomList.html(`
            <div class="error-state">
                <mdui-icon style="font-size: 48px;">error</mdui-icon>
                <p>加载失败，请重试</p>
                <mdui-button onclick="window.location.reload()">重新加载</mdui-button>
            </div>
        `);
    } finally {
        elements.loading.css('display', 'none');
    }
};

const loadCurrentUser = async () => {
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.USER_API}/profile/get-current`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );

        const user = result.data;
        if (user) {
            elements.meAvatar.attr('src', user.avatar_url);
            elements.meNickname.text(user.nickname);
            elements.meEmail.text(user.email);
        }
    } catch (err) {
        console.error('获取用户信息失败:', err);
        mdui.snackbar({
            message: '获取用户信息失败',
            timeout: 3000
        });
    }
};

// 创建聊天室
const createChatRoom = async () => {
    const roomInfo = getFormData($('#page-create')[0]);
    const name = roomInfo.name;
    const description = roomInfo.description;
    const maxUsers = roomInfo.max_users;      // 从表单获取
    const tags = roomInfo.tags;                // 可能是数组或单个值

    const avatarFileInput = $('#avatar-file')[0];
    const avatarFile = avatarFileInput?.files[0];

    if (!name) {
        mdui.snackbar({ message: '请输入聊天室名称' });
        return;
    }

    elements.loading.css('display', 'flex');

    try {
        const formData = new FormData();
        formData.append('name', name);
        if (description) formData.append('description', description);
        if (maxUsers) formData.append('max_users', maxUsers);

        // 处理 tags：如果是一个数组，逐个添加；否则直接添加
        if (tags) {
            if (Array.isArray(tags)) {
                tags.forEach(tag => formData.append('tags[]', tag));
            } else {
                formData.append('tags[]', tags);
            }
        }

        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        const result = await HttpUtil.upload(
            `${CORE_CONFIG.API_URL}/rooms/create`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );

        if (result.code === 200) {
            window.location.href = `chat.html?room_id=${result.data.id}`;
        } else {
            throw new Error(result.message || '聊天室创建失败');
        }
    } catch (err) {
        console.error('创建聊天室失败:', err);
        mdui.snackbar({
            message: err?.message || '创建聊天室失败',
            placement: 'top'
        });
    } finally {
        elements.loading.css('display', 'none');
    }
};

// 事件绑定
const bindEvents = () => {
    // 底部导航切换
    elements.bottomNav.on('change', (event) => {
        const value = event.target.value;
        localStorage.setItem(LAST_TAB_KEY, value);
        switchPage(value);
    });

    // 房间列表点击
    elements.roomList.on('click', (event) => {
        const $item = $(event.target).closest('mdui-list-item[data-room-id]');
        if (!$item.length) return;

        const roomId = $item.attr('data-room-id');
        if (roomId) {
            window.location.href = `chat.html?room_id=${roomId}`
        }
    });

    // 全局搜索事件
    let globalSearchTimeout = null;
    elements.globalSearchInput.on('input', (e) => {
        const keyword = e.target.value.trim();
        clearTimeout(globalSearchTimeout);

        if (keyword === '') {
            hideGlobalSearchResults();
            return;
        }

        globalSearchTimeout = setTimeout(async () => {
            try {
                const result = await HttpUtil.get(
                    `${CORE_CONFIG.API_URL}/rooms/search`,
                    { keyword },
                    { headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` } }
                );
                renderGlobalSearchResults(result?.data || [], keyword);
            } catch (err) {
                mdui.snackbar({ message: '搜索失败' });
            }
        }, 300); // 防抖
    });

    // 全局搜索结果点击
    $(document).on('click', async (event) => {
        const $item = $(event.target).closest('mdui-list-item[data-room-id]');
        if (!$item.length || !elements.globalSearchResults.length || elements.globalSearchResults.css('display') !== 'block') return;

        const roomId = $item.attr('data-room-id');
        const isJoined = $item.attr('data-joined') === 'true';

        if (isJoined) {
            window.location.href = `chat.html?room_id=${roomId}`;
            return;
        }

        try {
            await HttpUtil.post(
                `${CORE_CONFIG.API_URL}/rooms/join`,
                { room_id: roomId },
                { headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` } }
            );
            window.location.href = `chat.html?room_id=${roomId}`;
        } catch (err) {
            mdui.snackbar({ message: err?.message || '加入失败' });
        }
    });

    // 创建聊天室按钮点击
    elements.createRoomBtn.on('click', createChatRoom);

    elements.logoutBtn.on('click', (event) => {
        elements.confirmLogoutDialog.prop('open', true);

        elements.confirmLogout.on('click', (event) => {
            HttpUtil.post(
                `${CORE_CONFIG.USER_API}/auth/logout`,
                {},
                {
                    headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` }
                }
            ).then(data => {
                if (data.code === 200) {
                    StorageUtil.removeItem(CORE_CONFIG.STORAGE_KEYS.USER_INFO);
                    window.location.href = 'login.html';
                } else {
                    mdui.snackbar({ message: '退出失败，请检查网络！' });
                }
            })
        });

        elements.cancelConfirmLogout.on('click', (event) => {
            elements.confirmLogoutDialog.prop('open', false);
        });
    });

    const $selectAvatarBtn = $('#select-avatar-btn');
    const $avatarFile = $('#avatar-file');
    const $avatarPreview = $('#avatar-preview');

    if ($selectAvatarBtn.length && $avatarFile.length) {
        $selectAvatarBtn.on('click', () => {
            $avatarFile.trigger('click');
        });

        $avatarFile.on('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 预览图片
                const reader = new FileReader();
                reader.onload = (e) => {
                    $avatarPreview.attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                // 重置为默认头像
                $avatarPreview.attr('src', '');
            }
        });
    }
};

// 初始化
const init = () => {
    bindEvents();
    loadRooms();

    // 初始化下拉刷新
    const pullToRefresh = initializePullToRefresh();

    // 恢复上次的标签页
    const lastTab = localStorage.getItem(LAST_TAB_KEY) || 'rooms';
    elements.bottomNav.val(lastTab);
    switchPage(lastTab);

    // 暴露手动刷新方法到全局（可选）
    window.refreshRoomList = () => pullToRefresh.refresh();
};

// 启动应用
$(document).ready(init);

export { elements };