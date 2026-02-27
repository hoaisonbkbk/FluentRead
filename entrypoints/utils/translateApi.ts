/**
 * Mô-đun proxy API dịch thuật
 * Tích hợp quản lý hàng đợi dịch như một lớp trung gian giữa các chức năng dịch và dịch vụ dịch nền
 */

import { enqueueTranslation, clearTranslationQueue, getQueueStatus } from './translateQueue';
import browser from 'webextension-polyfill';
import { config } from './config';
import { cache } from './cache';
import { detectlang } from './common';
import { storage } from '@wxt-dev/storage';

// Gỡ lỗi liên quan
const isDev = process.env.NODE_ENV === 'development';

/**
 * Lối vào thống nhất vào API dịch thuật
 * Tất cả các yêu cầu dịch phải được gửi qua chức năng này để quản lý tập trung hàng đợi và thử lại logic
 * 
 * @param nguồn gốc văn bản gốc
 * @param thông tin ngữ cảnh ngữ cảnh, thường là tiêu đề trang
 * tùy chọn @param tùy chọn dịch
 * @returns Lời hứa về kết quả dịch thuật
 */
export async function translateText(origin: string, context: string = document.title, options: TranslateOptions = {}): Promise<string> {
  const {
    maxRetries = 3, 
    retryDelay = 1000, 
    timeout = 45000,
    useCache = config.useCache,
  } = options;

  // Nếu ngôn ngữ đích giống với ngôn ngữ văn bản hiện tại, hãy trả lại trực tiếp văn bản gốc.
  if (detectlang(origin.replace(/[\s\u3000]/g, '')) === config.to) {
    return origin;
  }

  // Kiểm tra bộ đệm
  if (useCache) {
    const cachedResult = cache.localGet(origin);
    if (cachedResult) {
      if (isDev) {
        console.log('[TranslationAPI] Trúng bộ nhớ đệm, trả về kết quả ngay');
      }
      return cachedResult;
    }
  }

  // Tăng số lượng dịch
  config.count++;
  // Lưu cấu hình để đảm bảo tính bền vững
  storage.setItem('local:config', JSON.stringify(config));

  // Sử dụng hàng đợi để xử lý các yêu cầu dịch
  return enqueueTranslation(async () => {
    // Tạo tác vụ dịch
    const translationTask = async (retryCount: number = 0): Promise<string> => {
      try {
        // Gửi yêu cầu dịch tới tập lệnh nền để xử lý
        const result = await Promise.race([
          browser.runtime.sendMessage({ context, origin }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Hết thời gian chờ yêu cầu dịch')), timeout)
          )
        ]) as string;

        // Nếu kết quả dịch trống hoặc giống hệt văn bản gốc thì trả về trực tiếp văn bản gốc.
        if (!result || result === origin) {
          return origin;
        }

        // Kết quả dịch được lưu vào bộ nhớ đệm
        if (useCache) {
          cache.localSet(origin, result);
        }

        return result;
      } catch (error) {
        // Xử lý lỗi và quyết định có thử lại hay không dựa trên chiến lược thử lại
        if (retryCount < maxRetries) {
          if (isDev) {
            console.log(`[TranslationAPI] Dịch thất bại, thử lại ${retryCount + 1}/${maxRetries}, lý do:`, error);
          }
          
          // Đợi một lúc và thử lại
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return translationTask(retryCount + 1);
        }
        
        // Nếu vượt quá số lần thử lại tối đa, một ngoại lệ sẽ được đưa ra.
        throw error;
      }
    };

    // Bắt đầu tác vụ dịch
    return translationTask();
  });
}

/**
 * Xóa hàng đợi dịch khi người dùng rời khỏi trang hoặc chủ động hủy bản dịch.
 */
export function cancelAllTranslations() {
  if (isDev) {
    console.log('[TranslationAPI] Đã hủy tất cả tác vụ dịch đang chờ');
  }
  clearTranslationQueue();
}

/**
 * Nhận trạng thái của hàng đợi dịch hiện tại
 * Có thể được sử dụng trong giao diện người dùng để hiển thị tiến trình dịch thuật, v.v.
 */
export function getTranslationStatus() {
  return getQueueStatus();
}

/**
 * Giao diện tham số dịch
 */
export interface TranslateOptions {
  /** Số lần thử lại tối đa */
  maxRetries?: number;
  /** Khoảng thời gian thử lại (mili giây) */
  retryDelay?: number;
  /** Thời gian chờ (mili giây) */
  timeout?: number;
  /** Có nên sử dụng bộ nhớ đệm hay không */
  useCache?: boolean;
} 
