<template>
  <div class="translation-status-container" v-if="isVisible && isFloatingBallTranslating && !userClosed">
    <div class="translation-status-card">
      <div class="translation-status-header">
        <div class="translation-status-title">Tiến độ dịch</div>
        <div class="translation-status-close" @click="close">×</div>
      </div>
      <div class="translation-status-content">
        <div class="translation-status-row">
          <div class="translation-status-label">Tác vụ đang chạy:</div>
          <div class="translation-status-value">{{ status.activeTranslations }} / {{ status.maxConcurrent }}</div>
        </div>
        <div class="translation-status-row">
          <div class="translation-status-label">Tác vụ chờ:</div>
          <div class="translation-status-value">{{ status.pendingTranslations }}</div>
        </div>
        <div class="translation-status-progress">
          <div class="translation-status-progress-bar" :style="progressStyle"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getTranslationStatus } from '../entrypoints/utils/translateApi';

// Trạng thái thành phần
const isVisible = ref(false);
const isFloatingBallTranslating = ref(false);
const userClosed = ref(false); // Liệu người dùng có nhấp vào hộp trạng thái hay không
const status = ref({
  activeTranslations: 0,
  pendingTranslations: 0,
  maxConcurrent: 6,
  isQueueFull: false,
  totalTasksInProcess: 0
});

// Tính toán kiểu thanh tiến trình
const progressStyle = computed(() => {
  const percent = status.value.activeTranslations / status.value.maxConcurrent * 100;
  return {
    width: `${percent}%`,
    backgroundColor: percent > 80 ? '#ff7675' : percent > 50 ? '#fdcb6e' : '#00cec9'
  };
});

// Tắt thẻ trạng thái
const close = () => {
  userClosed.value = true; // Người dùng gắn cờ đã Tắt
};

// Đặt lại trạng thái Tắt - đặt lại khi người dùng rời khỏi trang Kích hoạt
const resetClosedState = () => {
  // Theo dõi các thay đổi về khả năng hiển thị của trang
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Đặt lại trạng thái khi trang trở nên ẩn (người dùng chuyển tab hoặc thu nhỏ)
      setTimeout(() => {
        userClosed.value = false;
      }, 1000);
    }
  });
  
  // Lắng nghe các thay đổi URL
  const lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      userClosed.value = false;
    }
  });
  
  // Quan sát những thay đổi trong các nút con của tài liệu, điều này có thể xảy ra khi URL thay đổi
  urlObserver.observe(document, { subtree: true, childList: true });
  
  return () => {
    document.removeEventListener('visibilitychange', () => {});
    urlObserver.disconnect();
  };
};

// Hẹn giờ cập nhật trạng thái
let statusUpdateTimer: number;

// Tạo hàm cập nhật trạng thái
const updateStatus = () => {
  const currentStatus = getTranslationStatus();
  status.value = currentStatus;
  
  // Chỉ hiển thị thẻ trạng thái khi có nhiệm vụ đang hoạt động hoặc nhiệm vụ đang chờ
  isVisible.value = currentStatus.activeTranslations > 0 || currentStatus.pendingTranslations > 0;
};

// Theo dõi sự thay đổi trạng thái dịch của bóng nổi
const listenToFloatingBallState = () => {
  // Đang nghe sự kiện tùy chỉnh: Bắt đầu dịch Kích hoạt
  const handleTranslationStarted = () => {
    isFloatingBallTranslating.value = true;
    // Khi một bản dịch mới được bắt đầu, nếu bản dịch được bắt đầu lại trên cùng một trang thì trạng thái người dùng cũng phải được đặt lại.
    if (!isVisible.value) {
      userClosed.value = false;
    }
  };
  
  // Nghe sự kiện tùy chỉnh: Dịch kết thúc
  const handleTranslationEnded = () => {
    isFloatingBallTranslating.value = false;
  };
  
  // Thêm người nghe sự kiện
  document.addEventListener('fluentread-translation-started', handleTranslationStarted);
  document.addEventListener('fluentread-translation-ended', handleTranslationEnded);
  
  // Trở lại chức năng làm sạch
  return {
    cleanup: () => {
      document.removeEventListener('fluentread-translation-started', handleTranslationStarted);
      document.removeEventListener('fluentread-translation-ended', handleTranslationEnded);
    }
  };
};

// Chức năng dọn dẹp cho trình xử lý sự kiện lưu trữ
let eventListenerCleanup: { cleanup: () => void };
let resetClosedStateCleanup: () => void;

// Kích hoạt tính năng hẹn giờ và giám sát sự kiện khi các thành phần được lắp đặt
onMounted(() => {
  updateStatus(); // Thực hiện cập nhật lần ngay lập tức
  statusUpdateTimer = window.setInterval(updateStatus, 500);
  eventListenerCleanup = listenToFloatingBallState();
  resetClosedStateCleanup = resetClosedState();
});

// Dọn dẹp bộ hẹn giờ và trình xử lý sự kiện khi gỡ cài đặt các thành phần
onUnmounted(() => {
  clearInterval(statusUpdateTimer);
  eventListenerCleanup.cleanup();
  resetClosedStateCleanup();
});
</script>

<style scoped>
.translation-status-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

.translation-status-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 220px;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.translation-status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: #3498db;
  color: white;
  font-weight: bold;
}

.translation-status-close {
  cursor: pointer;
  font-size: 16px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.translation-status-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.translation-status-content {
  padding: 12px;
}

.translation-status-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.translation-status-label {
  color: #666;
}

.translation-status-value {
  font-weight: 600;
  color: #333;
}

.translation-status-progress {
  height: 6px;
  background-color: #f1f1f1;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 10px;
}

.translation-status-progress-bar {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

/* Hỗ trợ chế độ tối - sử dụng bộ chọn :root[class="dark"] để phù hợp với hệ thống chủ đề của FluentRead */
:root[class="dark"] .translation-status-card {
  background-color: #2d3436;
  border-color: #4d4d4d;
  color: #dfe6e9;
}

:root[class="dark"] .translation-status-header {
  background-color: #2980b9;
}

:root[class="dark"] .translation-status-label {
  color: #b2bec3;
}

:root[class="dark"] .translation-status-value {
  color: #dfe6e9;
}

:root[class="dark"] .translation-status-progress {
  background-color: #3d3d3d;
}

/* Giữ các truy vấn phương tiện để hỗ trợ chế độ tự động */
@media (prefers-color-scheme: dark) {
  :root:not([class="light"]) .translation-status-card {
    background-color: #2d3436;
    border-color: #4d4d4d;
    color: #dfe6e9;
  }
  
  :root:not([class="light"]) .translation-status-header {
    background-color: #2980b9;
  }
  
  :root:not([class="light"]) .translation-status-label {
    color: #b2bec3;
  }
  
  :root:not([class="light"]) .translation-status-value {
    color: #dfe6e9;
  }
  
  :root:not([class="light"]) .translation-status-progress {
    background-color: #3d3d3d;
  }
}
</style> 