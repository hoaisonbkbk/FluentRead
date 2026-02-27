import {method, urls} from "../utils/constant";
import {services} from "../utils/option";
import {commonMsgTemplate} from "../utils/template";
import CryptoJS from 'crypto-js';
import {config} from "@/entrypoints/utils/config";


// Tài liệu tham khảo: https://open.bigmodel.cn/dev/api#nosdk
async function zhipu(message: any) {
    // Zhipu lấy bí mật (khóa chữ ký) và hết hạn dựa trên mã thông báo
    let token = config.token[services.zhipu];
    let secret, expiration;
    config.extra[services.zhipu] && ({secret, expiration} = config.extra[services.zhipu]);
    if (!secret || expiration <= Date.now()) {
        secret = generateToken(token);
        if (!secret) throw new Error('Không thể tạo token');
        // Lưu bí mật và hết hạn
        config.extra[services.zhipu] = {secret, expiration: Date.now() + 3600000 * 24};
        await storage.setItem('local:config', JSON.stringify(config));
    }

    // Xây dựng tiêu đề yêu cầu
    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${secret}`);

    // Bắt đầu yêu cầu tìm nạp
    const resp = await fetch(urls[services.zhipu], {
        method: method.POST,
        headers: headers,
        body: commonMsgTemplate(message.origin)
    });

    if (resp.ok) {
        let result = await resp.json();
        return result.choices[0].message.content;
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

function generateToken(APIKey: string) {
    if (!APIKey || !APIKey.includes('.')) {
        console.log("Định dạng API Key không đúng:", APIKey)
        return;
    }
    let duration = 3600000 * 24; // Mã thông báo được tạo sẽ hết hạn sau 24 ngày theo mặc định.
    const [key, secret] = APIKey.split('.');

    return generateJWT(secret, {alg: "HS256", sign_type: "SIGN", typ: "JWT"}, {
        api_key: key,
        exp: Math.floor(Date.now() / 1000) + (duration / 1000),
        timestamp: Math.floor(Date.now() / 1000)
    });
}

// Tạo JWT (Mã thông báo web JSON)
function generateJWT(secret: string, header: any, payload: any) {
    // UTF-8 mã hóa phần tiêu đề và phần tải trọng, sau đó chuyển đổi chúng sang định dạng Base64URL
    const encodedHeader = base64UrlSafe(btoa(JSON.stringify(header)));
    const encodedPayload = base64UrlSafe(btoa(JSON.stringify(payload)));
    // Tạo chữ ký jwt
    let hmacsha256 = base64UrlSafe(CryptoJS.HmacSHA256(encodedHeader + "." + encodedPayload, secret).toString(CryptoJS.enc.Base64))
    return `${encodedHeader}.${encodedPayload}.${hmacsha256}`;
}

// Hàm chuyển đổi chuỗi Base64 sang định dạng Base64URL
function base64UrlSafe(base64String: string) {
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default zhipu;
