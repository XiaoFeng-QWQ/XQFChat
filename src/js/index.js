// index.js - 完整修改后的代码

"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $, ThemeManager } from './core.js';
import { getFormData, HttpUtil, StorageUtil, progressManager } from './lib/util.js';

// DOM 元素管理
const elements = {
    // 主页面元素
    roomList: $('#roomList'),
    bottomNav: $('#bottomNav'),
    logoutBtn: $('#logoutBtn'),
    confirmLogoutDialog: $('#confirmLogoutDialog'),
    cancelConfirmLogout: $('#cancelConfirmLogout'),
    confirmLogout: $('#confirmLogout'),
    globalSearchInput: $('#globalSearchInput'),
    globalSearchResults: $('#globalSearchResults'),
    roomChatIframe: $('#roomChatIframe'),
    roomSettingsIframe: $('#roomSettingsIframe'), // 新增：设置页面的 iframe

    createRoomBtn: $('#createRoomBtn'),

    // 页面容器
    pages: {
        rooms: $('#page-rooms'),
        create: $('#page-create'),
        me: $('#page-me'),
        settings: $('#page-settings')
    },

    // "我"
    meAvatar: $('#meAvatar'),
    meNickname: $('#meNickname'),
    meEmail: $('#meEmail'),
    meSettingsIframe: $('#meSettingsIframe'),
    meSettingsPlaceholder: $('#meSettingsPlaceholder'),

    // 设置页面
    settingsLink: $('#settings-link'),
    confirmClearDialog: $('#confirmClearDialog'),
    cancelClear: $('#cancelClear'),
    confirmClear: $('#confirmClear'),
    licenseDialog: $('#licenseDialog'),
    openSourceLicense: $('#openSourceLicense'),
    closeLicenseDialog: $('#closeLicenseDialog')
};

// 常量配置
const LAST_TAB_KEY = 'last_tab';
const PAGE_TRANSITION_DURATION = 300;

// iframe 缓存状态
const iframeCache = {
    chat: {
        loaded: false,
        currentRoomId: null
    },
    settings: {
        loaded: false
    }
};

// 下拉刷新状态
const pullToRefreshState = {
    isDragging: false,
    startY: 0,
    currentY: 0,
    isRefreshing: false,
    pullDistance: 0,
    threshold: 60,
    maxPullDistance: 120
};

/**
 * 初始化下拉刷新
 */
const initializePullToRefresh = () => {
    const $roomList = elements.roomList;

    let touchStartY = 0;
    let touchCurrentY = 0;
    let isTouchActive = false;

    const handleTouchStart = (e) => {
        if ($roomList.scrollTop() !== 0 || pullToRefreshState.isRefreshing) {
            return;
        }

        touchStartY = e.originalEvent.touches[0].clientY;
        isTouchActive = true;
        pullToRefreshState.isDragging = true;
        pullToRefreshState.startY = touchStartY;
        $roomList.css('transition', 'none');
    };

    const handleTouchMove = (e) => {
        if (!isTouchActive || pullToRefreshState.isRefreshing) return;

        touchCurrentY = e.originalEvent.touches[0].clientY;
        const pullDistance = Math.max(0, touchCurrentY - touchStartY);

        pullToRefreshState.pullDistance = Math.min(
            pullDistance,
            pullToRefreshState.maxPullDistance
        );

        updateRoomListPosition(pullToRefreshState.pullDistance);

        if (pullToRefreshState.pullDistance > 10) {
            e.preventDefault();
        }
    };

    const handleTouchEnd = () => {
        if (!isTouchActive) return;

        isTouchActive = false;
        pullToRefreshState.isDragging = false;

        if (pullToRefreshState.pullDistance >= pullToRefreshState.threshold) {
            triggerRefresh();
        } else {
            resetRoomListPosition();
        }
    };

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

    $roomList.on('touchstart', handleTouchStart);
    $roomList.on('touchmove', handleTouchMove);
    $roomList.on('touchend', handleTouchEnd);

    $roomList.on('mousedown', handleMouseDown);
    $roomList.on('mousemove', handleMouseMove);
    $roomList.on('mouseup', handleMouseUp);
    $roomList.on('mouseleave', handleMouseUp);

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
        refresh: () => triggerRefresh(true)
    };
};

const updateRoomListPosition = (distance) => {
    if (!elements.roomList.length) return;
    const elasticDistance = distance * 0.6;
    elements.roomList.css('transform', `translateY(${elasticDistance}px)`);
    updatePullHint(distance);
};

const updatePullHint = (distance) => {
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

const resetRoomListPosition = () => {
    if (!elements.roomList.length) return;

    elements.roomList.css({
        transition: 'transform 0.3s ease',
        transform: 'translateY(0)'
    });

    const $hint = $('.pull-hint');
    if ($hint.length) {
        $hint.css('transform', 'translateY(-100%)');
    }

    pullToRefreshState.pullDistance = 0;

    setTimeout(() => {
        elements.roomList.css('transition', '');
    }, 300);
};

const triggerRefresh = async (manual = false) => {
    if (pullToRefreshState.isRefreshing) return;

    pullToRefreshState.isRefreshing = true;
    progressManager.start();

    elements.roomList.css({
        transition: 'transform 0.3s ease',
        transform: `translateY(${pullToRefreshState.threshold * 0.6}px)`
    });

    try {
        await loadRooms(true);
    } catch (error) {
        console.error('刷新失败:', error);
        mdui.snackbar({
            message: '刷新失败，请重试',
            placement: 'top'
        });
    } finally {
        setTimeout(() => {
            resetRoomListPosition();
            progressManager.stop();
            pullToRefreshState.isRefreshing = false;
        }, 500);
    }
};

/**
 * 更新侧边栏导航的激活状态
 */
const updateSidebarNavActiveState = (pageName) => {
    $('.desktop-sidebar mdui-list-item[data-page]').each((_, item) => {
        const $item = $(item);
        const page = $item.attr('data-page');
        if (page === pageName) {
            $item.attr('active', '');
        } else {
            $item.removeAttr('active');
        }
    });
    $('.desktop-sidebar').val(pageName);
};

/**
 * 淡入淡出页面切换函数
 */
const switchPage = (() => {
    let isTransitioning = false;
    let currentPageName = null;

    const getPageElement = (name) => elements.pages[name];

    const fadeOut = ($element, duration = 200) => {
        return new Promise((resolve) => {
            if (!$element || !$element.length) {
                resolve();
                return;
            }
            $element.css({
                transition: `opacity ${duration}ms ease`,
                opacity: 0
            });
            setTimeout(() => {
                $element.css('display', 'none');
                resolve();
            }, duration);
        });
    };

    const fadeIn = ($element, duration = 200) => {
        return new Promise((resolve) => {
            if (!$element || !$element.length) {
                resolve();
                return;
            }
            $element.css({
                display: 'block',
                opacity: 0,
                transition: `opacity ${duration}ms ease`
            });
            $element.css('opacity', 1);
            setTimeout(() => {
                resolve();
            }, duration);
        });
    };

    const enhancedSwitch = async (name) => {
        if (isTransitioning || currentPageName === name) return;

        const $oldPage = currentPageName ? getPageElement(currentPageName) : null;
        const $newPage = getPageElement(name);

        if (!$newPage || !$newPage.length) return;

        isTransitioning = true;
        progressManager.start();

        // 淡出当前页面
        if ($oldPage && $oldPage.length) {
            await fadeOut($oldPage);
        }

        // 隐藏所有其他页面
        Object.values(elements.pages).forEach($page => {
            if ($page.length && $page[0] !== $newPage[0]) {
                $page.removeClass('active');
                $page.css('display', 'none');
            }
        });

        // 淡入新页面
        await fadeIn($newPage);
        $newPage.addClass('active');

        currentPageName = name;

        // 更新侧边栏导航激活状态
        updateSidebarNavActiveState(name);

        // 特殊页面逻辑
        if (name === 'me') {
            loadCurrentUser();
        }

        // 清空全局搜索框
        if (name !== 'rooms') {
            elements.globalSearchInput.val('');
            hideGlobalSearchResults();
        }

        setTimeout(() => {
            progressManager.stop();
            isTransitioning = false;
        }, 100);
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

const isDesktopRoomIframe = () => {
    return window.innerWidth >= 1024 && elements.pages.rooms.hasClass('active');
};

/**
 * 打开聊天室 iframe（优化版 - 避免白屏）
 */
const openRoomInIframe = (roomId) => {
    if (!roomId) return;

    const $iframe = elements.roomChatIframe;
    const iframeElement = $iframe[0];

    // 如果是同一个房间，不处理
    if (iframeCache.chat.currentRoomId === roomId && iframeCache.chat.loaded) {
        // 确保 iframe 可见
        $('#roomChatPlaceholder').hide();
        $iframe.show();

        if (window.innerWidth < 1024) {
            elements.pages.rooms.addClass('mobile-viewing-room');
            elements.bottomNav.hide();
        }
        return;
    }

    const isIframeLoaded = iframeCache.chat.loaded && iframeElement.src && iframeElement.src.includes('chat.html');

    if (!isIframeLoaded) {
        // 首次加载：设置 src 并等待加载完成
        progressManager.start();

        $iframe.off('load').on('load', function () {
            iframeCache.chat.loaded = true;

            setTimeout(() => {
                progressManager.stop();
            }, 300);

            // 加载完成后发送房间ID
            this.contentWindow.postMessage({
                type: 'setRoomId',
                roomId: roomId
            }, '*');

            iframeCache.chat.currentRoomId = roomId;
        });

        $iframe.attr('src', './src/components/chat.html');
    } else {
        // iframe 已加载，直接发送切换房间的消息，不重新加载
        progressManager.start();

        // 显示加载状态，等待 chat.js 处理完成
        setTimeout(() => {
            progressManager.stop();
        }, 300);

        iframeElement.contentWindow.postMessage({
            type: 'setRoomId',
            roomId: roomId
        }, '*');

        iframeCache.chat.currentRoomId = roomId;
    }

    $('#roomChatPlaceholder').hide();
    $iframe.show();

    if (window.innerWidth < 1024) {
        elements.pages.rooms.addClass('mobile-viewing-room');
        elements.bottomNav.hide();
    }
};

/**
 * 打开设置页面 iframe（优化版 - 避免白屏）
 */
const openSettingsInIframe = () => {
    const $iframe = elements.meSettingsIframe;
    const iframeElement = $iframe[0];

    const isIframeLoaded = iframeCache.settings.loaded && iframeElement.src && iframeElement.src.includes('settings.html');

    if (!isIframeLoaded) {
        // 首次加载：设置 src 并等待加载完成
        $iframe.off('load').on('load', function () {
            iframeCache.settings.loaded = true;
        });

        $iframe.attr('src', './src/components/settings.html');
    }
    // 如果已加载，直接显示，不需要重新加载

    elements.meSettingsPlaceholder.hide();
    $iframe.show();
};

const openRoom = (roomId) => {
    if (elements.pages.rooms.hasClass('active')) {
        openRoomInIframe(roomId);
    }
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

const loadRooms = async (isRefresh = false) => {
    if (!isRefresh) {
        progressManager.start();
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

        elements.roomList.html(`
            <div class="error-state">
                <mdui-icon style="font-size: 48px;">error</mdui-icon>
                <p>加载失败，请重试</p>
                <mdui-button onclick="window.location.reload()">重新加载</mdui-button>
            </div>
        `);
    } finally {
        if (!isRefresh) {
            setTimeout(() => {
                progressManager.stop();
            }, 300);
        }
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

            $('#sidebarUserAvatar').attr('src', user.avatar_url);
        }
    } catch (err) {
        console.error('获取用户信息失败:', err);
        mdui.snackbar({
            message: '获取用户信息失败',
            timeout: 3000
        });
    }
};

const createChatRoom = async () => {
    const roomInfo = getFormData($('#page-create')[0]);
    const name = roomInfo.name;
    const description = roomInfo.description;
    const maxUsers = roomInfo.max_users;
    const tags = roomInfo.tags;

    const avatarFileInput = $('#avatar-file')[0];
    const avatarFile = avatarFileInput?.files[0];

    if (!name) {
        mdui.snackbar({ message: '请输入聊天室名称' });
        return;
    }

    progressManager.start();

    try {
        const formData = new FormData();
        formData.append('name', name);
        if (description) formData.append('description', description);
        if (maxUsers) formData.append('max_users', maxUsers);

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
            const roomId = result.data.id;
            await switchPage('rooms');
            await loadRooms();
            openRoom(roomId);
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
        progressManager.stop();
    }
};

const bindEvents = () => {
    elements.bottomNav.on('change', (event) => {
        const value = event.target.value;
        localStorage.setItem(LAST_TAB_KEY, value);
        switchPage(value);
    });

    $(document).on('change', '.desktop-sidebar', (event) => {
        const value = event.target.value;
        localStorage.setItem(LAST_TAB_KEY, value);
        switchPage(value);
    });

    $(document).on('click', '.desktop-sidebar mdui-list-item[data-page]', (event) => {
        const $item = $(event.target).closest('mdui-list-item[data-page]');
        if (!$item.length) return;

        const page = $item.attr('data-page');
        if (page) {
            localStorage.setItem(LAST_TAB_KEY, page);
            switchPage(page);
        }
    });

    $(document).on('click', '#sidebar-theme-toggle', (event) => {
        event.preventDefault();
        event.stopPropagation();
        ThemeManager.toggleTheme();
    });

    $(document).on('click', '#weatherTemp', (event) => {
        event.preventDefault();
        showWeatherDetails();
    });

    elements.roomList.on('click', (event) => {
        const $item = $(event.target).closest('mdui-list-item[data-room-id]');
        if (!$item.length) return;

        const roomId = $item.attr('data-room-id');
        if (!roomId) return;

        if (isDesktopRoomIframe() && $item.hasClass('active')) {
            return;
        }

        elements.roomList.find('mdui-list-item').removeClass('active');
        $item.addClass('active');

        openRoom(roomId);
    });

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
        }, 300);
    });

    $(document).on('click', async (event) => {
        const $item = $(event.target).closest('mdui-list-item[data-room-id]');
        if (!$item.length || !elements.globalSearchResults.length || elements.globalSearchResults.css('display') !== 'block') return;

        const roomId = $item.attr('data-room-id');
        const isJoined = $item.attr('data-joined') === 'true';

        if (isJoined) {
            openRoom(roomId);
            return;
        }

        try {
            await HttpUtil.post(
                `${CORE_CONFIG.API_URL}/rooms/join`,
                { room_id: roomId },
                { headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` } }
            );
            openRoom(roomId);
        } catch (err) {
            mdui.snackbar({ message: err?.message || '加入失败' });
        }
    });

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
                const reader = new FileReader();
                reader.onload = (e) => {
                    $avatarPreview.attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                $avatarPreview.attr('src', '');
            }
        });
    }

    $('#settings-link').on('click', (e) => {
        e.preventDefault();

        // 使用优化后的设置打开方法
        openSettingsInIframe();

        if (window.innerWidth >= 1024) {
            // 桌面端处理
        } else {
            switchPage('me');
            elements.pages.me.addClass('mobile-viewing-settings');
            elements.bottomNav.hide();
        }
    });

    $('#closeWeatherDialog').on('click', () => {
        $('#weatherDialog')[0].open = false;
    });

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'switchRoom') {
            const roomId = event.data.roomId;
            if (roomId) {
                openRoom(roomId);
            } else {
                switchPage('rooms');
                progressManager.start();
                elements.roomChatIframe.hide();
                $('#roomChatPlaceholder').show();

                setTimeout(() => {
                    progressManager.stop();
                }, 300);

                if (window.innerWidth < 1024) {
                    elements.pages.rooms.removeClass('mobile-viewing-room');
                    elements.bottomNav.show();
                }

                loadRooms();
            }
        } else if (event.data && event.data.type === 'settingsBack') {
            elements.pages.me.removeClass('mobile-viewing-settings');
            elements.meSettingsPlaceholder.show();
            elements.bottomNav.show();
            elements.meSettingsIframe.hide();
        } else if (event.data && event.data.type === 'chatRoomReady') {
            // chat.js 通知父窗口 iframe 已准备就绪
            iframeCache.chat.loaded = true;
            progressManager.stop();
        }
    });
};

const init = async () => {
    progressManager.init();

    if (!USER_LOGIN_TOKEN) {
        window.location.href = 'login.html';
        return;
    }

    if (window.innerWidth >= 1024) {
        elements.bottomNav.css('display', 'none');
    }

    Object.values(elements.pages).forEach($page => {
        if ($page.length) {
            $page.removeClass('active');
            $page.css('display', 'none');
        }
    });

    await loadCurrentUser();
    loadWeather();
    bindEvents();
    await loadRooms();

    const pullToRefresh = initializePullToRefresh();

    const lastTab = localStorage.getItem(LAST_TAB_KEY) || 'rooms';
    elements.bottomNav.val(lastTab);
    $('.desktop-sidebar').val(lastTab);

    updateSidebarNavActiveState(lastTab);

    await switchPage(lastTab);

    window.refreshRoomList = () => pullToRefresh.refresh();
};

let weatherData = null;

const loadWeather = async () => {
    try {
        const response = await fetch('https://api.xiaofengqwq.com/api/v1/tools/weather?type=full');
        const data = await response.json();

        if (data.code === 200 && data.data) {
            weatherData = data.data;
            const weather = data.data;
            $('#weatherLocation').text(weather.city);
            $('#weatherTemp').text(`${weather.temp}°C`);
            $('#weatherDesc').text(weather.weather);
        } else {
            weatherData = null;
            $('#weatherLocation').text('获取失败');
            $('#weatherTemp').text('--°C');
            $('#weatherDesc').text('天气信息');
        }
    } catch (error) {
        console.error('获取天气信息失败:', error);
        weatherData = null;
        $('#weatherLocation').text('获取失败');
        $('#weatherTemp').text('--°C');
        $('#weatherDesc').text('天气信息');
    }
};

const showWeatherDetails = () => {
    if (!weatherData) {
        mdui.alert('暂无天气数据');
        return;
    }

    const current = weatherData.current;

    $('#weatherDialogCity').text(weatherData.city);
    $('#weatherDialogTemp').text(`${weatherData.temp}°C`);
    $('#weatherDialogCondition').text(weatherData.weather);

    const weatherIcon = getWeatherIcon(weatherData.weather);
    $('#weatherDialogIcon').text(weatherIcon);

    if (current) {
        $('#weatherFeelsLike').text(`${current.feels_like}°C`);
        $('#weatherHumidity').text(`${current.humidity}%`);
        $('#weatherVisibility').text(`${current.visibility}km`);
        $('#weatherWindSpeed').text(`${current.wind_speed}km/h`);
        $('#weatherObsTime').text(current.obs_time || '--');
    } else {
        $('#weatherObsTime').text('--');
    }

    const livingIndices = weatherData.living || [];
    let livingHtml = '';
    livingIndices.forEach(item => {
        const levelColor = getLivingIndexColor(item.level);
        livingHtml += `
            <div class="living-index-item">
                <div>
                    <div class="living-index-name">${item.name}</div>
                    <div class="living-index-desc">${item.text}</div>
                </div>
                <div class="living-index-value" style="color: ${levelColor}">${item.category}</div>
            </div>
        `;
    });
    $('#weatherLivingIndices').html(livingHtml);

    $('#weatherDialog')[0].open = true;
};

const getWeatherIcon = (weather) => {
    const weatherMap = {
        '晴': 'wb_sunny',
        '多云': 'wb_cloudy',
        '阴': 'cloud',
        '雨': 'grain',
        '雪': 'ac_unit',
        '雾': 'foggy',
        '霾': 'foggy'
    };

    for (const [key, icon] of Object.entries(weatherMap)) {
        if (weather.includes(key)) {
            return icon;
        }
    }
    return 'wb_sunny';
};

const getLivingIndexColor = (level) => {
    const colors = {
        1: '#4caf50',
        2: '#ff9800',
        3: '#2196f3',
        4: '#f44336',
        5: '#9c27b0'
    };
    return colors[level] || '#666';
};

$(document).ready(init);

export { elements };