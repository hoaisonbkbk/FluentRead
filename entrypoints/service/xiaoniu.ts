import {method, urls} from "../utils/constant";
import {services} from "../utils/option";
import {config} from "@/entrypoints/utils/config";

async function xiaoniu(message: any) {
    // Điều chỉnh ngôn ngữ đích khi cần thiết
    let targetLang = config.to === 'zh-Hans' ? 'zh' : config.to;

    // Xác định xem có nên sử dụng proxy hay không
    let url: string = config.proxy[config.service] ? config.proxy[config.service] : urls[services.xiaoniu]

    const resp = await fetch(url, {
        method: method.POST,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `from=auto&to=${targetLang}&apikey=${config.token[services.xiaoniu]}&src_text=${encodeURIComponent(message.origin)}`
    });

    if (resp.ok) {
        let result = await resp.json();
        return result.tgt_text
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

export default xiaoniu;
