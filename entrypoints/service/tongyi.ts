import {services} from "../utils/option";
import {method, urls} from "../utils/constant";
import {tongyiMsgTemplate} from "../utils/template";
import {config} from "@/entrypoints/utils/config";

// Tài liệu: https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-thousand-questions-metering-and-billing
async function tongyi(message: any) {
    // Xây dựng tiêu đề yêu cầu
    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${config.token[services.tongyi]}`);

    // Xác định xem có nên sử dụng proxy hay không
    let url: string = config.proxy[config.service] ? config.proxy[config.service] : urls[services.tongyi]

    const resp = await fetch(url, {
        method: method.POST,
        headers: headers,
        body: tongyiMsgTemplate(message.origin)
    });

    if (resp.ok) {
        let result = await resp.json();
        return result.choices[0].message.content;
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

export default tongyi;


//
