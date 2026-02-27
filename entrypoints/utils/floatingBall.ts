import { createApp } from 'vue';
import FloatingBall from '@/components/FloatingBall.vue';
import { config } from '@/entrypoints/utils/config';
import browser from 'webextension-polyfill';
import { storage } from '@wxt-dev/storage';
import { autoTranslateEnglishPage, restoreOriginalContent } from '@/entrypoints/main/trans';

let floatingBallInstance: any = null;
let app: any = null;
let isTranslated = false; // Thêm biến trạng thái để theo dõi trạng thái dịch

/**
 * Tạo và gắn kết quả bóng nổi  * @param vị trí bóng nổi vị trí 'trái' | 'đúng', nếu không được chuyển vào, hãy sử dụng giá trị trong cấu hình  * @returns 
 */
export function mountFloatingBall(position?: 'left' | 'right') {
  // Nếu cấu hình vô hiệu hóa quả bóng nổi hoặc một phiên bản đã tồn tại thì nó sẽ không được tạo.
  if (config.disableFloatingBall || floatingBallInstance) {
    return;
  }

  // Sử dụng tham số vị trí được truyền vào hoặc vị trí từ cấu hình
  const ballPosition = position || config.floatingBallPosition || 'right';
  // Cập nhật cấu hình
  config.floatingBallPosition = ballPosition;

  // Tạo phần tử vùng chứa
  const container = document.createElement('div');
  container.id = 'fluent-read-floating-ball-container';
  document.body.appendChild(container);

  // Tạo một phiên bản ứng dụng Vue
  app = createApp(FloatingBall, {
    position: ballPosition,
    showMenu: true,
    onDocClick: () => {
    },
    onSettingsClick: () => {
      browser.runtime.sendMessage({ type: 'openOptionsPage' });
    },
    // Thêm tính năng nghe sự kiện thay đổi vị trí
    onPositionChanged: (newPosition: 'left' | 'right') => {
      // Lưu vị trí vào cấu hình
      config.floatingBallPosition = newPosition;
      
      // Lưu cấu hình vào bộ nhớ
      saveConfig();

    },
    // Thêm giám sát sự kiện thay đổi trạng thái dịch
    onTranslationToggle: (isTranslating: boolean) => {
      if (isTranslating && !isTranslated) {
        // Sự kiện bắt đầu dịch kích hoạt
        document.dispatchEvent(new CustomEvent('fluentread-translation-started'));

        // Kích hoạt dịch tức thì
        autoTranslateEnglishPage();
        isTranslated = true;
      } else if (!isTranslating && isTranslated) {
        // Sự kiện kết thúc dịch kích hoạt
        document.dispatchEvent(new CustomEvent('fluentread-translation-ended'));
        
        // Khôi phục văn bản gốc
        restoreOriginalContent();
        isTranslated = false;
        
        // Đảm bảo trạng thái được đồng bộ hóa sau khi khôi phục
        floatingBallInstance.$el.classList.remove('is-translating');
      }
    }
  });

  // Gắn kết ứng dụng
  floatingBallInstance = app.mount(container);
  
  // Nghe các sự kiện tùy chỉnh để kích hoạt quả bóng nổi thông qua phím tắt
  document.addEventListener('fluentread-toggle-translation', toggleFloatingBallTranslation);

  return floatingBallInstance;
}

/**
 * Chuyển trạng thái dịch bóng nổi  * Được sử dụng khi được kích hoạt bằng phím tắt  */
export function toggleFloatingBallTranslation() {
  if (!floatingBallInstance) return;

  const currentState = floatingBallInstance.isTranslating;
  const newState = !currentState;
  
  // Kích hoạt sự kiện tùy chỉnh tương ứng
  if (newState) {
    document.dispatchEvent(new CustomEvent('fluentread-translation-started'));
  } else {
    document.dispatchEvent(new CustomEvent('fluentread-translation-ended'));
  }
  
  // Cập nhật trạng thái bóng nổi
  floatingBallInstance.isTranslating = newState;
  
  // Cập nhật trạng thái giao diện người dùng - sử dụng thuộc tính $el của phiên bản Vue
  if (floatingBallInstance.$el) {
    if (newState) {
      floatingBallInstance.$el.classList.add('fluent-read-floating-ball-active');
      // Bắt đầu dịch
      autoTranslateEnglishPage();
    } else {
      floatingBallInstance.$el.classList.remove('fluent-read-floating-ball-active');
      // Khôi phục văn bản gốc
      restoreOriginalContent();
    }
  }
}

/**
 * Xử lý sự kiện nhấp bóng nổi  */
function handleFloatingBallClick() {
  if (!floatingBallInstance) return;
  
  // Chuyển trạng thái dịch bóng nổi
  const newState = !floatingBallInstance.isTranslating;
  floatingBallInstance.isTranslating = newState;
  
  // Kích hoạt sự kiện tùy chỉnh tương ứng
  if (newState) {
    document.dispatchEvent(new CustomEvent('fluentread-translation-started'));
  } else {
    document.dispatchEvent(new CustomEvent('fluentread-translation-ended'));
  }
  
  // Cập nhật trạng thái giao diện người dùng - sử dụng thuộc tính $el của phiên bản Vue
  if (floatingBallInstance.$el) {
    if (newState) {
      floatingBallInstance.$el.classList.add('fluent-read-floating-ball-active');
      // Bắt đầu dịch
      autoTranslateEnglishPage();
    } else {
      floatingBallInstance.$el.classList.remove('fluent-read-floating-ball-active');
      // Khôi phục văn bản gốc
      restoreOriginalContent();
    }
  }
}

// Hiệu ứng hoạt hình bóng treo
function addFloatingBallAnimation(type: 'translate' | 'restore') {
  if (!floatingBallInstance) return;
  
  const ball = floatingBallInstance.element;
  const originalBackground = ball.style.background;
  const originalTransition = ball.style.transition;
  
  // Đặt hiệu ứng chuyển tiếp
  ball.style.transition = 'all 0.3s ease';
  
  // Đặt hình ảnh động khác nhau dựa trên loại
  if (type === 'translate') {
    // Hoạt hình kích hoạt dịch
    ball.style.transform = 'scale(1.2)';
    ball.style.boxShadow = '0 0 15px rgba(0, 128, 255, 0.8)';
    ball.style.background = '#4285f4';
  } else {
    // Khôi phục hoạt ảnh gốc
    ball.style.transform = 'scale(1.2)';
    ball.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.8)';
    ball.style.background = '#4caf50';
  }
  
  // Phục hồi
  setTimeout(() => {
    if (!floatingBallInstance) return;
    ball.style.transform = '';
    ball.style.boxShadow = '';
    ball.style.background = originalBackground;
    
    // Khôi phục cài đặt chuyển tiếp ban đầu
    setTimeout(() => {
      if (floatingBallInstance) {
        ball.style.transition = originalTransition;
      }
    }, 300);
  }, 300);
}

/**
 * Lưu cấu hình vào bộ nhớ  */
function saveConfig() {
  // Lưu cấu hình bằng API lưu trữ do plugin cung cấp
  storage.setItem('local:config', JSON.stringify(config)).catch((error) => {
    console.error('Failed to save config:', error);
  });
}

/**
 * Gỡ bỏ bóng nổi  */
export function unmountFloatingBall() {
  if (floatingBallInstance && app) {
    // Xóa trình xử lý sự kiện
    document.removeEventListener('fluentread-toggle-translation', toggleFloatingBallTranslation);
    
    // Nhận container
    const container = document.getElementById('fluent-read-floating-ball-container');
    
    // Gỡ cài đặt ứng dụng Vue
    app.unmount();
    floatingBallInstance = null;
    app = null;
    
    // Xóa vùng chứa
    if (container) {
      container.remove();
    }
  }
}

/**
 * Chuyển đổi khả năng hiển thị của quả bóng nổi  */
export function toggleFloatingBall() {
  if (floatingBallInstance) {
    unmountFloatingBall();
    config.disableFloatingBall = true;
  } else {
    config.disableFloatingBall = false;
    mountFloatingBall();
  }
  
  // Lưu cấu hình vào bộ nhớ
  saveConfig();
}

/**
 * Chuyển đổi vị trí của quả bóng nổi  */
export function toggleFloatingBallPosition() {
  const newPosition = config.floatingBallPosition === 'left' ? 'right' : 'left';
  if (floatingBallInstance) {
    unmountFloatingBall();
    config.floatingBallPosition = newPosition;
    mountFloatingBall(newPosition);
  } else {
    config.floatingBallPosition = newPosition;
  }
  
  // Lưu cấu hình vào bộ nhớ
  saveConfig();
} 