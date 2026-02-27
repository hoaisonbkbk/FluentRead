import { createApp } from 'vue';
import SelectionTranslator from '@/components/SelectionTranslator.vue';
import { config } from '@/entrypoints/utils/config';
import { storage } from '@wxt-dev/storage';

let selectionTranslatorInstance: any = null;
let app: any = null;

/**
 * Gắn kết thành phần dịch lựa chọn từ
 */
export function mountSelectionTranslator() {
  // Nếu một phiên bản đã tồn tại hoặc cấu hình tắt tính năng này thì nó sẽ không được tạo
  if (selectionTranslatorInstance || config.disableSelectionTranslator || config.selectionTranslatorMode === 'disabled') {
    return;
  }

  // Tạo phần tử vùng chứa
  const container = document.createElement('div');
  container.id = 'fluent-read-selection-translator-container';
  document.body.appendChild(container);

  // Tạo một phiên bản ứng dụng Vue
  app = createApp(SelectionTranslator);

  // Gắn kết ứng dụng
  selectionTranslatorInstance = app.mount(container);

  return selectionTranslatorInstance;
}

/**
 * Gỡ bỏ thành phần dịch chọn từ
 */
export function unmountSelectionTranslator() {
  if (selectionTranslatorInstance && app) {
    // Nhận container
    const container = document.getElementById('fluent-read-selection-translator-container');
    
    // Gỡ cài đặt ứng dụng Vue
    app.unmount();
    selectionTranslatorInstance = null;
    app = null;
    
    // Xóa vùng chứa
    if (container) {
      container.remove();
    }
  }
}

/**
 * Chuyển đổi trạng thái kích hoạt của thành phần dịch chọn từ
 */
export function toggleSelectionTranslator() {
  if (selectionTranslatorInstance) {
    unmountSelectionTranslator();
    config.disableSelectionTranslator = true;
  } else {
    config.disableSelectionTranslator = false;
    mountSelectionTranslator();
  }
  
  // Lưu cấu hình vào bộ nhớ
  saveConfig();
}

/**
 * Lưu cấu hình vào bộ nhớ
 */
function saveConfig() {
  // Lưu cấu hình bằng API lưu trữ do plugin cung cấp
  storage.setItem('local:config', JSON.stringify(config)).catch((error) => {
    console.error('Failed to save config:', error);
  });
} 