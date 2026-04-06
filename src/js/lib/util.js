"use strict";

import { CORE_CONFIG, USER_LOGIN_TOKEN, $ } from "../core.js";

/**
 * AJAX 请求封装
 * ==========
 */
const HttpUtil = {
    /**
     * 默认请求配置
     */
    defaultConfig: {
        baseURL: '',
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
        }
    },

    /**
     * 响应拦截器
     * @param {*} response 响应数据
     * @returns {Promise} 处理后的响应
     */
    async responseInterceptor(response) {
        if (response && typeof response === 'object' && 'code' in response) {
            if (response.code === 401) {
                await this.handleUnauthorized();
            }
        }
        return response;
    },

    /**
     * 处理未授权情况
     */
    async handleUnauthorized() {
        HttpUtil.post(
            `${CORE_CONFIG.USER_API}/auth/logout`,
            { headers: { 'Authorization': `Bearer ${USER_LOGIN_TOKEN}` } }
        );
        window.location = 'login.html';
    },

    /**
     * 合并配置
     * @param {Object} customConfig 自定义配置
     * @returns {Object} 合并后的配置
     */
    mergeConfig(customConfig = {}) {
        return {
            ...this.defaultConfig,
            ...customConfig,
            headers: {
                ...this.defaultConfig.headers,
                ...(customConfig.headers || {})
            }
        };
    },

    /**
     * 处理响应
     * @param {Response} response fetch响应对象
     * @returns {Promise} 解析后的数据
     */
    async handleResponse(response) {
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        let result;

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        return this.responseInterceptor(result);
    },

    /**
     * 发起请求
     * @param {string} url 请求URL
     * @param {Object} config 请求配置
     * @returns {Promise} 请求Promise
     */
    async request(url, config = {}) {
        const mergedConfig = this.mergeConfig(config);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), mergedConfig.timeout);

        try {
            const fullUrl = mergedConfig.baseURL ? `${mergedConfig.baseURL}${url}` : url;

            const requestOptions = {
                method: mergedConfig.method || 'GET',
                headers: mergedConfig.headers,
                signal: controller.signal,
                ...mergedConfig
            };

            if (mergedConfig.body instanceof FormData) {
                if (mergedConfig.headers) {
                    delete mergedConfig.headers['Content-Type'];
                    delete mergedConfig.headers['content-type'];
                }
                // 跳过后续 JSON 序列化
            }

            // 处理请求体：只有非 GET/HEAD 请求才可能有 body
            if (mergedConfig.body && requestOptions.method !== 'GET' && requestOptions.method !== 'HEAD') {
                const contentType = requestOptions.headers['Content-Type'] || requestOptions.headers['content-type'];
                if (contentType && contentType.includes('application/json')) {
                    requestOptions.body = JSON.stringify(mergedConfig.body);
                } else {
                    requestOptions.body = mergedConfig.body;
                }
            }

            const response = await fetch(fullUrl, requestOptions);
            clearTimeout(timeoutId);
            return this.handleResponse(response);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    },

    /**
     * GET 请求
     * @param {string} url 请求URL
     * @param {Object} params 查询参数
     * @param {Object} config 额外配置
     * @returns {Promise} 请求Promise
     */
    async get(url, params = {}, config = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        return this.request(fullUrl, { ...config, method: 'GET' });
    },

    /**
     * POST 请求
     * @param {string} url 请求URL
     * @param {Object} data 请求数据
     * @param {Object} config 额外配置
     * @returns {Promise} 请求Promise
     */
    async post(url, data = {}, config = {}) {
        return this.request(url, {
            ...config,
            method: 'POST',
            body: data
        });
    },

    /**
     * PUT 请求
     * @param {string} url 请求URL
     * @param {Object} data 请求数据
     * @param {Object} config 额外配置
     * @returns {Promise} 请求Promise
     */
    async put(url, data = {}, config = {}) {
        return this.request(url, {
            ...config,
            method: 'PUT',
            body: data
        });
    },

    /**
     * DELETE 请求
     * @param {string} url 请求URL
     * @param {Object} config 额外配置
     * @returns {Promise} 请求Promise
     */
    async delete(url, config = {}) {
        return this.request(url, { ...config, method: 'DELETE' });
    },

    /**
     * 上传文件
     * @param {string} url 请求URL
     * @param {FormData} formData FormData对象
     * @param {Object} config 额外配置
     * @returns {Promise} 请求Promise
     */
    async upload(url, formData, config = {}) {
        // 创建 headers 对象，只保留 Authorization 等自定义头
        const headers = {
            ...(config.headers || {})
        };
        // 重要：不要手动设置或删除 Content-Type，让浏览器自动生成
        // 但必须确保 headers 对象中不存在 Content-Type 字段
        delete headers['Content-Type'];
        delete headers['content-type'];

        return this.request(url, {
            ...config,
            method: 'POST',
            body: formData,
            headers
        });
    }
};

/**
 * 本地存储封装
 * ==========
 */
const StorageUtil = {
    /**
     * 存储前缀
     */
    prefix: 'app_',

    /**
     * 生成带前缀的键名
     * @param {string} key 原始键名
     * @returns {string} 带前缀的键名
     */
    getKey(key) {
        return `${this.prefix}${key}`;
    },

    /**
     * 设置存储项
     * @param {string} key 键名
     * @param {any} value 值
     * @param {Object} options 选项
     * @param {number} options.expire 过期时间（秒）
     */
    setItem(key, value, options = {}) {
        const storageItem = {
            value,
            timestamp: Date.now(),
            expire: options.expire ? Date.now() + options.expire * 1000 : null
        };

        try {
            localStorage.setItem(this.getKey(key), JSON.stringify(storageItem));
            return true;
        } catch (error) {
            console.warn('存储数据失败:', error);
            return false;
        }
    },

    /**
     * 获取存储项
     * @param {string} key 键名
     * @param {any} defaultValue 默认值
     * @returns {any} 存储的值或默认值
     */
    getItem(key, defaultValue = null) {
        try {
            const itemStr = localStorage.getItem(this.getKey(key));
            if (!itemStr) return defaultValue;

            const storageItem = JSON.parse(itemStr);

            if (storageItem.expire && Date.now() > storageItem.expire) {
                this.removeItem(key);
                return defaultValue;
            }

            return storageItem.value;
        } catch (error) {
            console.error('读取数据失败:', error);
            return defaultValue;
        }
    },

    /**
     * 移除存储项
     * @param {string} key 键名
     */
    removeItem(key) {
        localStorage.removeItem(this.getKey(key));
    },

    /**
     * 清空所有存储项（只清空前缀匹配的项）
     */
    clear() {
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    },

    /**
     * 获取所有存储项的键名
     * @returns {Array} 键名数组
     */
    keys() {
        const keys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }

        return keys;
    },

    /**
     * 检查存储项是否存在
     * @param {string} key 键名
     * @returns {boolean} 是否存在
     */
    hasItem(key) {
        return localStorage.getItem(this.getKey(key)) !== null;
    },

    /**
     * 设置会话存储
     * @param {string} key 键名
     * @param {any} value 值
     */
    setSession(key, value) {
        try {
            sessionStorage.setItem(this.getKey(key), JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('设置会话存储失败:', error);
            return false;
        }
    },

    /**
     * 获取会话存储
     * @param {string} key 键名
     * @param {any} defaultValue 默认值
     * @returns {any} 存储的值或默认值
     */
    getSession(key, defaultValue = null) {
        try {
            const itemStr = sessionStorage.getItem(this.getKey(key));
            return itemStr ? JSON.parse(itemStr) : defaultValue;
        } catch (error) {
            console.error('获取会话存储失败:', error);
            return defaultValue;
        }
    },

    /**
     * 移除会话存储
     * @param {string} key 键名
     */
    removeSession(key) {
        sessionStorage.removeItem(this.getKey(key));
    }
};

/**
 * IndexedDB 存储封装（异步，适用于大量数据）
 * =====================================
 * 提供类似 localStorage 的异步接口，底层使用 IndexedDB。
 * 默认数据库名为 'XQFChat'，对象存储名为 'chatData'。
 */
const IndexedDBUtil = {
    DB_NAME: 'XQFChat',
    DEFAULT_STORE_NAME: 'chatData',
    VERSION: 1,
    dbs: new Map(),

    /**
     * 打开数据库连接（内部自动调用）
     * @param {string} storeName 存储名称
     * @returns {Promise<IDBDatabase>}
     */
    async openDB(storeName = this.DEFAULT_STORE_NAME) {
        const dbKey = `${this.DB_NAME}_${storeName}`;
        if (this.dbs.has(dbKey)) return this.dbs.get(dbKey);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.dbs.set(dbKey, request.result);
                resolve(request.result);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
        });
    },

    /**
     * 获取事务和对象存储
     * @param {string} mode 事务模式 'readonly' 或 'readwrite'
     * @param {string} storeName 存储名称
     * @returns {Promise<IDBObjectStore>}
     */
    async getStore(mode = 'readonly', storeName = this.DEFAULT_STORE_NAME) {
        const db = await this.openDB(storeName);
        const transaction = db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    },

    /**
     * 设置键值对
     * @param {string} key
     * @param {any} value 必须是结构化可克隆的数据
     * @param {string} storeName 存储名称
     * @returns {Promise<void>}
     */
    async setItem(key, value, storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readwrite', storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * 获取键对应的值
     * @param {string} key
     * @param {any} defaultValue 如果键不存在则返回的默认值
     * @param {string} storeName 存储名称
     * @returns {Promise<any>}
     */
    async getItem(key, defaultValue = null, storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readonly', storeName);
        return new Promise((resolve) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result !== undefined ? request.result : defaultValue);
            request.onerror = () => resolve(defaultValue);
        });
    },

    /**
     * 移除键值对
     * @param {string} key
     * @param {string} storeName 存储名称
     * @returns {Promise<void>}
     */
    async removeItem(key, storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readwrite', storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * 清空所有键值对
     * @param {string} storeName 存储名称
     * @returns {Promise<void>}
     */
    async clear(storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readwrite', storeName);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * 获取所有键名
     * @param {string} storeName 存储名称
     * @returns {Promise<string[]>}
     */
    async keys(storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readonly', storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * 检查键是否存在
     * @param {string} key
     * @param {string} storeName 存储名称
     * @returns {Promise<boolean>}
     */
    async hasItem(key, storeName = this.DEFAULT_STORE_NAME) {
        const value = await this.getItem(key, null, storeName);
        return value !== null;
    },

    /**
     * 批量设置多个键值对
     * @param {Object} items 键值对对象
     * @param {string} storeName 存储名称
     * @returns {Promise<void>}
     */
    async setMany(items, storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readwrite', storeName);
        return new Promise((resolve, reject) => {
            const transaction = store.transaction;
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            for (const [key, value] of Object.entries(items)) {
                store.put(value, key);
            }
            transaction.commit();
        });
    },

    /**
     * 批量获取多个键的值
     * @param {string[]} keys
     * @param {string} storeName 存储名称
     * @returns {Promise<Object>} 键值对对象，不存在的键不会出现在结果中
     */
    async getMany(keys, storeName = this.DEFAULT_STORE_NAME) {
        const store = await this.getStore('readonly', storeName);
        const results = {};
        await Promise.all(keys.map(key =>
            new Promise((resolve) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    if (request.result !== undefined) results[key] = request.result;
                    resolve();
                };
                request.onerror = () => resolve();
            })
        ));
        return results;
    },

    /**
     * 关闭数据库连接
     * @param {string} storeName 存储名称
     */
    close(storeName = this.DEFAULT_STORE_NAME) {
        const dbKey = `${this.DB_NAME}_${storeName}`;
        if (this.dbs.has(dbKey)) {
            this.dbs.get(dbKey).close();
            this.dbs.delete(dbKey);
        }
    },

    /**
     * 关闭所有数据库连接
     */
    closeAll() {
        for (const db of this.dbs.values()) {
            db.close();
        }
        this.dbs.clear();
    }
};

/**
 * 格式化时间显示
 * =====================================
 * 
 * @param {number} timestamp - Unix时间戳（秒）
 * @param {Object|string} options - 格式化选项
 * @param {string} options.format - 返回格式：'object' | 'string' | 'time' | 'date' | 'fullDate' | 'fullDateTime'
 * @param {boolean} options.returnString - 如果为true，返回默认格式的字符串
 * @returns {Object|string} 根据选项返回时间对象或格式化后的字符串
 */
const formatTime = (timestamp, options = {}) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // 判断是否为今天
    const isToday = date.toDateString() === now.toDateString();
    // 判断是否为昨天
    const isYesterday = date.toDateString() === yesterday.toDateString();

    let dateString = '';
    if (isToday) {
        dateString = '今天';
    } else if (isYesterday) {
        dateString = '昨天';
    } else {
        dateString = `${month}月${day}日`;
    }

    const result = {
        time: `${hours}:${minutes}`,
        date: dateString,
        fullDate: `${month}月${day}日`,
        fullDateTime: `${month}月${day}日 ${hours}:${minutes}`,
        timestamp: timestamp,
        dateObj: date
    };

    // 处理不同的返回格式
    if (typeof options === 'string') {
        return result[options] || result.fullDateTime;
    } else if (options.returnString) {
        return result.fullDateTime;
    } else if (options.format) {
        return result[options.format] || result.fullDateTime;
    }

    // 默认返回完整对象
    return result;
};

/**
 * 将 FormData 对象转换为普通对象
 * ==========================
 * 对于同名的多个值，会自动转换为数组
 * 
 * @param {HTMLFormElement} form - 表单元素
 * @returns {Object} 包含表单数据的普通对象
 * 
 * @example
 * // 假设表单中有输入框: name="username", name="hobby"（多选）
 * const formData = getFormData(formElement);
 * // 返回: { username: "张三", hobby: ["读书", "游泳"] }
 */
const getFormData = (form) =>
    Array.from(new FormData(form)).reduce((data, [key, value]) => {
        if (data[key]) {
            data[key] = Array.isArray(data[key])
                ? [...data[key], value]
                : [data[key], value];
        } else {
            data[key] = value;
        }
        return data;
    }, {});

/**
 * 格式化字节大小
 * @param {number} bytes 字节数
 * @param {number} decimals 小数位数
 * @returns {string}
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
 * 页面加载进度管理器
 * 使用 MDUI 的线性进度条组件显示页面加载状态
 * 通过调用 start() 和 stop() 方法控制进度条的显示和隐藏
 */
const progressManager = {
    $progress: null,
    hideTimer: null,

    init() {
        if (!$('#pageTransitionProgress').length) {
            const progressHTML = `
<mdui-linear-progress 
    id="pageTransitionProgress"
    style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        opacity: 0;
        display: none;
        transition: opacity 0.3s ease;
    ">
</mdui-linear-progress>`;
            $('body').append(progressHTML);
            this.$progress = $('#pageTransitionProgress');
        } else {
            this.$progress = $('#pageTransitionProgress');
        }
    },

    start() {
        if (this.$progress && this.$progress.length) {
            // 取消隐藏定时器
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }

            // 立刻显示（无动画）
            this.$progress.css({
                display: 'block',
                opacity: 1
            });

            this.$progress.prop('indeterminate', true);
        }
    },

    stop() {
        if (this.$progress && this.$progress.length) {
            this.$progress.prop('indeterminate', false);

            // 延迟 0.5 秒再开始淡出
            this.hideTimer = setTimeout(() => {
                this.$progress.css('opacity', 0);

                // 等待过渡动画结束再 display:none
                setTimeout(() => {
                    this.$progress.css('display', 'none');
                }, 300); // 要和 transition 时间一致

                this.hideTimer = null;
            }, 500);
        }
    }
};

/**
 * 判断当前页面是否在 iframe 中
 * ==========================
 * 通过比较 window.self 和 window.top 来判断是否在 iframe 中
 * @returns {boolean} 是否在 iframe 中
 */
const isInIframe = () => {
    return window.self !== window.top;
};

export {
    HttpUtil,
    StorageUtil,
    IndexedDBUtil,
    progressManager,
    formatBytes,
    formatTime,
    getFormData,
    isInIframe
};