import {method, urls} from "../utils/constant";
import {services} from "../utils/option";
import {config} from "@/entrypoints/utils/config";

async function deepl(message: any) {
    // deepl không hỗ trợ zh-Hans và cần được chuyển đổi sang zh
    let targetLang = config.to === 'zh-Hans' ? 'zh' : config.to;

    // Xác định xem có nên sử dụng proxy hay không
    let url: string = config.proxy[config.service] ? config.proxy[config.service] : urls[services.deepL]

    const resp = await fetch(url, {
        method: method.POST,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'DeepL-Auth-Key ' + config.token[services.deepL]
        },
        body: JSON.stringify({
            text: [message.origin],
            target_lang: targetLang,
            tag_handling: 'html',
            context: message.context,  // Thêm hỗ trợ theo ngữ cảnh
            preserve_formatting: true
        })
    });

    if (resp.ok) {
        let result = await resp.json();
        return result.translations[0].text
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} vui lòng kiểm tra token có chính xác không`);
    }
}

export default deepl;

