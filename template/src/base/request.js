/**
 * 通用请求方法
 * @param  url     请求的地址
 * @param  options 请求参数，有data, method, onload, onerror
 * @param  options.data     请求的参数，为对象，可不传，默认为{}
 * @param  options.method   'GET'或'POST'，可不传，默认GET
 * @param  options.onload   请求成功的回调函数
 * @param  options.onerror  请求失败的回调函数，可不传
 * @param  options.mask     是否显示loading遮罩, 默认false
 * @param  options.btn      请求时是否disable按钮, 需要配合KLButton使用，默认false
 */

import { KLLoading } from 'nek-ui';
import eventBus from './eventbus';

const util = {
    isArray(arr) {
        return Object.prototype.toString.call(arr).slice(8, -1) === 'Array';
    },
    filterParam(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (!obj[key] && obj[key] !== 0 && obj[key] !== false || (this.isArray(obj[key]) && obj[key].length === 0)) {
                    delete obj[key];
                }
            }
        }
    },
    // 简化版的对象转request参数，_object对象必须只有一级，如{name: 'xxx', age: 18}
    object2query(obj) {
        let arr = [];
        for (let key of Object.keys(obj)) {
            let value = encodeURIComponent(obj[key]);
            arr.push(`${key}=${value}`);
        }
        return arr.join('&');
    },
    toQueryString(obj) {
        let keys = obj && Object.keys(obj);
        let params;
        if (keys && keys.length > 0) {
            params = keys.map(key => `${key}=${obj[key]}`).join('&');
        }
        return params;
    },
    extend(o1 = {}, o2 = {}, override) {
        for (let i in o2) {
            if (o1[i] === undefined || override) {
                o1[i] = o2[i];
            }
        }
        return o1;
    }
};

const loadingHandler = (options, loading) => {
    const { mask, btn } = options;
    if (loading) {
        mask && KLLoading.show(); // 显示遮罩
        btn && btn.$update('loading', true); // disable按钮
    } else {
        mask && KLLoading.hide();
        btn && btn.$update('loading', false);
    }
};

const errorHandler = (res) => {
    eventBus.$emit('requestError', res);
    return Promise.reject(res);
};

export const $request = async function(url, options={}) {
    let { data, method, norest, formData = false, convert } = options;
    method = method || 'GET';
    data = data || {};

    util.filterParam(data);

    let headers = {};

    if (!formData) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers.Accept = 'application/json';
        headers['Content-Type'] = norest ? 'application/x-www-form-urlencoded' : 'application/json';
    }

    let reqOpt = {
        method,
        credentials: 'include', // 修复请求不自动带上cookie的问题
        headers
    };

    // 处理请求参数，区分get, post, norest
    method = method.toLowerCase();
    if (method === 'get') {
        url += `?${util.object2query(data)}`;
    } else {
        // 区分是否为formData表单提交
        if(formData) {
            reqOpt.body = data;
        } else {
            norest ? reqOpt.body = util.toQueryString(data) : reqOpt.body = JSON.stringify(data);
        }
    }

    loadingHandler(options, true);
    try {
        const res = await fetch(`${url}`, reqOpt);
        const json = await res.json();

        loadingHandler(options, false);
        if (json.code && json.code >= 200 && json.code < 400) {
            return Promise.resolve(convert ? convert(json) : json);
        }
        return errorHandler(json, options.catchError);

    } catch(err) {
        loadingHandler(options, false);
        return errorHandler(err, options.catchError);
    }
};

export const $get = (url, options={}) => $request(url, options);

export const $post = (url, options={}) => {
    util.extend(options, { method: 'POST' });
    return $request(url, options);
};

export const $form = (url, options={}) => {
    util.extend(options, { method: 'POST', norest: true });
    return $request(url, options);
};

export const $formdata = (url, options={}) => {
    util.extend(options, { method: 'POST', formData: true });
    return $request(url, options);
};

export const getApis = (list) => {
    let API = {};
    let authApis = [];
    const requestMethods = {
        get: $get,
        post: $post,
        form: $form,
        formdata: $formdata
    };

    list.forEach((item) => {
        const requestMethod = requestMethods[item.type];
        const convert = item.convert;

        API[item.key] = (data, btn, catchError) => requestMethod(item.url, { data, btn, catchError, convert });

        authApis.push({
            urlKey: item.key,
            requestUrl: item.url
        });
    });

    return { API, authApis };
};
