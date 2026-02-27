// Nhập các mô-đun cần thiết
import {customModelString, services} from "../utils/option";
import {method} from "../utils/constant";
import {commonMsgTemplate} from "@/entrypoints/utils/template";
import {config} from "@/entrypoints/utils/config";

async function infini(message: any) {
    // Xây dựng tiêu đề yêu cầu
    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${config.token[services.infini]}`);

    let model = config.model[services.infini] === customModelString ? config.customModel[services.infini] : config.model[services.infini]

    // Bắt đầu yêu cầu tìm nạp
    const resp = await fetch(`https://cloud.infini-ai.com/maas/${model}/nvidia/chat/completions`, {
        method: method.POST,
        headers: headers,
        body: commonMsgTemplate(message.origin)
    });

    if (resp.ok) {
        let result = await resp.json();
        return result.choices[0].message.content
    } else {
        console.error(resp);
        throw new Error(`Yêu cầu thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

export default infini;
