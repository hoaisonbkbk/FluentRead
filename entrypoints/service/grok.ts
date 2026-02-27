import {method, urls} from "../utils/constant";
import {commonMsgTemplate} from "../utils/template";
import {config} from "@/entrypoints/utils/config";
import {contentPostHandler} from "@/entrypoints/utils/check";

/**
 * Triển khai dịch vụ Grok
 * Sử dụng X.AI API, tương thích với giao diện OpenAI
 * Các mẫu được hỗ trợ: grok-3-beta, grok-3-fast-beta, grok-3-mini-beta, grok-3-mini-fast-beta
 */
async function grok(message: any) {
    try {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.token[config.service]}`
        });

        const url = config.proxy[config.service] || urls[config.service];

        const resp = await fetch(url, {
            method: method.POST,
            headers,
            body: commonMsgTemplate(message.origin)
        });

        if (!resp.ok) {
            throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
        }

        const result = await resp.json();
        return contentPostHandler(result.choices[0].message.content);
    } catch (error) {
        console.error('Grok API gọi thất bại:', error);
        throw error;
    }
}

export default grok; 
