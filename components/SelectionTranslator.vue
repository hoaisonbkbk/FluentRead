<template>
  <teleport to="body">
    <!-- Chỉ báo chấm đỏ nhỏ -->
    <div v-if="showIndicator" 
         class="fr-selection-indicator" 
         :style="indicatorStyle" 
         @mouseenter="handleMouseEnter"
         @mouseleave="handleMouseLeave">
    </div>
    
    <!-- Cửa sổ bật lên dịch kết quả -->
    <div v-if="showTooltip" 
         class="fr-translation-tooltip" 
         :class="{ 'fr-dark-theme': isDarkTheme }"
         :style="tooltipStyle"
         @mouseenter="handleMouseEnterTooltip"
         @mouseleave="handleMouseLeaveTooltip">
      <div class="fr-tooltip-header">
        <span>Kết quả dịch<small>(qua FluentRead)</small></span>
        <div class="fr-tooltip-actions">
          <button class="fr-action-btn" @click="copyTranslation" title="Sao chép bản dịch">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="fr-close-btn" @click="closeTooltip">×</button>
        </div>
      </div>
      <div class="fr-tooltip-content">
        <div v-if="isLoading" :class="['fr-loading-spinner', { 'fr-static': !config.animations }]"></div>
        <div v-else-if="error" class="fr-error-message">{{ error }}</div>
        <div v-else class="fr-translation-container">
          <!-- Hiển thị nguyên văn (chỉ hiển thị ở chế độ song ngữ) -->
          <div v-if="config.selectionTranslatorMode === 'bilingual'" class="fr-original-text fr-no-select">
            <pre>{{ selectedText }}</pre>
            <button class="fr-text-audio-btn" @click="(e) => toggleAudio(selectedText, e)" title="Phát/dừng nguyên văn">
              <svg v-if="isPlaying && currentPlayingText === selectedText" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            </button>
          </div>
          <!-- Hiển thị bản dịch (hiển thị ở cả chế độ song ngữ và Chỉ hiển thị chế độ dịch) -->
          <div v-if="config.selectionTranslatorMode === 'bilingual' || config.selectionTranslatorMode === 'translation-only'" class="fr-translation-result fr-no-select">
            <pre>{{ translationResult }}</pre>
            <button class="fr-text-audio-btn" @click="(e) => toggleAudio(translationResult, e)" title="Phát/dừng bản dịch">
              <svg v-if="isPlaying && currentPlayingText === translationResult" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </button>
          </div>
          
          <!-- Lời nhắc trạng thái phát lại - hiển thị bên trong cửa sổ bật lên -->
          <div v-if="isPlaying" class="fr-playing-status">
            <div class="fr-playing-status-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
              </svg>
            </div>
            <span>Đang phát: {{ currentPlayingText === selectedText ? 'Nguyên văn' : 'Bản dịch' }}</span>
            <button class="fr-stop-audio-btn" @click="(e) => stopAudio(e)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Sao chép các mẹo thành công -->
    <div v-if="copySuccess" class="fr-copy-success-toast" :class="{ 'fr-dark-theme': isDarkTheme }">
      <div class="fr-copy-success-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>Sao chép bản dịch thành công!</span>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { translateText } from '@/entrypoints/utils/translateApi';
import { config } from '@/entrypoints/utils/config';

// biến trạng thái
const selectedText = ref('');
const translationResult = ref('');
const selectionRect = ref<DOMRect | null>(null);
const showIndicator = ref(false);
const showTooltip = ref(false);
const isLoading = ref(false);
const error = ref('');
const hideTooltipTimer = ref<number | null>(null);
const isHoveringTooltip = ref(false);
const copySuccess = ref(false);
const isPlaying = ref(false);
const audioElement = ref<HTMLAudioElement | null>(null);
const lastSelectedText = ref(''); // Dùng để lưu trữ nội dung của lần lựa chọn trước đó
const isSelecting = ref(false); // Đánh dấu xem người dùng có đang chọn văn bản hay không
const debounceTimer = ref<number | null>(null); // Hẹn giờ chống rung
const currentPlayingText = ref(''); // Văn bản hiện đang phát
const isFirefox = ref(false); // Cho dù đó là trình duyệt Firefox
const isDarkTheme = ref(false); // trạng thái chủ đề

// Tính toán kiểu dáng của chỉ báo chấm đỏ nhỏ
const indicatorStyle = computed(() => {
  if (!selectionRect.value) return {};
  
  return {
    left: `${selectionRect.value.right}px`,
    top: `${selectionRect.value.top}px`,
    transform: 'translate(3px, -50%)'
  };
});

// Tính toán kiểu cửa sổ bật lên
const tooltipStyle = computed(() => {
  if (!selectionRect.value) return {};
  
  // Đảm bảo cửa sổ bật lên không vượt quá khung nhìn
  const left = Math.min(
    selectionRect.value.right + 15,
    window.innerWidth - 350 // Tăng chiều rộng một chút để phù hợp với văn bản được gói
  );
  
  return {
    left: `${left}px`,
    top: `${selectionRect.value.top}px`,
    maxWidth: '350px', // Tăng chiều rộng để phù hợp với nhiều nội dung hơn
    maxHeight: '400px' // Tăng chiều cao tối đa để hỗ trợ nhiều nội dung hơn
  };
});

// Chức năng chống rung
const debounce = (fn: Function, delay: number) => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
  debounceTimer.value = window.setTimeout(() => {
    fn();
    debounceTimer.value = null;
  }, delay);
};

// Xử lý các sự kiện chọn văn bản (sử dụng tính năng tối ưu hóa chống rung)
const handleTextSelection = () => {
  // Nếu người dùng đang thực hiện lựa chọn, đừng xử lý nó ngay lập tức
  if (isSelecting.value) return;
  
  debounce(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      hideIndicator();
      return;
    }
    
    const selectedTextContent = selection.toString().trim();
    
    // Nếu văn bản đã chọn trống, nó sẽ không được xử lý
    if (!selectedTextContent) {
      return;
    }
    
    // Nếu văn bản đã chọn giống với lần ở trên thì hiển thị lại chỉ báo (để tránh hiện tượng không hiển thị văn bản giống nhau)
    if (selectedTextContent === lastSelectedText.value) {
      // Hiển thị lại chỉ báo mà không tìm nạp lại bản dịch
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selectionRect.value = rect;
      showIndicator.value = true;
      return;
    }
    
    // Bỏ qua các lựa chọn quá ngắn (để tránh vô tình kích hoạt)
    if (selectedTextContent.length < 2) {
      hideIndicator();
      return;
    }
    
    // Bỏ qua các lựa chọn dài (để tránh các vấn đề về hiệu suất do xử lý khối văn bản lớn)
    const maxTextLength = 4096; // Đặt giới hạn ký tự tối đa
    if (selectedTextContent.length > maxTextLength) {
      hideIndicator();
      return;
    }
    
    // Nhận thông tin vị trí cho Tiếng Trung đã chọn
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Lưu chọn sách Tiếng Trung và địa điểm
    selectedText.value = selectedTextContent;
    lastSelectedText.value = selectedTextContent;
    selectionRect.value = rect;
    showIndicator.value = true;
  }, 200); // Độ trễ chống rung 200ms, giảm độ trễ và cải thiện khả năng phản hồi
};

// chỉ báo nhập chuột
const handleMouseEnter = () => {
  clearHideTooltipTimer();
  showTooltip.value = true;
};

// Chỉ báo Kích hoạt Di chuột
const handleMouseLeave = () => {
  // Nếu chuột không ở trên chú giải công cụ, hãy đặt hẹn giờ để ẩn chú giải công cụ
  if (!isHoveringTooltip.value) {
    setHideTooltipTimer();
  }
};

// Chuột vào cửa sổ bật lên
const handleMouseEnterTooltip = () => {
  isHoveringTooltip.value = true;
  clearHideTooltipTimer();
};

// Chuột trái Kích hoạt cửa sổ bật lên
const handleMouseLeaveTooltip = () => {
  isHoveringTooltip.value = false;
  
  // Nếu âm thanh hiện đang phát, cửa sổ bật lên sẽ không tự động ẩn.
  if (isPlaying.value) return;
  
  setHideTooltipTimer();
};

// Đặt hẹn giờ để ẩn cửa sổ bật lên
const setHideTooltipTimer = () => {
  clearHideTooltipTimer();
  hideTooltipTimer.value = window.setTimeout(() => {
    // Nếu âm thanh hiện đang phát, đừng ẩn cửa sổ bật lên
    if (isPlaying.value) return;
    
    showTooltip.value = false;
  }, 250); // Ẩn sau 250 mili giây
};

// Xóa bộ hẹn giờ để ẩn cửa sổ bật lên
const clearHideTooltipTimer = () => {
  if (hideTooltipTimer.value !== null) {
    clearTimeout(hideTooltipTimer.value);
    hideTooltipTimer.value = null;
  }
};

// ẩn chỉ báo
const hideIndicator = () => {
  showIndicator.value = false;
  setHideTooltipTimer();
};

// Tắt cửa sổ bật lên dịch
const closeTooltip = () => {
  showTooltip.value = false;
  // Dừng phát lại âm thanh khi Tắt bật lên
  stopAudio();
};

// Nhận kết quả dịch
const getTranslation = async () => {
  if (!selectedText.value) return;
  
  isLoading.value = true;
  error.value = '';
  
  try {
    // Sử dụng dịch vụ Dịch vụ được cấu hình hiện tại để dịch
    const result = await translateText(selectedText.value);
    translationResult.value = result;
  } catch (err) {
    error.value = 'Dịch thất bại, vui lòng thử lại';
    console.error('Translation error:', err);
  } finally {
    isLoading.value = false;
  }
};

// Sao chépchuyển Bản dịch
const copyTranslation = () => {
  if (!translationResult.value) return;
  
  // Sử dụng API navigator.clipboardSao chép văn bản
  navigator.clipboard.writeText(translationResult.value)
    .then(() => {
      // Hiển thị thông báo Sao chép thành công
      copySuccess.value = true;
      // Ẩn tin nhắn sau 1,5 giây
      setTimeout(() => {
        copySuccess.value = false;
      }, 1500);
    })
    .catch(err => {
      console.error('Sao chép thất bại:', err);
    });
};

// Phát hoặc dừng chuyển văn bản thành giọng nói
const toggleAudio = (text: string, e?: Event) => {
  if (!text) return;

  // Ngăn chặn sự kiện sủi bọt và tránh kích hoạt các sự kiện nhấp chuột bên ngoài gây ra cửa sổ bật lên Tắt
  // Đối với các sự cố tương thích với Firefox, đối tượng sự kiện đến sẽ được sử dụng trước tiên, nếu không thì sự kiện chung sẽ được sử dụng.
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  } else if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Đảm bảo cửa sổ bật lên không biến mất
  clearHideTooltipTimer();
  isHoveringTooltip.value = true;

  // Dừng phát nếu văn bản tương tự hiện đang phát
  if (isPlaying.value && currentPlayingText.value === text) {
    stopAudio(e);
    return;
  }
  
  // Nếu văn bản khác đang phát, hãy dừng nó trước
  if (isPlaying.value) {
    stopAudio(e);
  }
  
  // Phát hiện ngôn ngữ
  const language = detectLanguage(text);
  
  // Tạo URL tổng hợp giọng nói
  const speechUrl = createSpeechUrl(text, language);
  
  // Đặt trạng thái trước khi tạo thành phần âm thanh để giải quyết vấn đề cập nhật trạng thái chậm trên Firefox
  isPlaying.value = true;
  currentPlayingText.value = text;
  
  // Tạo các phần tử âm thanh
  const audio = new Audio(speechUrl);
  audioElement.value = audio;
  
  // Giám sát sự kiện bắt đầu phát lại
  audio.onplay = () => {
    // Đảm bảo trạng thái được cập nhật
    isPlaying.value = true;
    currentPlayingText.value = text;
  };
  
  // Nghe các sự kiện kết thúc phát lại
  audio.onended = () => {
    isPlaying.value = false;
    audioElement.value = null;
    currentPlayingText.value = '';
  };
  
  // Lắng nghe các sự kiện lỗi
  audio.onerror = (e) => {
    console.error('Phát âm thanh thất bại:', e);
    isPlaying.value = false;
    audioElement.value = null;
    currentPlayingText.value = '';
    
    // Đừng cố gắng sử dụng API Web Speech làm phương án dự phòng để tránh phát lại trùng lặp
    // tryWebSpeechAPI(text, language);
  };
  
  // Bật bắt đầu phát
  const playPromise = audio.play();
  
  // Xử lý việc chơi Promise
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.error('Lỗi phát âm thanh:', err);
      isPlaying.value = false;
      audioElement.value = null;
      currentPlayingText.value = '';
      
      // Hãy thử sử dụng API Web Speech làm phương án thay thế, chỉ khi Google TTS không thành công
      tryWebSpeechAPI(text, language);
    });
  }
};

// Dừng phát lại âm thanh
const stopAudio = (e?: Event) => {
  // Ngăn chặn sự kiện nổi lên
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  } else if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  if (audioElement.value) {
    audioElement.value.pause();
    audioElement.value = null;
  }
  
  // Dừng API giọng nói trên web
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  
  isPlaying.value = false;
  currentPlayingText.value = '';
};

// Phát hiện ngôn ngữ
const detectLanguage = (text: string): string => {
  // Phát hiện ngôn ngữ đơn giản, có thể được cải thiện theo nhu cầu thực tế
  // Phát hiện xem nó có chứa ký tự Tiếng Trung không
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  if (hasChinese) return 'zh-CN';
  
  // Kiểm tra xem nó có chứa ký tự tiếng Nhật không
  const hasJapanese = /[\u3040-\u30ff]/.test(text);
  if (hasJapanese) return 'ja-JP';
  
  // Phát hiện xem nó có chứa các ký tự tiếng Hàn hay không
  const hasKorean = /[\uAC00-\uD7A3]/.test(text);
  if (hasKorean) return 'ko-KR';
  
  // Kiểm tra xem nó có chứa các ký tự tiếng Nga không
  const hasRussian = /[\u0400-\u04FF]/.test(text);
  if (hasRussian) return 'ru-RU';
  
  // Phát hiện xem nó có chứa các ký tự đặc biệt của Đức hay không
  const hasGerman = /[äöüßÄÖÜ]/.test(text);
  if (hasGerman) return 'de-DE';
  
  // Phát hiện xem nó có chứa các ký tự đặc biệt của Pháp hay không
  const hasFrench = /[àâçéèêëîïôùûüÿæœÀÂÇÉÈÊËÎÏÔÙÛÜŸÆŒ]/.test(text);
  if (hasFrench) return 'fr-FR';
  
  // Phát hiện xem có bao gồm các ký tự đặc biệt tiếng Tây Ban Nha không
  const hasSpanish = /[áéíóúüñÁÉÍÓÚÜÑ]/.test(text);
  if (hasSpanish) return 'es-ES';
  
  // Trả về mặc định Tiếng Anh
  return 'en-US';
};

// Tạo URL tổng hợp giọng nói
const createSpeechUrl = (text: string, language: string): string => {
  // Sử dụng API chuyển văn bản thành giọng nói của Google
  const encodedText = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodedText}`;
};

// Sử dụng API Web Speech thay thế
const tryWebSpeechAPI = (text: string, language: string) => {
  // Nếu đã chơi rồi thì đừng chơi lại
  if (isPlaying.value) return;
  
  // Kiểm tra xem trình duyệt có hỗ trợ API Web Speech không
  if ('speechSynthesis' in window) {
    // Dừng mọi thứ có thể đang phát
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    // Đặt trạng thái
    isPlaying.value = true;
    currentPlayingText.value = text;
    
    utterance.onstart = () => {
      // Đảm bảo trạng thái được cập nhật
      isPlaying.value = true;
      currentPlayingText.value = text;
    };
    
    utterance.onend = () => {
      isPlaying.value = false;
      currentPlayingText.value = '';
    };
    
    utterance.onerror = () => {
      isPlaying.value = false;
      currentPlayingText.value = '';
    };
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.error('Trình duyệt này không hỗ trợ tổng hợp giọng nói');
  }
};

// Phát hiện xem đó có phải là trình duyệt Firefox không
const detectFirefox = () => {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
};

// Nhận trạng thái chủ đề hiện tại
const getCurrentTheme = () => {
  const currentTheme = config.theme || 'auto';
  if (currentTheme === 'auto') {
    // Phát hiện chủ đề hệ thống ở chế độ tự động
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return currentTheme === 'dark';
};

// Cập nhật trạng thái chủ đề
const updateTheme = () => {
  isDarkTheme.value = getCurrentTheme();
};

// Lắng nghe sự kiện
onMounted(() => {
  // Phát hiện loại trình duyệt
  isFirefox.value = detectFirefox();
  
  // Khởi tạo trạng thái chủ đề
  updateTheme();
  
  // Theo dõi thay đổi chủ đề
  watch(() => config.theme, updateTheme, { immediate: true });
  
  // Lắng nghe các thay đổi của chủ đề hệ thống (đối với chế độ tự động)
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (config.theme === 'auto') {
      updateTheme();
    }
  };
  darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
  
  // Lưu tài liệu tham khảo của người nghe chủ đề hệ thống để sử dụng dọn dẹp
  systemThemeHandler = handleSystemThemeChange;
  
  // Xác định chức năng nghe sự kiện
  mouseDownHandler = () => {
    isSelecting.value = true;
  };
  
  mouseUpHandler = () => {
    isSelecting.value = false;
    handleTextSelection();
  };
  
  // Đánh dấu Bật bắt đầu lựa chọn khi nhấn chuột
  document.addEventListener('mousedown', mouseDownHandler);
  
  // Khi chuột giơ lên, vùng chọn được đánh dấu và vùng chọn Tiếng Trung được xử lý.
  document.addEventListener('mouseup', mouseUpHandler);
  
  // Thêm sự kiện thay đổi lựa chọn làm cơ chế dự phòng (sử dụng điều chỉnh để giới hạn tần suất)
  let lastSelectionChangeTime = 0;
  selectionChangeHandler = () => {
    const now = Date.now();
    // Điều chỉnh: chỉ xử lý lựa chọn thay đổi nếu nó chưa được xử lý trong vòng 500 mili giây và không nằm trong quá trình lựa chọn
    if (now - lastSelectionChangeTime > 500 && !isSelecting.value) {
      lastSelectionChangeTime = now;
      // Trì hoãn xử lý để đảm bảo hoạt động lựa chọn được hoàn thành
      setTimeout(() => {
        if (!isSelecting.value) {
          handleTextSelection();
        }
      }, 100);
    }
  };
  
  document.addEventListener('selectionchange', selectionChangeHandler);
  
  // Cập nhật định nghĩa clickHandler và thêm tính năng dọn dẹp thay đổi lựa chọn
  const originalClickHandler = clickHandler;
  clickHandler = (e: Event) => {
    originalClickHandler(e);
  };
  
  // Theo dõi những thay đổi về trạng thái hiển thị bản dịch
  watch(showTooltip, async (newValue: boolean) => {
    if (newValue) {
      // Khi cửa sổ bật lên được hiển thị, hãy tải Kết quả dịch
      await getTranslation();
    } else if (isPlaying.value) {
      // Dừng chơi khi Tắt bật lên
      stopAudio();
    }
  });
  
  // Xác định chức năng xử lý sự kiện nhấp chuột
  clickHandler = (e: Event) => {
    // Kiểm tra xem sự kiện nhấp chuột có xảy ra bên ngoài chỉ báo hoặc cửa sổ bật lên không
    const target = e.target as HTMLElement;
    const isOutsideIndicator = !target.closest('.fr-selection-indicator');
    const isOutsideTooltip = !target.closest('.fr-translation-tooltip');
    
    // Kiểm tra xem sự kiện nhấp chuột có xảy ra trên nút âm thanh không
    const isAudioButton = target.closest('.fr-text-audio-btn') || target.closest('.fr-stop-audio-btn');
    
    // Đừng ẩn cửa sổ bật lên nếu bạn nhấp vào nút âm thanh
    if (isAudioButton) {
      return;
    }
    
    if (isOutsideIndicator && isOutsideTooltip && showIndicator.value) {
      hideIndicator();
      closeTooltip();
    }
  };
  
  // Đã thêm các chỉ báo ẩn và cửa sổ bật lên khi nhấp vào các khu vực khác của trang
  document.addEventListener('click', clickHandler);
});

// Lưu trữ một tham chiếu đến chức năng xử lý sự kiện để loại bỏ chính xác
let mouseDownHandler: () => void;
let mouseUpHandler: () => void;
let clickHandler: (e: Event) => void;
let selectionChangeHandler: () => void;
let systemThemeHandler: () => void;

// Nghe sự kiện dọn dẹp (sửa logic dọn dẹp)
onBeforeUnmount(() => {
  // Loại bỏ chính xác trình xử lý sự kiện
  if (mouseDownHandler) {
    document.removeEventListener('mousedown', mouseDownHandler);
  }
  if (mouseUpHandler) {
    document.removeEventListener('mouseup', mouseUpHandler);
  }
  if (clickHandler) {
    document.removeEventListener('click', clickHandler);
  }
  if (selectionChangeHandler) {
    document.removeEventListener('selectionchange', selectionChangeHandler);
  }
  
  // Xóa trình nghe chủ đề hệ thống
  if (systemThemeHandler) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.removeEventListener('change', systemThemeHandler);
  }
  
  // Xóa tất cả bộ tính giờ
  clearHideTooltipTimer();
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
    debounceTimer.value = null;
  }
  
  // Dừng tất cả phát lại âm thanh
  if (audioElement.value) {
    audioElement.value.pause();
    audioElement.value = null;
  }
  
  // Dừng API giọng nói trên web
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
});
</script>

<style scoped>
.fr-selection-indicator {
  position: fixed;
  width: 12px;
  height: 12px;
  background-color: #ff4d4f;
  border-radius: 50%;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: translate(10px, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
  }
  70% {
    transform: translate(10px, -50%) scale(1.1);
    box-shadow: 0 0 0 10px rgba(255, 77, 79, 0);
  }
  100% {
    transform: translate(10px, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}

.fr-translation-tooltip {
  position: fixed;
  background-color: white !important;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  width: 350px; /* tăng chiều rộng */
  transition: opacity 0.2s ease;
}

.fr-tooltip-header {
  padding: 8px 12px;
  background-color: #f5f5f5 !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e8e8e8;
  position: sticky; /* Tạo vị trí cố định cho tiêu đề */
  top: 0;
  z-index: 1;
}

.fr-tooltip-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fr-action-btn, .fr-copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}

.fr-action-btn:hover, .fr-copy-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #333;
}

.fr-close-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
  padding: 0;
  margin: 0;
  line-height: 1;
}

.fr-close-btn:hover {
  color: #666;
}

.fr-tooltip-content {
  padding: 12px;
  background-color: white !important;
  overflow-y: auto; /* Thêm cuộn dọc */
  max-height: 350px; /* Tăng chiều cao tối đa */
  scrollbar-width: thin; /* Thanh cuộn mỏng */
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
}

.fr-original-text pre,
.fr-translation-result pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: inherit;
  color: inherit !important;
}

.fr-original-text {
  margin-bottom: 8px;
  color: #666 !important;
  font-size: 14px;
  word-break: break-word;
  padding-bottom: 8px;
  border-bottom: 1px dashed #eee;
  position: relative;
}

.fr-translation-result {
  color: #333 !important;
  font-size: 15px;
  font-weight: 500;
  word-break: break-word;
  margin-top: 8px;
  line-height: 1.5;
  position: relative;
}

.fr-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  margin: 10px auto;
  animation: spin 1s linear infinite;
}

.fr-translation-tooltip.fr-dark-theme .fr-loading-spinner {
  border: 2px solid #444;
  border-top: 2px solid #69c0ff;
}

/* Kiểu tải tĩnh */
.fr-loading-spinner.fr-static {
  animation: none;
  background: radial-gradient(circle, rgb(230, 151, 171) 30%, rgba(230, 151, 171, 0.6) 70%);
  border: 2px solid rgb(200, 121, 141);
  box-shadow: 0 0 10px rgba(230, 151, 171, 0.5);
  position: relative;
}

/* Thêm hiệu ứng bóng */
.fr-loading-spinner.fr-static::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%);
  border-radius: 50%;
  pointer-events: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fr-error-message {
  color: #ff4d4f;
  text-align: center;
  padding: 10px;
}

.fr-translation-tooltip.fr-dark-theme .fr-error-message {
  color: #ff7875;
}

/* Nút phát trong văn bản */
.fr-text-audio-btn {
  position: absolute;
  right: 4px;
  top: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
}

.fr-original-text:hover .fr-text-audio-btn,
.fr-translation-result:hover .fr-text-audio-btn {
  opacity: 1;
}

.fr-text-audio-btn:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
}

/* Kiểu thanh cuộn tùy chỉnh */
.fr-tooltip-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.fr-tooltip-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.fr-tooltip-content::-webkit-scrollbar-track {
  background-color: transparent;
}

/* Thích ứng chế độ tối */
.fr-translation-tooltip.fr-dark-theme {
  background-color: #1f1f1f !important;
  border: 1px solid #333;
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-tooltip-header {
  background-color: #2a2a2a !important;
  border-bottom: 1px solid #444;
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-tooltip-header span {
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-original-text {
  color: #ffffff !important;
}

.fr-translation-tooltip.fr-dark-theme .fr-original-text pre {
  color: #ffffff !important;
}

.fr-translation-tooltip.fr-dark-theme .fr-translation-result {
  color: #ffffff !important;
}

.fr-translation-tooltip.fr-dark-theme .fr-translation-result pre {
  color: #ffffff !important;
}

.fr-translation-tooltip.fr-dark-theme .fr-close-btn {
  color: #bbb;
}

.fr-translation-tooltip.fr-dark-theme .fr-close-btn:hover {
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-tooltip-content {
  background-color: #1f1f1f !important;
}

.fr-translation-tooltip.fr-dark-theme .fr-tooltip-content::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
}

.fr-translation-container {
  position: relative;
}

.fr-no-select {
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  cursor: default;
}

/* Loại bỏ các kiểu lựa chọn không mong muốn */
.user-select-text::selection {
  background-color: #409eff;
  color: white;
}

.fr-translation-result, .fr-original-text {
  padding: 8px;
  border-radius: 4px;
  background: transparent;
  transition: background-color 0.15s ease;
}

.fr-translation-result:hover, .fr-original-text:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.fr-translation-tooltip.fr-dark-theme .fr-translation-result:hover, 
.fr-translation-tooltip.fr-dark-theme .fr-original-text:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.fr-copy-success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10010;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: toast-fade 1.5s ease forwards;
}

.fr-copy-success-icon {
  color: #52c41a;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Lời nhắc trạng thái phát lại nội bộ */
.fr-playing-status {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: rgba(24, 144, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-size: 13px;
  animation: pulse-light 1.5s infinite;
}

/* Sửa lỗi thiếu ảnh động trong trình duyệt Firefox */
@-moz-document url-prefix() {
  .fr-playing-status {
    animation-name: moz-pulse-light;
  }
  
  @keyframes moz-pulse-light {
    0% {
      background-color: rgba(24, 144, 255, 0.05);
    }
    50% {
      background-color: rgba(24, 144, 255, 0.15);
    }
    100% {
      background-color: rgba(24, 144, 255, 0.05);
    }
  }
}

.fr-playing-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes pulse-light {
  0% {
    background-color: rgba(24, 144, 255, 0.05);
  }
  50% {
    background-color: rgba(24, 144, 255, 0.15);
  }
  100% {
    background-color: rgba(24, 144, 255, 0.05);
  }
}

.fr-stop-audio-btn {
  background: none;
  border: none;
  color: #1890ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  margin-left: auto;
  transition: background-color 0.2s;
}

.fr-stop-audio-btn:hover {
  background-color: rgba(24, 144, 255, 0.2);
}

/* Thích ứng chế độ tối */
.fr-translation-tooltip.fr-dark-theme .fr-playing-status {
  background-color: rgba(64, 169, 255, 0.15);
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-stop-audio-btn {
  color: #69c0ff;
}

.fr-translation-tooltip.fr-dark-theme .fr-stop-audio-btn:hover {
  background-color: rgba(64, 169, 255, 0.2);
}

/* Xóa kiểu lời nhắc phát lại bên ngoài và thay đổi nó thành màn hình bên trong */
.fr-audio-playing-toast {
  display: none;
}

@keyframes toast-fade {
  0% { opacity: 0; transform: translate(-50%, -40%); }
  20% { opacity: 1; transform: translate(-50%, -50%); }
  80% { opacity: 1; transform: translate(-50%, -50%); }
  100% { opacity: 0; transform: translate(-50%, -60%); }
}

.fr-copy-success-toast.fr-dark-theme {
  background-color: rgba(0, 0, 0, 0.85);
}

.fr-copy-success-toast.fr-dark-theme .fr-copy-success-icon {
  color: #73d13d;
}

.fr-translation-tooltip.fr-dark-theme .fr-action-btn,
.fr-translation-tooltip.fr-dark-theme .fr-copy-btn,
.fr-translation-tooltip.fr-dark-theme .fr-text-audio-btn {
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-action-btn:hover,
.fr-translation-tooltip.fr-dark-theme .fr-copy-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.fr-translation-tooltip.fr-dark-theme .fr-text-audio-btn:hover {
  color: #69c0ff;
  background-color: rgba(24, 144, 255, 0.15);
}
</style> 