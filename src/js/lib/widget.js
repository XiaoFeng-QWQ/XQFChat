/**
 * widget
 * ==========
 */
import { $ } from '../core.js';
import { IndexedDBUtil } from './util.js';

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
 * 天气小部件
 * ==========
 */
const weatherWidget = {
    weatherData: null,

    /**
     * 加载天气数据
     * ==========
     * 从API获取当前城市的天气信息，并更新页面上的天气显示区域
     * 
     * @returns {Promise<void>}
     */
    loadWeather: async function () {
        try {
            const response = await fetch('https://api.xiaofengqwq.com/api/v1/tools/weather?type=full');
            const data = await response.json();

            if (data.code === 200 && data.data) {
                this.weatherData = data.data;
                const weather = data.data;
                $('#weatherLocation').text(weather.city);
                $('#weatherTemp').text(`${weather.temp}°C`);
                $('#weatherDesc').text(weather.weather);
            } else {
                this.weatherData = null;
                $('#weatherLocation').text('获取失败');
                $('#weatherTemp').text('--°C');
                $('#weatherDesc').text('天气信息');
            }
        } catch (error) {
            console.error('获取天气信息失败:', error);
            this.weatherData = null;
            $('#weatherLocation').text('获取失败');
            $('#weatherTemp').text('--°C');
            $('#weatherDesc').text('天气信息');
        }
    },

    /**
     * 显示天气详情对话框
     * ==================
     * 展示完整的天气信息，包括：
     * - 当前温度、体感温度
     * - 湿度、能见度、风速
     * - 生活指数（紫外线、穿衣、钓鱼等）
     */
    showWeatherDetails: function () {
        if (!this.weatherData) {
            mdui.alert('暂无天气数据');
            return;
        }

        const current = this.weatherData.current;
        const livingIndexColor = {
            1: '#4caf50',
            2: '#ff9800',
            3: '#2196f3',
            4: '#f44336',
            5: '#9c27b0'
        };

        $('#weatherDialogCity').text(this.weatherData.city);
        $('#weatherDialogTemp').text(`${this.weatherData.temp}°C`);
        $('#weatherDialogCondition').text(this.weatherData.weather);

        const weatherIcon = this.getWeatherIcon(this.weatherData.weather);
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

        const livingIndices = this.weatherData.living || [];
        let livingHtml = '';
        livingIndices.forEach(item => {
            const levelColor = livingIndexColor[item.level] || '#666';
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
    },

    /**
     * 获取天气对应的图标
     * ==================
     * 根据天气描述文字匹配对应的 Material 图标名称
     * 
     * @param {string} weather - 天气描述文字（如：晴、多云、小雨等）
     * @returns {string} Material 图标名称
     */
    getWeatherIcon: function (weather) {
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
    }
};

/**
 * 表情小部件
 * ==========
 */
const emojiWidget = {
    emojiList: emojiList,
    activeEmojiItem: null,

    /**
     * 解析表情代码为 HTML
     * @param {string} emojiCode - 表情代码
     * @returns {string} HTML字符串
     */
    parseEmojiCode: function (emojiCode) {
        if (emojiCode.startsWith('custom_')) {
            const emojiUrl = emojiCode.substring(7);
            return `<img src="${emojiUrl}" class="emoji-img" alt="自定义表情">`;
        }

        for (const category of this.emojiList) {
            for (const emoji of category.emojis) {
                if (emoji.code === emojiCode) {
                    return emoji.icon;
                }
            }
        }
        return `[${emojiCode}]`;
    },

    /**
     * 解析消息中的表情标签
     * @param {string} content - 消息内容
     * @returns {string} 解析后的内容
     */
    parseEmojiInMessage: function (content) {
        if (!content) return content;

        const emojiRegex = /\[!emoj_([^\.]+)\.([^\]]+)\]/g;

        return content.replace(emojiRegex, (match, emojiName, emojiCodePart) => {
            const fullCode = `${emojiName}_${emojiCodePart}`;
            return this.parseEmojiCode(fullCode);
        });
    },

    /**
     * 初始化表情面板
     * @param {HTMLElement} tabsContainer - 标签容器元素
     * @param {Function} onTabChange - 标签切换回调
     * @returns {void}
     */
    initializeEmojiPanel: function (tabsContainer, onTabChange) {
        tabsContainer.innerHTML = '';

        this.emojiList.forEach((category) => {
            const tab = document.createElement('mdui-tab');
            tab.value = category.id;
            tab.textContent = category.name;
            tabsContainer.appendChild(tab);
        });

        const customTab = document.createElement('mdui-tab');
        customTab.value = 'custom';
        customTab.textContent = '自定义';
        tabsContainer.appendChild(customTab);

        tabsContainer.addEventListener('change', (event) => {
            const tabId = event.target.value;
            if (onTabChange) {
                onTabChange(tabId);
            }
        });
    },

    /**
     * 渲染表情内容
     * @param {jQuery} contentContainer - 内容容器
     * @param {string} tabId - 标签页ID
     * @param {Function} onEmojiClick - 表情点击回调
     * @returns {void}
     */
    renderEmojiContent: function (contentContainer, tabId, onEmojiClick) {
        if (tabId === 'custom') {
            this.renderCustomEmojiContent(contentContainer, onEmojiClick);
        } else {
            const category = this.emojiList.find(c => c.id === tabId);
            if (!category) return;

            let contentHTML = '<div class="emoji-grid">';
            category.emojis.forEach(emoji => {
                contentHTML += `<div class="emoji-item" data-emoji-code="${emoji.code}" title="${emoji.name}">${emoji.icon}</div>`;
            });
            contentHTML += '</div>';
            contentContainer.html(contentHTML);

            contentContainer.off('click', '.emoji-item').on('click', '.emoji-item', function () {
                const emojiCode = $(this).attr('data-emoji-code');
                if (onEmojiClick) {
                    onEmojiClick(emojiCode);
                }
            });
        }
    },

    /**
     * 渲染自定义表情内容
     * @param {jQuery} container - 容器元素
     * @param {Function} onEmojiClick - 表情点击回调
     * @returns {void}
     */
    renderCustomEmojiContent: function (container, onEmojiClick) {
        let contentHTML = `
            <div class="custom-emoji-container">
                <div class="emoji-grid" id="customEmojiGrid">
                    <div class="emoji-item upload-emoji-item" id="uploadEmojiBtn" title="上传表情">
                        <mdui-icon>add</mdui-icon>
                    </div>
                </div>
            </div>
            <div class="mdui-circular-progress-overlay" id="customEmojiLoading" style="display: none;">
                <mdui-circular-progress></mdui-circular-progress>
            </div>
            <input type="file" id="emojiFileInput" accept="image/*" style="display: none;">
        `;
        container.html(contentHTML);

        this.loadCustomEmojis(container, onEmojiClick);
    },

    /**
     * 加载自定义表情
     * @param {jQuery} container - 容器元素
     * @param {Function} onEmojiClick - 表情点击回调
     * @returns {Promise<void>}
     */
    loadCustomEmojis: async function (container, onEmojiClick) {
        try {
            $('#customEmojiLoading').css('display', 'flex');

            const userSettings = await IndexedDBUtil.getItem('user_settings', {}, 'chatData');
            const customEmojis = userSettings.customEmojis || [];

            const grid = $('#customEmojiGrid');
            grid.html('<div class="emoji-item upload-emoji-item" id="uploadEmojiBtn" title="上传表情"><mdui-icon>add</mdui-icon></div>');

            customEmojis.forEach(emoji => {
                const emojiItem = `
                    <div class="emoji-item" data-emoji-url="${emoji.url}" title="${emoji.name}">
                        <img src="${emoji.url}" class="emoji-img" alt="${emoji.name}">
                    </div>
                `;
                grid.append(emojiItem);
            });

            grid.off('click', '.emoji-item[data-emoji-url]').on('click', '.emoji-item[data-emoji-url]', function () {
                const emojiUrl = $(this).attr('data-emoji-url');
                if (onEmojiClick) {
                    onEmojiClick(emojiUrl, true);
                }
            });

            grid.off('contextmenu', '.emoji-item[data-emoji-url]').on('contextmenu', '.emoji-item[data-emoji-url]', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.handleEmojiContextMenu($(event.currentTarget), event);
            });

            grid.off('click', '#uploadEmojiBtn').on('click', '#uploadEmojiBtn', function () {
                $('#emojiFileInput').click();
            });

            // 为文件输入绑定 change 事件
            container.off('change', '#emojiFileInput').on('change', '#emojiFileInput', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // 触发文件上传
                    const uploadEvent = new CustomEvent('emoji.upload', { detail: { file } });
                    document.dispatchEvent(uploadEvent);
                }
            });
        } catch (error) {
            console.error('加载自定义表情失败:', error);
        } finally {
            $('#customEmojiLoading').css('display', 'none');
        }
    },

    /**
     * 处理表情右键菜单
     * @param {jQuery} $emojiItem - 表情项元素
     * @param {Event} event - 事件对象
     * @returns {void}
     */
    handleEmojiContextMenu: function ($emojiItem, event) {
        event.preventDefault();
        event.stopPropagation();

        const { clientX, clientY } = event;

        this.activeEmojiItem = $emojiItem;

        $('#emojiContextMenu').remove();

        const menuHTML = `
            <mdui-menu id="emojiContextMenu" style="position: fixed; z-index: 9999; left: ${clientX}px; top: ${clientY}px;">
                <mdui-menu-item data-action="emoji.rename">修改备注</mdui-menu-item>
                <mdui-menu-item data-action="emoji.moveToFront">移至最前</mdui-menu-item>
                <mdui-menu-item data-action="emoji.delete">删除</mdui-menu-item>
            </mdui-menu>
        `;

        $('body').append(menuHTML);

        const menu = document.getElementById('emojiContextMenu');

        menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('mdui-menu-item');
            if (menuItem) {
                const action = menuItem.getAttribute('data-action');
                this.handleEmojiMenuAction(action);
            }
            setTimeout(() => {
                menu.remove();
            }, 100);
        });

        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    },

    /**
     * 处理表情菜单项点击
     * @param {string} action - 操作类型
     * @returns {Promise<void>}
     */
    handleEmojiMenuAction: async function (action) {
        if (!this.activeEmojiItem) return;

        const emojiUrl = this.activeEmojiItem.attr('data-emoji-url');
        if (!emojiUrl) return;

        switch (action) {
            case 'emoji.rename':
                await this.openEmojiRenameDialog(emojiUrl);
                break;
            case 'emoji.moveToFront':
                await this.moveEmojiToFront(emojiUrl);
                break;
            case 'emoji.delete':
                await this.deleteCustomEmoji(emojiUrl);
                break;
        }
    },

    /**
     * 打开修改表情名字弹窗
     * @param {string} emojiUrl - 表情图片URL
     * @returns {Promise<void>}
     */
    openEmojiRenameDialog: async function (emojiUrl) {
        try {
            const userSettings = await IndexedDBUtil.getItem('user_settings', {}, 'chatData');
            const customEmojis = userSettings.customEmojis || [];
            const currentEmoji = customEmojis.find(emoji => emoji.url === emojiUrl);
            if (!currentEmoji) return;

            $('#emojiRenameDialog').prop('headline', `修改${currentEmoji.name}的备注`);
            $('#emojiNewName').val(currentEmoji.name);

            $('#emojiRenameDialog').prop('open', true);

            $('#cancelRename').off('click');
            $('#confirmRename').off('click');

            $('#cancelRename').on('click', function () {
                $('#emojiRenameDialog').prop('open', false);
            });

            const self = this;
            $('#confirmRename').on('click', async function () {
                const newName = $('#emojiNewName').val().trim();
                if (newName) {
                    await self.renameCustomEmoji(emojiUrl, newName);
                    $('#emojiRenameDialog').prop('open', false);
                } else {
                    mdui.snackbar({ message: '新备注不能为空' });
                }
            });
        } catch (error) {
            console.error('打开修改表情备注弹窗失败:', error);
            mdui.snackbar({ message: '操作失败，请重试' });
        }
    },

    /**
     * 修改自定义表情名字
     * @param {string} emojiUrl - 表情图片URL
     * @param {string} newName - 新的表情名字
     * @returns {Promise<void>}
     */
    renameCustomEmoji: async function (emojiUrl, newName) {
        try {
            const userSettings = await IndexedDBUtil.getItem('user_settings', {}, 'chatData');
            const customEmojis = userSettings.customEmojis || [];

            const updatedEmojis = customEmojis.map(emoji => {
                if (emoji.url === emojiUrl) {
                    return { ...emoji, name: newName };
                }
                return emoji;
            });

            await IndexedDBUtil.setItem('user_settings', { ...userSettings, customEmojis: updatedEmojis }, 'chatData');

            this.loadCustomEmojis($('#emojiPanel .emoji-panel-content'));

            mdui.snackbar({ message: '表情名字修改成功' });
        } catch (error) {
            console.error('修改自定义表情名字失败:', error);
            mdui.snackbar({ message: '修改失败，请重试' });
        }
    },

    /**
     * 移动表情到最前面
     * @param {string} emojiUrl - 表情图片URL
     * @returns {Promise<void>}
     */
    moveEmojiToFront: async function (emojiUrl) {
        try {
            const userSettings = await IndexedDBUtil.getItem('user_settings', {}, 'chatData');
            const customEmojis = userSettings.customEmojis || [];

            const emojiToMove = customEmojis.find(emoji => emoji.url === emojiUrl);
            if (!emojiToMove) return;
            const filteredEmojis = customEmojis.filter(emoji => emoji.url !== emojiUrl);

            const updatedEmojis = [emojiToMove, ...filteredEmojis];

            await IndexedDBUtil.setItem('user_settings', { ...userSettings, customEmojis: updatedEmojis }, 'chatData');

            this.loadCustomEmojis($('#emojiPanel .emoji-panel-content'));

            mdui.snackbar({ message: '表情已移动到最前面' });
        } catch (error) {
            console.error('移动表情失败:', error);
            mdui.snackbar({ message: '操作失败，请重试' });
        }
    },

    /**
     * 删除自定义表情
     * @param {string} emojiUrl - 表情图片URL
     * @returns {Promise<void>}
     */
    deleteCustomEmoji: async function (emojiUrl) {
        try {
            const userSettings = await IndexedDBUtil.getItem('user_settings', {}, 'chatData');
            const customEmojis = userSettings.customEmojis || [];

            const updatedEmojis = customEmojis.filter(emoji => emoji.url !== emojiUrl);

            await IndexedDBUtil.setItem('user_settings', { ...userSettings, customEmojis: updatedEmojis }, 'chatData');

            this.loadCustomEmojis($('#emojiPanel .emoji-panel-content'));

            mdui.snackbar({ message: '表情删除成功' });
        } catch (error) {
            console.error('删除自定义表情失败:', error);
            mdui.snackbar({ message: '删除失败，请重试' });
        }
    },

    /**
     * 上传自定义表情
     * @param {File} file - 图片文件
     * @param {string} token - 用户登录令牌
     * @param {string} apiUrl - API URL
     * @returns {Promise<void>}
     */
    uploadCustomEmoji: async function (file, token, apiUrl) {
        try {
            $('#customEmojiLoading').css('display', 'flex');

            const formData = new FormData();
            formData.append('category', 'emoji');
            formData.append('metadata', JSON.stringify({ type: 'emoji' }));
            formData.append('file', file);

            const response = await fetch(`${apiUrl}/files/upload-public`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.code === 200 && result.data.file_url) {
                const userSettings = await IndexedDBUtil.getItem('user_settings', {}, 'chatData');
                const customEmojis = userSettings.customEmojis || [];

                customEmojis.push({
                    name: file.name,
                    url: result.data.file_url,
                    addedAt: Date.now()
                });

                await IndexedDBUtil.setItem('user_settings', { ...userSettings, customEmojis }, 'chatData');

                this.loadCustomEmojis($('#emojiPanel .emoji-panel-content'));

                mdui.snackbar({ message: '自定义表情上传成功' });
            } else {
                mdui.snackbar({ message: '上传失败，请重试' });
            }
        } catch (error) {
            console.error('上传自定义表情失败:', error);
            mdui.snackbar({ message: '上传失败，请重试' });
        } finally {
            $('#customEmojiLoading').css('display', 'none');
        }
    }
};

export { weatherWidget, emojiWidget };