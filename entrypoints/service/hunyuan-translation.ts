import { method } from "../utils/constant";
import { config } from "@/entrypoints/utils/config";
import { detectlang } from "../utils/common";

// Ánh xạ mã ngôn ngữ được hỗ trợ bởi Hunyuan Translation Mô hình
const languageMap: Record<string, string> = {
    'zh-Hans': 'zh',    // Tiếng Trung giản thể
    'zh-Hant': 'yue',   // Tiếng Trung phồn thể sử dụng mã Quảng Đông
    'en': 'en',         // Tiếng Anh
    'ja': 'ja',         // Tiếng Nhật
    'ko': 'ko',         // Tiếng Hàn
    'fr': 'fr',         // Tiếng Pháp
    'ru': 'ru',         // Tiếng Nga
    'de': 'de',         // Tiếng Đức
    'es': 'es',         // Tiếng Tây Ban Nha
    'it': 'it',         // Tiếng Ý
    'tr': 'tr',         // tiếng Thổ Nhĩ Kỳ
    'ar': 'ar',         // tiếng ả rập
    'pt': 'pt',         // Tiếng Bồ Đào Nha
    'th': 'th',         // tiếng Thái
    'vi': 'vi',         // Tiếng Việt
    'ms': 'ms',         // Mã Lai
    'id': 'id',         // tiếng Indonesia
    // Lưu ý: auto được xử lý đặc biệt bằng logic mã và không được ánh xạ ở đây.
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
async function createHunyuanSignature(requestPayload: string, timestamp: number, secretId: string, secretKey: string): Promise<string> {
    const date = new Date(timestamp * 1000).toISOString().substring(0, 10);
    
    // Bước 1: Ghép chuỗi yêu cầu đặc tả
    const httpRequestMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:hunyuan.tencentcloudapi.com\n`;
    const signedHeaders = "content-type;host";
    
    const hashedRequestPayload = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(requestPayload));
    const hashedPayloadHex = Array.from(new Uint8Array(hashedRequestPayload))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayloadHex}`;
    
    // Bước 2: Lắp ráp chuỗi cần ký
    const algorithm = "TC3-HMAC-SHA256";
    const credentialScope = `${date}/hunyuan/tc3_request`;
    
    const hashedCanonicalRequest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest));
    const hashedCanonicalRequestHex = Array.from(new Uint8Array(hashedCanonicalRequest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequestHex}`;
    
    // Bước 3: Tính chữ ký
    const kDate = await generateHmacSignature(`TC3${secretKey}`, date);
    const kService = await generateHmacSignature(kDate, "hunyuan");
    const kSigning = await generateHmacSignature(kService, "tc3_request");
    const signatureBuffer = await generateHmacSignature(kSigning, stringToSign);
    const signature = arrayBufferToHex(signatureBuffer);
    
    // Bước 4: Ủy quyền mối nối
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return authorization;
}

async function hunyuanTranslation(message: any) {
    try {
        console.log('🔄 Bắt đầu xử lý dịch Hunyuan:', message.origin);
        
        // Nhận SecretId và SecretKey từ cấu hình
        const secretId = config.tencentSecretId?.trim();
        const secretKey = config.tencentSecretKey?.trim();
        
        console.log('🔑 Trạng thái cấu hình khóa:', { 
            hasSecretId: !!secretId, 
            hasSecretKey: !!secretKey,
            service: config.service 
        });
        
        if (!secretId || !secretKey) {
            throw new Error('Khóa Tencent Hunyuan chưa được cấu hình, vui lòng cấu hình SecretId và SecretKey trong phần cài đặt');
        }
        
        // Xác thực định dạng cơ bản
        if (secretId.length < 10 || secretKey.length < 10) {
            throw new Error('Định dạng SecretId hoặc SecretKey không đúng, vui lòng kiểm tra đã sao chép đầy đủ thông tin khóa');
        }
        
        // Chuyển đổi mã ngôn ngữ
        // Để tự động nhận dạng, hãy sử dụng tính năng phát hiện ngôn ngữ tích hợp của FluentRead
        let sourceLang: string;
        if (config.from === 'auto') {
            const detectedLang = detectlang(message.origin.replace(/[\s\u3000]/g, ''));
            sourceLang = languageMap[detectedLang] || detectedLang;
            console.log('🔍 Kết quả nhận diện ngôn ngữ:', { detectedLang, mappedSource: sourceLang });
        } else {
            sourceLang = languageMap[config.from] || config.from;
        }
        
        const targetLang = languageMap[config.to] || config.to;
        
        console.log('🌐 Kết quả ánh xạ ngôn ngữ:', { 
            originalFrom: config.from, 
            mappedSource: sourceLang,
            originalTo: config.to, 
            mappedTarget: targetLang 
        });
        
        // Nếu ngôn ngữ nguồn giống với đích ngôn ngữ, hãy trả về trực tiếp Nguyên văn.
        if (sourceLang === targetLang) {
            console.log('⚠️ Ngôn ngữ nguồn và ngôn ngữ đích trùng nhau, trả về nguyên văn');
            return message.origin;
        }
        
        if (!targetLang) {
            throw new Error('Hunyuan không hỗ trợ ngôn ngữ đích này');
        }
        
        // Lấy cấu hình Mô hình, mặc định sử dụng hunyuan-translation
        const model = config.model[config.service] || 'hunyuan-translation';
        
        // Xây dựng nội dung yêu cầu
        const requestBody: any = {
            Model: model,
            Stream: false, // Tạm thời sử dụng các cuộc gọi không phát trực tuyến
            Text: message.origin,
            // Source: sourceLang,
            Target: targetLang
        };
        
        // Nếu bạn đã định cấu hình thông tin trường, bạn có thể thêm tham số Trường
        // requestBody.Field = 'Phổ quát';
        
        // Nếu bạn cần ví dụ tham khảo, bạn có thể thêm tham số Tài liệu tham khảo
        // requestBody.References = [{
        //     Type: "sentence",
        //     Text: "Ví dụ Nguyên văn",
        //     Bản dịch: "Ví dụ Bản dịch"
        // }];
        
        const requestBodyStr = JSON.stringify(requestBody);
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Tạo tiêu đề chữ ký và ủy quyền
        const authorization = await createHunyuanSignature(requestBodyStr, timestamp, secretId, secretKey);
        
        // Xác định xem có nên sử dụng proxy hay không
        const url = config.proxy[config.service] || 'https://hunyuan.tencentcloudapi.com/';
        
        console.log('📤 Yêu cầu dịch Hunyuan:', { url, requestBody, timestamp });
        
        const response = await fetch(url, {
            method: method.POST,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Host': 'hunyuan.tencentcloudapi.com',
                'Authorization': authorization,
                'X-TC-Action': 'ChatTranslations',
                'X-TC-Version': '2023-09-01',
                'X-TC-Region': 'ap-beijing',
                'X-TC-Timestamp': timestamp.toString()
            },
            body: requestBodyStr
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Yêu cầu Tencent Hunyuan thất bại: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const result = await response.json();
        console.log('📥 Phản hồi dịch Hunyuan:', result);
        
        // Kiểm tra lỗi
        if (result.Response?.Error) {
            console.error('❌ Lỗi API dịch Hunyuan:', result.Response.Error);
            throw new Error(`Lỗi Tencent Hunyuan: ${result.Response.Error.Code} - ${result.Response.Error.Message}`);
        }
        
        // Quay lại Kết quả dịch
        if (result.Response?.Choices && result.Response.Choices.length > 0) {
            const translatedText = result.Response.Choices[0].Message?.Content;
            if (translatedText) {
                console.log('✅ Dịch Hunyuan thành công:', translatedText);
                return translatedText;
            }
        }
        
        console.error('❌ Định dạng phản hồi dịch Hunyuan bất thường:', result);
        throw new Error('Định dạng phản hồi Tencent Hunyuan bất thường');
        
    } catch (error) {
        console.error('Gọi dịch vụ Tencent Hunyuan thất bại:', error);
        throw error;
    }
}

export default hunyuanTranslation;
