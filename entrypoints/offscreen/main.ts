/**
 * Tài liệu ngoài màn hình API dịch của Chrome  * Xử lý lệnh gọi API dịch Chrome trong môi trường ngoài màn hình  */

// Ánh xạ mã ngôn ngữ
const languageMap: { [key: string]: string } = {
    'zh-Hans': 'zh',
    'zh-Hant': 'zh-TW',
    'en': 'en',
    'ja': 'ja',
    'ko': 'ko',
    'fr': 'fr',
    'de': 'de',
    'es': 'es',
    'ru': 'ru',
    'it': 'it',
    'pt': 'pt',
    'ar': 'ar',
    'hi': 'hi',
    'th': 'th',
    'vi': 'vi',
    'nl': 'nl',
    'pl': 'pl',
    'tr': 'tr'
};

// Kiểm tra xem API dịch Chrome có được hỗ trợ không
function isChromeTranslationSupported(): boolean {
    console.log('Kiểm tra hỗ trợ Translation API:', {
        hasTranslation: 'translation' in self,
        hasTranslator: 'Translator' in self,
        hasLanguageDetector: 'LanguageDetector' in self,
        windowType: typeof window,
        selfType: typeof self
    });
    
    // Kiểm tra API mới
    if ('translation' in self && 'createTranslator' in (self as any).translation) {
        return true;
    }
    
    // Kiểm tra API cũ
    if ('Translator' in self && 'LanguageDetector' in self) {
        return true;
    }
    
    return false;
}

// Phát hiện ngôn ngữ văn bản
async function detectLanguage(text: string): Promise<string> {
    try {
        // Hãy thử API mới
        if ('translation' in self && 'createDetector' in (self as any).translation) {
            const detector = await (self as any).translation.createDetector();
            const results = await detector.detect(text);
            const detected = results.length > 0 ? results[0].detectedLanguage : 'en';
            console.log('Kết quả nhận diện API mới:', detected);
            return detected;
        }
        
        // Hãy thử sử dụng API cũ
        if ('LanguageDetector' in self) {
            const detector = await (self as any).LanguageDetector.create();
            const results = await detector.detect(text);
            const detected = results.length > 0 ? results[0].detectedLanguage : 'en';
            console.log('Kết quả nhận diện API cũ:', detected);
            return detected;
        }
    } catch (error) {
        console.warn('Language detection failed:', error);
    }
    
    // Dự phòng để phát hiện đơn giản
    const chineseRegex = /[\u4e00-\u9fff]/;
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
    const koreanRegex = /[\uac00-\ud7af]/;
    
    if (chineseRegex.test(text)) {
        return 'zh';
    } else if (japaneseRegex.test(text)) {
        return 'ja';
    } else if (koreanRegex.test(text)) {
        return 'ko';
    } else {
        return 'en';
    }
}

// Thực hiện dịch thuật
async function performTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
    console.log('Bắt đầu dịch:', { text: text.substring(0, 50) + '...', fromLang, toLang });
    
    try {
        let translator;
        
        // Hãy thử API mới
        if ('translation' in self && 'createTranslator' in (self as any).translation) {
            console.log('Đang dùng translation API mới');
            translator = await (self as any).translation.createTranslator({
                sourceLanguage: fromLang,
                targetLanguage: toLang
            });
        }
        // Hãy thử sử dụng API cũ
        else if ('Translator' in self) {
            console.log('Đang dùng Translator API cũ');
            translator = await (self as any).Translator.create({
                sourceLanguage: fromLang,
                targetLanguage: toLang
            });
        } else {
            throw new Error('Không có API dịch khả dụng');
        }

        let translatedText = '';
        
        // Kiểm tra xem bản dịch trực tuyến có được hỗ trợ không
        if (translator.translateStreaming) {
            console.log('Đang dùng dịch dạng stream');
            const stream = translator.translateStreaming(text);
            for await (const chunk of stream) {
                translatedText += chunk;
            }
        } else if (translator.translate) {
            console.log('Đang dùng dịch thường');
            translatedText = await translator.translate(text);
        } else {
            throw new Error('Trình dịch không hỗ trợ phương thức dịch');
        }

        console.log('Hoàn tất dịch:', translatedText.substring(0, 50) + '...');
        return translatedText;
        
    } catch (error) {
        console.error('Thực thi dịch thất bại:', error);
        throw error;
    }
}

// Xử lý các yêu cầu dịch thuật
async function handleTranslationRequest(data: any): Promise<string> {
    const { text, from, to } = data;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return ""
    }

    // Kiểm tra xem API dịch Chrome có được hỗ trợ không
    if (!isChromeTranslationSupported()) {
        throw new Error('Trình duyệt hiện tại không hỗ trợ Chrome Translation API. Vui lòng dùng Google Chrome bản ổn định v138 hoặc cao hơn.');
    }

    // Khai báo các biến để sử dụng trong khối bắt
    let detectedLang = from;
    let fromLang = from;
    let toLang = to;
    
    try {
        // Phát hiện ngôn ngữ nguồn
        if (from === 'auto') {
            detectedLang = await detectLanguage(text);
            console.log('Ngôn ngữ tự nhận diện:', detectedLang);
        }
        
        // Ánh xạ mã ngôn ngữ - Đảm bảo bạn sử dụng định dạng được API Chrome hỗ trợ
        fromLang = languageMap[detectedLang] || detectedLang;
        toLang = languageMap[to] || to;

        console.log('Ánh xạ ngôn ngữ:', { 
            original: { from, to }, 
            detected: detectedLang,
            mapped: { fromLang, toLang }
        });

        // Nếu ngôn ngữ nguồn giống với ngôn ngữ đích thì không cần dịch
        if (fromLang === toLang) {
            console.log('Ngôn ngữ nguồn và đích giống nhau, trả về nguyên văn');
            return text;
        }

        // Thực hiện dịch thuật
        return await performTranslation(text, fromLang, toLang);

    } catch (error) {
        console.error('Chrome Translation API error:', error);
        console.error('Chi tiết lỗi:', {
            error: error,
            message: error instanceof Error ? error.message : 'Lỗi không xác định',
            from: from,
            to: to,
            detectedLang: detectedLang,
            fromLang: fromLang,
            toLang: toLang
        });
        
        // Cung cấp thông báo lỗi thân thiện hơn
        if (error instanceof Error) {
            if (error.message.includes('not available') || error.message.includes('not ready')) {
                throw new Error('Chrome Translation API tạm thời không khả dụng. Có thể cần tải mô hình ngôn ngữ, vui lòng thử lại sau.');
            } else if (error.message.includes('language') || error.message.includes('not supported')) {
                throw new Error(`Cặp ngôn ngữ không được hỗ trợ: ${fromLang} -> ${toLang}. Vui lòng thử cặp ngôn ngữ khác hoặc kiểm tra phiên bản trình duyệt.`);
            } else if (error.message.includes('model')) {
                throw new Error('Mô hình dịch chưa sẵn sàng, vui lòng thử lại sau hoặc kiểm tra kết nối mạng.');
            }
        }
        
        throw new Error(`Dịch thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
}

// Nghe tin nhắn từ tập lệnh nền
chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response: any) => void) => {
    // console.log('Tin nhắn đã nhận ngoài màn hình:', message);
    
    if (message.type === 'CHROME_TRANSLATE_OFFSCREEN') {
        handleTranslationRequest(message.data)
            .then(result => {
                // console.log('Offscreen Dịch thành công:', result.substring(0, 50) + '...');
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.error('Dịch Offscreen thất bại:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true; // Giữ kênh tin nhắn Kích hoạt mở để hỗ trợ phản hồi không đồng bộ
    }
    
    return false;
});

// Kiểm tra khởi tạo
console.log('Khởi tạo Chrome Translation Offscreen');
console.log('Trạng thái hỗ trợ Translation API:', isChromeTranslationSupported());
