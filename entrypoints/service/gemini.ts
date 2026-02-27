import {method} from "../utils/constant";
import {geminiMsgTemplate} from "../utils/template";
import {customModelString} from "../utils/option";
import {config} from "@/entrypoints/utils/config";


async function gemini(message: any) {

    let model = config.model[config.service] === customModelString ? config.customModel[config.service] : config.model[config.service]

    // Xác định xem có nên sử dụng proxy hay không
    let url: string = config.proxy[config.service] ?
        config.proxy[config.service] : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.token[config.service]}`;

    const resp = await fetch(url, {
        method: method.POST,
        headers: {'Content-Type': 'application/json'},
        body: geminiMsgTemplate(message.origin),
    });
    if (resp.ok) {
        let result = await resp.json();
        return result.candidates[0].content.parts[0].text;
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

export default gemini;
