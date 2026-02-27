import {method} from "../utils/constant";
import {services} from "../utils/option";
import {config} from "@/entrypoints/utils/config";

async function deeplx(message: any) {
    // deeplx không hỗ trợ zh-Hans và cần được chuyển đổi sang zh
    let targetLang = config.to === 'zh-Hans' ? 'zh' : config.to;
    let sourceLang = config.from === 'auto' ? 'auto' : config.from;
    
    // Xác định xem nên sử dụng proxy hay URL tùy chỉnh
    let url: string = config.proxy[config.service] ? config.proxy[config.service] : config.deeplx || 'http://localhost:1188/translate';

    // Xây dựng tiêu đề yêu cầu
    let headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    // Nếu có mã thông báo, hãy thêm tiêu đề Ủy quyền
    if (config.token[services.deeplx] && config.token[services.deeplx].trim() !== '') {
        headers['Authorization'] = `Bearer ${config.token[services.deeplx]}`;
    }

    const resp = await fetch(url, {
        method: method.POST,
        headers: headers,
        body: JSON.stringify({
            text: message.origin,
            source_lang: sourceLang.toUpperCase(),
            target_lang: targetLang.toUpperCase()
        })
    });

    if (resp.ok) {
        let result = await resp.json();
        // Định dạng trả về DeepLX thường là { code: 200, data: "transltext" }
        if (result.code === 200) {
            return result.data;
        } else {
            throw new Error(`Dịch DeepLX thất bại: ${result.message || 'Lỗi không xác định'}`);
        }
    } else {
        console.log("DeepLX Dịch thất bại: ", resp);
        throw new Error(`Dịch DeepLX thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

export default deeplx;