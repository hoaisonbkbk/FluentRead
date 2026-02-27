/**
 * Module quản lý hàng đợi dịch
 * Kiểm soát số lượng tác vụ dịch đồng thời để tránh có quá nhiều yêu cầu dịch cùng lúc
 */

import { config } from './config';

// trạng thái hàng đợi
let activeTranslations = 0; // Số tác vụ dịch hiện đang hoạt động
let pendingTranslations: Array<() => Promise<any>> = []; // Hàng đợi các tác vụ dịch đang chờ được thực thi

// Gỡ lỗi liên quan
const isDev = process.env.NODE_ENV === 'development';

// Nhận số lượng bản dịch đồng thời tối đa
function getMaxConcurrentTranslations(): number {
  return config.maxConcurrentTranslations || 6; // Giá trị mặc định là 6
}

/**
 * Thêm tác vụ dịch vào hàng đợi
 * @param dịchTask chức năng dịch thuật, cần trả về Promise
 * @returns trả về một Lời hứa, lời hứa này được giải quyết khi quá trình thực thi tác vụ hoàn tất.
 */
export function enqueueTranslation<T>(translationTask: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    // Tạo trình bao bọc tác vụ để xử lý trạng thái hàng đợi sau khi hoàn thành tác vụ
    const taskWrapper = async () => {
      
      try {
        // Thực hiện các nhiệm vụ dịch thuật thực tế
        const result = await translationTask();
        resolve(result);
        return result;
      } catch (error) {
        reject(error);
        throw error;
      } finally {
        // Bất kể thành công hay thất bại, số lượng tác vụ đang hoạt động cần phải giảm đi và hàng đợi được xử lý
        activeTranslations--;
        processQueue();
        
      }
    };

    // Thêm nhiệm vụ vào hàng đợi
    if (activeTranslations < getMaxConcurrentTranslations()) {
      // Thực hiện nhiệm vụ trực tiếp
      activeTranslations++;
      taskWrapper();
    } else {
      pendingTranslations.push(taskWrapper);
    }
  });
}

/**
 * Xử lý tác vụ tiếp theo trong hàng đợi
 */
function processQueue() {
  // Nếu có tác vụ đang chờ và số lượng tác vụ đang hoạt động chưa đạt đến giới hạn trên, hãy thực hiện tác vụ tiếp theo
  if (pendingTranslations.length > 0 && activeTranslations < getMaxConcurrentTranslations()) {
    const nextTask = pendingTranslations.shift();
    if (nextTask) {
      activeTranslations++;
      nextTask().catch(() => {
        // Các lỗi được xử lý bên trong tác vụ, chỉ các ngoại lệ Promise chưa được nắm bắt mới được ngăn chặn ở đây
      });
    }
  }
}

/**
 * Xóa hàng đợi dịch
 * Được gọi khi chuyển trang hoặc người dùng dừng dịch theo cách thủ công
 */
export function clearTranslationQueue() {
  
  pendingTranslations = [];
  // Không đặt lại Bản dịch đang hoạt động, hãy để các tác vụ dịch đang hoạt động hoàn thành một cách tự nhiên
}

/**
 * Nhận trạng thái hàng đợi
 * @returns trả về đối tượng trạng thái hàng đợi hiện tại
 */
export function getQueueStatus() {
  const maxConcurrent = getMaxConcurrentTranslations();
  return {
    activeTranslations,
    pendingTranslations: pendingTranslations.length,
    maxConcurrent: maxConcurrent,
    isQueueFull: activeTranslations >= maxConcurrent,
    totalTasksInProcess: activeTranslations + pendingTranslations.length
  };
}

/**
 * Kiểm tra xem có thể thêm nhiều nhiệm vụ hơn không
 * Được sử dụng khi quét nhanh một trang để xác định xem có cần tạm dừng quá trình quét hay không.
 */
export function canAcceptMoreTasks(): boolean {
  // Nếu hàng đợi quá dài, hãy trả về false để cho biết rằng quá trình quét cần phải tạm dừng.
  const MAX_QUEUE_LENGTH = getMaxConcurrentTranslations() * 3;
  return pendingTranslations.length < MAX_QUEUE_LENGTH;
}
