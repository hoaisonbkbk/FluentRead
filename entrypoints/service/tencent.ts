import { method } from "../utils/constant";
import { services } from "../utils/option";
import { config } from "@/entrypoints/utils/config";

// Ánh xạ mã ngôn ngữ máy tính Tencent Cloud Dịch
const languageMap: Record<string, string> = {
    'zh-Hans': 'zh',
    'zh-Hant': 'zh-TW',
    'en': 'en',
    'ja': 'ja',
    'ko': 'ko',
    'fr': 'fr',
    'ru': 'ru',
    'de': 'de',
    'es': 'es',
    'it': 'it',
    'tr': 'tr',
    'th': 'th',
    'ar': 'ar',
    'pt': 'pt',
    'auto': 'auto'
};

// Tạo chữ ký HMAC (trả về dữ liệu nhị phân)
async function generateHmacSignature(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

// Chuyển đổi dữ liệu nhị phân thành chuỗi thập lục phân
function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Tạo chữ ký API đám mây Tencent
async function createTencentSignature(requestPayload: string, timestamp: number, secretId: string, secretKey: string): Promise<string> {
    const date = new Date(timestamp * 1000).toISOString().substring(0, 10);
    
    // Bước 1: Ghép chuỗi yêu cầu đặc tả
    const httpRequestMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:tmt.tencentcloudapi.com\n`;
    const signedHeaders = "content-type;host";
    
    const hashedRequestPayload = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(requestPayload));
    const hashedPayloadHex = Array.from(new Uint8Array(hashedRequestPayload))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayloadHex}`;
    
    // Bước 2: Lắp ráp chuỗi cần ký
    const algorithm = "TC3-HMAC-SHA256";
    const credentialScope = `${date}/tmt/tc3_request`;
    
    const hashedCanonicalRequest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest));
    const hashedCanonicalRequestHex = Array.from(new Uint8Array(hashedCanonicalRequest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequestHex}`;
    
    // Bước 3: Tính chữ ký
    const kDate = await generateHmacSignature(`TC3${secretKey}`, date);
    const kService = await generateHmacSignature(kDate, "tmt");
    const kSigning = await generateHmacSignature(kService, "tc3_request");
    const signatureBuffer = await generateHmacSignature(kSigning, stringToSign);
    const signature = arrayBufferToHex(signatureBuffer);
    
    // Bước 4: Ủy quyền mối nối
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return authorization;
}

async function tencent(message: any) {
    try {
        // Nhận SecretId và SecretKey từ cấu hình
        const secretId = config.tencentSecretId?.trim();
        const secretKey = config.tencentSecretKey?.trim();
        
        if (!secretId || !secretKey) {
            throw new Error('Khóa dịch máy Tencent Cloud chưa cấu hình, vui lòng cấu hình SecretId và SecretKey trong cài đặt');
        }
        
        // Xác thực định dạng cơ bản
        if (secretId.length < 10 || secretKey.length < 10) {
            throw new Error('Định dạng SecretId hoặc SecretKey không đúng, vui lòng kiểm tra đã sao chép đầy đủ thông tin khóa');
        }
        
        // Chuyển đổi mã ngôn ngữ
        const sourceLang = languageMap[config.from] || config.from;
        const targetLang = languageMap[config.to] || config.to;
        
        if (!targetLang || targetLang === 'auto') {
            throw new Error('Dịch máy Tencent Cloud không hỗ trợ tự động nhận diện ngôn ngữ đích');
        }
        
        // Xây dựng nội dung yêu cầu JSON
        const requestBody = JSON.stringify({
            SourceText: message.origin,
            Source: sourceLang,
            Target: targetLang,
            ProjectId: 0
        });
        
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Tạo tiêu đề chữ ký và ủy quyền
        const authorization = await createTencentSignature(requestBody, timestamp, secretId, secretKey);
        
        // Xác định xem có nên sử dụng proxy hay không
        const url = config.proxy[config.service] || 'https://tmt.tencentcloudapi.com/';
        
        const response = await fetch(url, {
            method: method.POST,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Host': 'tmt.tencentcloudapi.com',
                'Authorization': authorization,
                'X-TC-Action': 'TextTranslate',
                'X-TC-Version': '2018-03-21',
                'X-TC-Region': 'ap-beijing',
                'X-TC-Timestamp': timestamp.toString()
            },
            body: requestBody
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Yêu cầu dịch máy Tencent Cloud thất bại: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const result = await response.json();
        
        // Kiểm tra lỗi
        if (result.Response?.Error) {
            throw new Error(`Lỗi dịch máy Tencent Cloud: ${result.Response.Error.Code} - ${result.Response.Error.Message}`);
        }
        
        // Quay lại Kết quả dịch
        if (result.Response?.TargetText) {
            return result.Response.TargetText;
        } else {
            throw new Error('Định dạng trả về của dịch máy Tencent Cloud bất thường');
        }
        
    } catch (error) {
        console.error('Gọi dịch vụ dịch máy Tencent Cloud thất bại:', error);
        throw error;
    }
}

export default tencent;
