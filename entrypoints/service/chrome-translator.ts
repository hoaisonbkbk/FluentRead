import { config } from "@/entrypoints/utils/config";

/**
 * Dịch vụ API dịch tích hợp của Chrome
 * Dịch nhanh, an toàn dựa trên API dịch của Chrome
 * 
 * Sử dụng API ngoài màn hình Chrome để chạy các chức năng dịch trong môi trường DOM riêng biệt
 */

// Sử dụng API ngoài màn hình trong tập lệnh nền để xử lý bản dịch
async function translateWithOffscreen(message: any): Promise<any> {
    try {
        // Đảm bảo tài liệu ngoài màn hình tồn tại
        await ensureOffscreenDocument();

        // Gửi yêu cầu dịch tới tài liệu ngoài màn hình
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'CHROME_TRANSLATE_OFFSCREEN',
                data: {
                    text: message.origin,
                    from: config.from,
                    to: config.to
                }
            }, (response: any) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        // Kiểm tra phản hồi
        if (response && typeof response === 'object' && 'success' in response) {
            const typedResponse = response as { success: boolean; result?: string; error?: string };
            if (typedResponse.success) {
                return typedResponse.result;
            } else {
                throw new Error(typedResponse.error || 'Dịch thất bại');
            }
        }

        throw new Error('Định dạng phản hồi không hợp lệ');
    } catch (error) {
        console.error('Dịch Offscreen thất bại:', error);
        throw new Error(`Chrome Translation API không khả dụng: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
}

// Đảm bảo tài liệu ngoài màn hình tồn tại
async function ensureOffscreenDocument() {
    try {
        // Kiểm tra xem đã có tài liệu ngoài màn hình chưa
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });

        if (existingContexts.length > 0) {
            return; // đã tồn tại
        }

        // Tạo tài liệu ngoài màn hình
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['DOM_SCRAPING'], // Sử dụng lý do DOM_SCRAPING để truy cập API dịch
            justification: 'Chrome Translation API requires DOM context'
        });

        console.log('Đã tạo tài liệu offscreen thành công');
    } catch (error) {
        console.error('Tạo tài liệu offscreen thất bại:', error);
        throw new Error('Không thể tạo tài liệu offscreen');
    }
}

// chức năng dịch chính
export default async function chromeTranslator(message: any): Promise<any> {
    // console.log('Chrome Translator đã nhận được tin nhắn:', tin nhắn);

    const text = message.origin;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
        // console.error('Bản dịch trống hoặc không hợp lệ:', { text, type: typeof text, message });
        throw new Error('Văn bản dịch không được để trống');
    }

    // Kiểm tra xem trong môi trường tập lệnh nền
    if (typeof window === 'undefined') {
        // console.log('Trong tập lệnh nền, sử dụng API ngoài màn hình');
        // Trong tập lệnh nền, hãy sử dụng API ngoài màn hình
        return await translateWithOffscreen(message);
    }

    // Nếu ở môi trường khác, báo lỗi
    throw new Error('Chrome Translation API chỉ dùng được trên Google Chrome bản ổn định v138 trở lên');
}
