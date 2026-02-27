import { method, urls } from "../utils/constant";
import {commonMsgTemplate, deepseekMsgTemplate} from "../utils/template";
import { config } from "@/entrypoints/utils/config";
import { contentPostHandler } from "@/entrypoints/utils/check";

async function newapi(message: any) {
    try {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.token[config.service]}`
        });

        let url = config.newApiUrl

        if (!url) {
            throw new Error('Địa chỉ New API chưa được cấu hình');
        }

        if (url.endsWith('/')) {
            url = url.slice(0, -1); // Xóa dấu gạch chéo ở cuối
        }

        // check has /v1
        if (url.endsWith('/v1')) {
            url += '/chat/completions';
        } else if (!url.endsWith('/chat/completions')) {
            url += '/v1/chat/completions';
        }

        const resp = await fetch(url, {
            method: method.POST,
            headers,
            body: commonMsgTemplate(message.origin)
        });

        if (!resp.ok) {
            throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
        }

        const result = await resp.json();

        if (result.choices && result.choices.length > 0) {
            return contentPostHandler(result.choices[0].message.content);
        }

        throw new Error('Dịch thất bại: upstream không trả về nội dung');
    } catch (error) {
        console.error('Gọi API thất bại:', error);
        throw error;
    }
}

export default newapi;
