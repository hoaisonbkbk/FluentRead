import { method } from "../utils/constant";
import { config } from "@/entrypoints/utils/config";
import CryptoJS from 'crypto-js';

interface YoudaoResponse {
  errorCode: string;
  translation: string[];
  basic?: {
    explains: string[];
  };
}

async function youdao(message: any): Promise<string> {
  // Kiểm tra cấu hình cần thiết
  if (!config.youdaoAppKey || !config.youdaoAppSecret) {
    throw new Error('Vui lòng cấu hình App Key và App Secret của Youdao trước');
  }

  const appKey = config.youdaoAppKey;
  const appSecret = config.youdaoAppSecret;
  const query = message.origin;
  const salt = Date.now().toString();
  const curtime = Math.round(Date.now() / 1000).toString();

  // Tạo chữ ký
  function generateSign(appKey: string, query: string, salt: string, curtime: string, appSecret: string): string {
    let str1 = appKey + truncate(query) + salt + curtime + appSecret;
    return CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);
  }

  // Chức năng chặn (để tính toán chữ ký)
  function truncate(q: string): string {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  // Ánh xạ mã ngôn ngữ
  const langMap: { [key: string]: string } = {
    'auto': 'auto',
    'zh-Hans': 'zh-CHS',
    'zh-Hant': 'zh-CHT',
    'en': 'en',
    'ja': 'ja',
    'ko': 'ko',
    'fr': 'fr',
    'es': 'es',
    'pt': 'pt',
    'it': 'it',
    'vi': 'vi',
    'de': 'de',
    'ar': 'ar',
    'id': 'id',
    'af': 'af',
    'bs': 'bs',
    'bg': 'bg',
    'ca': 'ca',
    'hr': 'hr',
    'cs': 'cs',
    'da': 'da',
    'nl': 'nl',
    'et': 'et',
    'fj': 'fj',
    'fi': 'fi',
    'el': 'el',
    'ht': 'ht',
    'he': 'he',
    'hi': 'hi',
    'mww': 'mww',
    'hu': 'hu',
    'sw': 'sw',
    'tlh': 'tlh',
    'lv': 'lv',
    'lt': 'lt',
    'ms': 'ms',
    'mt': 'mt',
    'no': 'no',
    'fa': 'fa',
    'pl': 'pl',
    'otq': 'otq',
    'ro': 'ro',
    'ru': 'ru',
    'sr-Cyrl': 'sr-Cyrl',
    'sr-Latn': 'sr-Latn',
    'sk': 'sk',
    'sl': 'sl',
    'sv': 'sv',
    'ty': 'ty',
    'th': 'th',
    'to': 'to',
    'tr': 'tr',
    'uk': 'uk',
    'ur': 'ur',
    'cy': 'cy',
    'yua': 'yua',
    'yue': 'yue'
  };

  const fromLang = langMap[config.from] || 'auto';
  const toLang = langMap[config.to] || 'zh-CHS';

  const sign = generateSign(appKey, query, salt, curtime, appSecret);

  // Xây dựng các tham số yêu cầu
  const params = new URLSearchParams({
    q: query,
    from: fromLang,
    to: toLang,
    appKey: appKey,
    salt: salt,
    sign: sign,
    signType: 'v3',
    curtime: curtime
  });

  try {
    const response = await fetch('https://openapi.youdao.com/api', {
      method: method.POST,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: YoudaoResponse = await response.json();

    // Xử lý mã lỗi
    if (result.errorCode !== '0') {
      const errorMessages: { [key: string]: string } = {
        '101': 'Thiếu tham số bắt buộc',
        '102': 'Loại ngôn ngữ không được hỗ trợ',
        '103': 'Văn bản dịch quá dài',
        '104': 'Loại API không được hỗ trợ',
        '105': 'Loại chữ ký không được hỗ trợ',
        '106': 'Loại phản hồi không được hỗ trợ',
        '107': 'Loại mã hóa truyền tải không được hỗ trợ',
        '108': 'appKey không hợp lệ',
        '109': 'Định dạng batchLog không đúng',
        '110': 'Không có instance hợp lệ của dịch vụ liên quan',
        '111': 'Tài khoản nhà phát triển không hợp lệ',
        '113': 'q không được để trống',
        '201': 'Giải mã thất bại',
        '202': 'Xác minh chữ ký thất bại',
        '203': 'Địa chỉ IP truy cập không nằm trong danh sách cho phép',
        '301': 'Tra từ điển thất bại',
        '302': 'Tra cứu bản dịch thất bại',
        '303': 'Lỗi khác từ phía máy chủ',
        '401': 'Tài khoản đã nợ phí',
        '411': 'Tần suất truy cập bị giới hạn',
        '412': 'Yêu cầu dài gửi quá thường xuyên'
      };
      
      const errorMsg = errorMessages[result.errorCode] || `Lỗi không xác định(${result.errorCode})`;
      throw new Error(`Lỗi API Youdao: ${errorMsg}`);
    }

    // Quay lại Kết quả dịch
    if (result.translation && result.translation.length > 0) {
      return result.translation.join(' ');
    } else {
      throw new Error('Kết quả dịch rỗng');
    }

  } catch (error: any) {
    console.error('Lỗi dịch Youdao:', error);
    throw new Error(`Dịch thất bại: ${error.message || error}`);
  }
}

export default youdao;
