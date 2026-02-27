import { config } from "@/entrypoints/utils/config";
import {customModelString, services} from "@/entrypoints/utils/option";
import { storage } from '@wxt-dev/storage';

let containerEl: HTMLElement | null = null;

/**
 * Gắn kết thành phần API mới
 */
export function mountNewApiComponent() {
  // Nếu một phiên bản đã tồn tại hoặc Tắt được định cấu hình với tính năng này, nó sẽ không được tạo
  if (containerEl) {
    return;
  }

  // Tạo phần tử vùng chứa
  const container = document.createElement('div');
  container.id = 'fluent-new-api-container';
  document.body.appendChild(container);
  containerEl = container;

  container.addEventListener('fluent:prefill', async (e) => {
    const customEvent = e as CustomEvent;
    const payload = (customEvent?.detail) || {};

    const id = payload.id || '';

    if (id !== 'new-api') return; // Chỉ xử lý các sự kiện API mới

    const baseUrl = payload.baseUrl || '';
    const apiKey = payload.apiKey || '';
    const model = payload.model || '';
    const maskedKey = apiKey ? apiKey.slice(0, 3) + '***' + apiKey.slice(-3) : '(trống)';

    const confirmed = window.confirm(
      `Phát hiện cấu hình New API:\n- Địa chỉ API: ${baseUrl || '(trống)'}\n- API Key: ${maskedKey}\n- Mô hình: ${model || '(trống)'}\n\nBạn có muốn áp dụng cấu hình này và chuyển sang New API không?`
    );
    if (!confirmed) return;

    config.newApiUrl = baseUrl;
    config.token[services.newapi] = apiKey;
    config.service = services.newapi;
    if (model && model !== '') {
      config.model[config.service] = customModelString
      config.customModel[config.service] = model;
    }


    try {
      await storage.setItem('local:config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  });

  return container;
}

/**
 * Gỡ cài đặt thành phần API mới
 */
export function unmountNewApiComponent() {
  const container = document.getElementById('fluent-new-api-container');
  if (container) container.remove();
  containerEl = null;
}