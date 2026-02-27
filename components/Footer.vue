<template>
  <div class="footer-container footer-size">
    <p class="translation-count">Bạn đã dịch
      <el-text class="count-number" type="primary">{{ computedCount }}</el-text>
      lần
    </p>
    <div class="footer-links">
      <el-link class="action-link left" :class="{ 'failed': buttonText === 'Xóa thất bại', 'success': buttonText === 'Xóa thành công' }" @click="clearCache"
        :disabled="buttonDisabled">
        <el-icon v-if="showLoading">
          <Loading class="el-icon-loading" />
        </el-icon>
        {{ buttonText }}
      </el-link>
      <div class="right-links">
        <el-link class="action-link" href="https://fluent.thinkstu.com/" target="_blank">
          <el-icon class="github-icon">
            <Star />
          </el-icon>
          Mã nguồn mở GitHub
        </el-link>
      </div>
    </div>
    
    <!-- Mã hỗ trợ cửa sổ bật lên -->
    <div
      title="Ủng hộ tác giả"
      width="300px"
      align-center
      :show-close="true"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="donate-dialog"
    >
      <div class="donate-content">
        <p class="donate-text">Nếu bạn thấy tiện ích này hữu ích,<br>bạn có thể ủng hộ tác giả một ly cà phê qua WeChat 👇🏻
          <el-icon class="donate-icon"><Coffee /></el-icon> </p>
        <div class="qrcode-container">
          <img src="/misc/approve.jpg" alt="Mã ủng hộ" class="qrcode-image" />
        </div>
        <p class="donate-thanks">Cảm ơn bạn đã ủng hộ! ❤️</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { Star, Loading, Coffee } from "@element-plus/icons-vue";
import { Config } from "../entrypoints/utils/model";
import { storage } from '@wxt-dev/storage';
import browser from 'webextension-polyfill';

// Thực ra el-link không phải el-button
const buttonDisabled = ref(false);
const buttonText = ref('Xóa bộ nhớ đệm dịch');

const showLoading = ref(false);
async function clearCache() {
  try {
    buttonDisabled.value = true;
    buttonText.value = "Đang xóa...";
    showLoading.value = true;

    // Nhận tab hiện tại
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error('No active tab found');
    }

    // Gửi tin nhắn đến content.js
    await browser.tabs.sendMessage(tabs[0].id, { message: 'clearCache' });

    // Hiển thị trạng thái thành công
    buttonText.value = "Xóa thành công";

    // Khôi phục trạng thái nút
    setTimeout(() => {
      buttonDisabled.value = false;
      buttonText.value = 'Xóa bộ nhớ đệm dịch';
      showLoading.value = false;
    }, 1500);

  } catch (error) {
    console.error('Xóa bộ nhớ đệm thất bại:', error);
    buttonText.value = "Xóa thất bại";

    // Khôi phục trạng thái nút
    setTimeout(() => {
      buttonDisabled.value = false;
      buttonText.value = 'Xóa bộ nhớ đệm dịch';
      showLoading.value = false;
    }, 1500);
  }
}

// Nhận cấu hình hiển thị số lần dịch
let localConfig = reactive(new Config());

storage.getItem('local:config').then((value) => {
  if (typeof value === 'string' && value) Object.assign(localConfig, JSON.parse(value));
});

storage.watch('local:config', (newValue, oldValue) => {
  if (typeof newValue === 'string' && newValue) Object.assign(localConfig, JSON.parse(newValue));
});

const computedCount = computed(() => localConfig.count);


</script>

<style scoped>
.footer-size {
  font-size: 0.8em;
}

.footer-container {
  background: var(--fr-bg-color);
  margin: -16px;
}

.translation-count {
  margin: 0px;
  font-size: 1.2em;
  color: var(--fr-text-color-regular);
  text-align: center;
}

.count-number {
  font-weight: 600;
  font-size: 1.1em;
  margin: 0 3px;
  color: var(--el-color-success);
}

.footer-links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.right-links {
  display: flex;
  gap: 12px;
}

.action-link {
  font-size: 1.2em;
  transition: all 1s ease;
  text-decoration: none !important;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-link:hover {
  opacity: 0.8;
}

.action-link:active {
  transform: scale(0.98);
}

.github-icon, .donate-icon {
  font-size: 1.2em;
  margin-right: 2px;
}

.donate-icon {
  color: var(--el-color-warning);
}

:deep(.el-icon-loading) {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.clearing {
  color: var(--el-color-success) !important;
}

.failed {
  color: var(--el-color-danger) !important;
}

/* Thêm kiểu trạng thái thành công */
.action-link.success {
  color: var(--el-color-success) !important;
}

/* Mã ủng hộ phong cách pop-up */
.donate-dialog :deep(.el-dialog__header) {
  padding-bottom: 10px;
  margin-right: 0;
  text-align: center;
  border-bottom: 1px solid var(--fr-border-color-lighter);
}

.donate-dialog :deep(.el-dialog__headerbtn) {
  top: 15px;
}

.donate-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -5px;
}

.donate-text {
  text-align: center;
  margin-bottom: 15px;
  color: var(--fr-text-color-primary);
  line-height: 1.5;
}

.qrcode-container {
  width: 200px;
  height: 200px;
  margin: 0 auto 15px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--fr-border-color-light);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.qrcode-container:hover {
  transform: scale(1.02);
}

.qrcode-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #fff;
}

.donate-thanks {
  text-align: center;
  margin: 10px 0 15px;
  color: var(--el-color-success);
  font-weight: bold;
}

/* Adaptor tối giao diện */
@media (prefers-color-scheme: dark) {
  .footer-container {
    background: var(--fr-bg-color-darker);
  }
  
  .qrcode-image {
    border: 1px solid var(--fr-border-color);
  }
}
</style>
