"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $, ThemeManager } from './core.js';
import { HttpUtil, StorageUtil, progressManager } from './lib/util.js';

const elements = {
    botsBack: $('#bots-back'),
    addBotBtn: $('#addBotBtn'),
    createFirstBotBtn: $('#createFirstBotBtn'),
    botsLoading: $('#botsLoading'),
    botsList: $('#botsList'),
    botsEmpty: $('#botsEmpty'),
    
    createBotDialog: $('#createBotDialog'),
    createBotForm: $('#createBotForm'),
    botName: $('#botName'),
    botDescription: $('#botDescription'),
    botWebhookUrl: $('#botWebhookUrl'),
    eventTypesChipSet: $('#eventTypesChipSet'),
    cancelCreateBot: $('#cancelCreateBot'),
    submitCreateBot: $('#submitCreateBot'),
    
    editBotDialog: $('#editBotDialog'),
    editBotForm: $('#editBotForm'),
    editBotId: $('#editBotId'),
    editBotName: $('#editBotName'),
    editBotDescription: $('#editBotDescription'),
    editBotAvatarUrl: $('#editBotAvatarUrl'),
    editBotWebhookUrl: $('#editBotWebhookUrl'),
    cancelEditBot: $('#cancelEditBot'),
    submitEditBot: $('#submitEditBot'),
    openMarketplaceSettings: $('#openMarketplaceSettings'),
    
    // 市场发布设置弹窗元素
    marketplaceSettingsDialog: $('#marketplaceSettingsDialog'),
    marketplaceSettingsForm: $('#marketplaceSettingsForm'),
    marketplaceBotId: $('#marketplaceBotId'),
    marketplaceCategory: $('#marketplaceCategory'),
    marketplaceTags: $('#marketplaceTags'),
    marketplacePrice: $('#marketplacePrice'),
    cancelMarketplaceSettings: $('#cancelMarketplaceSettings'),
    publishToMarketplace: $('#publishToMarketplace'),
    unpublishFromMarketplace: $('#unpublishFromMarketplace'),
    
    // 事件类型选择元素
    eventTypesSelect: $('#eventTypesSelect'),
    editEventTypesSelect: $('#editEventTypesSelect'),
    
    // 删除确认元素
    deleteBotDialog: $('#deleteBotDialog'),
    cancelDeleteBot: $('#cancelDeleteBot'),
    confirmDeleteBot: $('#confirmDeleteBot'),
    
    botTokenDialog: $('#botTokenDialog'),
    botTokenField: $('#botTokenField'),
    copyBotToken: $('#copyBotToken'),
    closeBotTokenDialog: $('#closeBotTokenDialog')
};

let state = {
    bots: [],
    currentDeleteBotId: null,
    eventTypes: []
};

const loadBots = async () => {
    elements.botsLoading.show();
    elements.botsList.hide();
    elements.botsEmpty.hide();
    
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/bots/my`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        state.bots = result.data || [];
        renderBots(state.bots);
    } catch (err) {
        console.error('加载机器人列表失败:', err);
        mdui.snackbar({
            message: '加载机器人列表失败',
            timeout: 3000
        });
        elements.botsList.html('');
        elements.botsEmpty.show();
    } finally {
        elements.botsLoading.hide();
    }
};

const loadEventTypes = async () => {
    try {
        const result = await HttpUtil.get(
            `${CORE_CONFIG.API_URL}/enums/event-types`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200 && result.data?.item) {
            state.eventTypes = result.data.item;
            renderEventTypesChips();
        }
    } catch (err) {
        console.error('加载事件类型失败:', err);
        // 如果加载失败，使用默认值
        state.eventTypes = [
            { value: 'message.create', description: '消息被创建' },
            { value: 'user.join', description: '用户加入聊天室' },
            { value: 'user.leave', description: '用户离开聊天室' },
            { value: 'room.update', description: '聊天室信息更新' }
        ];
        renderEventTypesChips();
    }
};

const renderEventTypesChips = () => {
    const optionsHtml = state.eventTypes.map(event => {
        return `<mdui-menu-item value="${event.value}">${event.value} - ${event.description}</mdui-menu-item>`;
    }).join('');
    
    elements.eventTypesSelect.html(optionsHtml);
    elements.editEventTypesSelect.html(optionsHtml);
    
    // 默认选中 message.create
    elements.eventTypesSelect[0].value = ['message.create'];
};

const renderBots = (bots) => {
    if (!bots || bots.length === 0) {
        elements.botsList.hide();
        elements.botsEmpty.show();
        return;
    }
    
    elements.botsEmpty.hide();
    elements.botsList.show();
    
    elements.botsList.html(bots.map(bot => `
        <mdui-card variant="elevated" clickable style="margin: 16px;">
            <div style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <mdui-avatar src="${bot.avatar_url || ''}"></mdui-avatar>
                    <div style="flex: 1;">
                        <div style="font-size: 16px; font-weight: 600;">${bot.name}</div>
                        <div style="font-size: 13px; opacity: 0.7;">${bot.description || '暂无描述'}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <mdui-button-icon icon="edit" class="edit-bot-btn" data-bot-id="${bot.id}"></mdui-button-icon>
                        <mdui-button-icon icon="delete" class="delete-bot-btn" data-bot-id="${bot.id}"></mdui-button-icon>
                    </div>
                </div>
                <mdui-divider style="margin: 12px 0;"></mdui-divider>
                <div style="font-size: 13px; opacity: 0.8;">
                    <div style="margin-bottom: 4px;"><b>Webhook:</b> ${bot.webhook_url || '-'}</div>
                    <div style="margin-bottom: 4px;"><b>订阅事件:</b> ${(bot.event_types || []).join(', ') || '-'}</div>
                    <div><b>状态:</b> ${bot.is_active ? '活跃' : '未激活'}</div>
                </div>
                ${bot.is_published ? `
                    <div style="margin-top: 8px;">
                        <mdui-chip>
                            <mdui-icon slot="icon">public</mdui-icon>
                            已发布到市场
                        </mdui-chip>
                    </div>
                ` : ''}
            </div>
        </mdui-card>
    `).join(''));
};

const getSelectedEventTypes = (selectElement) => {
    return selectElement[0].value || [];
};

const setSelectedEventTypes = (selectElement, eventTypes) => {
    selectElement[0].value = eventTypes || [];
};

const createBot = async () => {
    const name = elements.botName.val().trim();
    const description = elements.botDescription.val().trim();
    const webhookUrl = elements.botWebhookUrl.val().trim();
    const eventTypes = getSelectedEventTypes(elements.eventTypesSelect);
    
    if (!name) {
        mdui.snackbar({ message: '请输入机器人名称' });
        return;
    }
    
    if (!webhookUrl) {
        mdui.snackbar({ message: '请输入Webhook URL' });
        return;
    }
    
    const $btn = elements.submitCreateBot;
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/create`,
            {
                name,
                description,
                webhook_url: webhookUrl,
                event_types: eventTypes
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人创建成功' });
            elements.createBotDialog.prop('open', false);
            
            if (result.data?.bot_token) {
                elements.botTokenField.val(result.data.bot_token);
                elements.botTokenDialog.prop('open', true);
            }
            
            elements.createBotForm[0].reset();
            setSelectedEventTypes(elements.eventTypesSelect, ['message.create']);
            await loadBots();
        } else {
            throw new Error(result.message || '创建失败');
        }
    } catch (err) {
        console.error('创建机器人失败:', err);
        mdui.snackbar({
            message: err?.message || '创建失败',
            timeout: 3000
        });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

const openEditBotDialog = (botId) => {
    const bot = state.bots.find(b => b.id === botId);
    if (!bot) return;
    
    elements.editBotId.val(bot.id);
    elements.editBotName.val(bot.name || '');
    elements.editBotDescription.val(bot.description || '');
    elements.editBotAvatarUrl.val(bot.avatar_url || '');
    elements.editBotWebhookUrl.val(bot.webhook_url || '');
    setSelectedEventTypes(elements.editEventTypesSelect, bot.event_types || []);
    
    elements.editBotDialog.prop('open', true);
};

/**
 * 打开市场发布设置弹窗
 */
const openMarketplaceSettingsDialog = () => {
    const botId = parseInt(elements.editBotId.val());
    const bot = state.bots.find(b => b.id === botId);
    if (!bot) return;
    
    elements.marketplaceBotId.val(bot.id);
    elements.marketplaceCategory[0].value = bot.category || 'other';
    elements.marketplaceTags.val((bot.tags || []).join(', '));
    elements.marketplacePrice.val(bot.price || '0');
    
    // 根据是否已发布显示不同按钮
    if (bot.is_published) {
        elements.publishToMarketplace.hide();
        elements.unpublishFromMarketplace.show();
    } else {
        elements.publishToMarketplace.show();
        elements.unpublishFromMarketplace.hide();
    }
    
    elements.editBotDialog.prop('open', false);
    elements.marketplaceSettingsDialog.prop('open', true);
};

/**
 * 发布机器人到市场
 */
const publishBotToMarketplace = async () => {
    const botId = parseInt(elements.marketplaceBotId.val());
    const category = elements.marketplaceCategory[0].value || 'other';
    const tagsStr = elements.marketplaceTags.val().trim();
    const price = parseFloat(elements.marketplacePrice.val()) || 0;
    
    if (!botId) {
        mdui.snackbar({ message: '无效的机器人ID' });
        return;
    }
    
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const $btn = elements.publishToMarketplace;
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/publish`,
            {
                bot_id: botId,
                category,
                tags,
                price
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人发布成功' });
            await loadBots();
            // 重新打开市场设置弹窗
            openMarketplaceSettingsDialog();
        } else {
            throw new Error(result.message || '发布失败');
        }
    } catch (err) {
        console.error('发布机器人失败:', err);
        mdui.snackbar({
            message: err?.message || '发布失败',
            timeout: 3000
        });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

/**
 * 从市场下架机器人
 */
const unpublishBotFromMarketplace = async () => {
    const botId = parseInt(elements.marketplaceBotId.val());
    
    if (!botId) {
        mdui.snackbar({ message: '无效的机器人ID' });
        return;
    }
    
    const $btn = elements.unpublishFromMarketplace;
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/unpublish`,
            {
                bot_id: botId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人已从市场下架' });
            await loadBots();
            // 重新打开市场设置弹窗
            openMarketplaceSettingsDialog();
        } else {
            throw new Error(result.message || '下架失败');
        }
    } catch (err) {
        console.error('下架机器人失败:', err);
        mdui.snackbar({
            message: err?.message || '下架失败',
            timeout: 3000
        });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

const updateBot = async () => {
    const botId = parseInt(elements.editBotId.val());
    const name = elements.editBotName.val().trim();
    const description = elements.editBotDescription.val();
    const avatarUrl = elements.editBotAvatarUrl.val().trim();
    const webhookUrl = elements.editBotWebhookUrl.val().trim();
    const eventTypes = getSelectedEventTypes(elements.editEventTypesSelect);
    
    if (!botId) {
        mdui.snackbar({ message: '无效的机器人ID' });
        return;
    }
    
    const $btn = elements.submitEditBot;
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const updateData = { bot_id: botId };
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (avatarUrl) updateData.avatar_url = avatarUrl;
        if (webhookUrl) updateData.webhook_url = webhookUrl;
        if (eventTypes.length > 0) updateData.event_types = eventTypes;
        
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/update`,
            updateData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人更新成功' });
            elements.editBotDialog.prop('open', false);
            await loadBots();
        } else {
            throw new Error(result.message || '更新失败');
        }
    } catch (err) {
        console.error('更新机器人失败:', err);
        mdui.snackbar({
            message: err?.message || '更新失败',
            timeout: 3000
        });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

const openDeleteBotDialog = (botId) => {
    state.currentDeleteBotId = botId;
    elements.deleteBotDialog.prop('open', true);
};

const deleteBot = async () => {
    if (!state.currentDeleteBotId) return;
    
    const $btn = elements.confirmDeleteBot;
    $btn.attr('loading', '').attr('disabled', '');
    progressManager.start();
    
    try {
        const result = await HttpUtil.post(
            `${CORE_CONFIG.API_URL}/bots/delete`,
            {
                bot_id: state.currentDeleteBotId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${USER_LOGIN_TOKEN}`
                }
            }
        );
        
        if (result.code === 200) {
            mdui.snackbar({ message: '机器人删除成功' });
            elements.deleteBotDialog.prop('open', false);
            state.currentDeleteBotId = null;
            await loadBots();
        } else {
            throw new Error(result.message || '删除失败');
        }
    } catch (err) {
        console.error('删除机器人失败:', err);
        mdui.snackbar({
            message: err?.message || '删除失败',
            timeout: 3000
        });
    } finally {
        progressManager.stop();
        $btn.removeAttr('loading').removeAttr('disabled');
    }
};

const bindEvents = () => {
    elements.botsBack.on('click', () => {
        if (window.parent) {
            window.parent.postMessage({ type: 'botsBack' }, '*');
        }
    });
    
    elements.addBotBtn.on('click', () => {
        elements.createBotDialog.prop('open', true);
    });
    
    elements.createFirstBotBtn.on('click', () => {
        elements.createBotDialog.prop('open', true);
    });
    
    elements.cancelCreateBot.on('click', () => {
        elements.createBotDialog.prop('open', false);
    });
    
    elements.submitCreateBot.on('click', createBot);
    
    elements.cancelEditBot.on('click', () => {
        elements.editBotDialog.prop('open', false);
    });
    
    elements.submitEditBot.on('click', updateBot);
    
    elements.openMarketplaceSettings.on('click', openMarketplaceSettingsDialog);
    
    elements.cancelMarketplaceSettings.on('click', () => {
        elements.marketplaceSettingsDialog.prop('open', false);
        // 重新打开编辑机器人对话框
        const botId = parseInt(elements.marketplaceBotId.val());
        openEditBotDialog(botId);
    });
    
    elements.publishToMarketplace.on('click', publishBotToMarketplace);
    elements.unpublishFromMarketplace.on('click', unpublishBotFromMarketplace);
    
    elements.cancelDeleteBot.on('click', () => {
        elements.deleteBotDialog.prop('open', false);
        state.currentDeleteBotId = null;
    });
    
    elements.confirmDeleteBot.on('click', deleteBot);
    
    elements.copyBotToken.on('click', () => {
        const token = elements.botTokenField.val();
        navigator.clipboard.writeText(token)
            .then(() => {
                mdui.snackbar({ message: '已复制到剪贴板' });
            })
            .catch(() => {
                mdui.snackbar({ message: '复制失败，请手动复制' });
            });
    });
    
    elements.closeBotTokenDialog.on('click', () => {
        elements.botTokenDialog.prop('open', false);
    });
    
    $(document).on('click', '.edit-bot-btn', (e) => {
        const botId = parseInt($(e.currentTarget).attr('data-bot-id'));
        openEditBotDialog(botId);
    });
    
    $(document).on('click', '.delete-bot-btn', (e) => {
        const botId = parseInt($(e.currentTarget).attr('data-bot-id'));
        openDeleteBotDialog(botId);
    });
};

const init = async () => {
    progressManager.init();
    ThemeManager.applySavedTheme();
    mdui.setColorScheme(StorageUtil.getItem('theme_color', '#0061a4'));
    
    bindEvents();
    await loadEventTypes();
    await loadBots();
};

$(document).ready(init);
