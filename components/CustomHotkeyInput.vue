<template>
  <div class="custom-hotkey-input">
    <!-- Phím tắt hộp thoại nhập tùy chỉnh -->
    <el-dialog
      v-model="dialogVisible"
      title="Phím tắt tùy chỉnh"
      width="300px"
      :close-on-click-modal="false"
      :modal="false"
      :append-to-body="true"
      :destroy-on-close="true"
      @close="handleCancel"
    >
      <div class="hotkey-input-container">
        <div class="input-section">
          <el-text class="input-label">
            Hãy nhấn tổ hợp phím tắt bạn muốn đặt:
          </el-text>
          <div 
            class="hotkey-input-field"
            :class="{ 
              'recording': isRecording, 
              'error': errorMessage,
              'success': parsedHotkey?.isValid && !errorMessage 
            }"
            @click="startRecording"
            @keydown="handleKeyDown"
            @keyup="handleKeyUp"
            tabindex="0"
            ref="inputField"
          >
            <div v-if="!isRecording && !currentHotkey" class="placeholder">
              Nhấn vào đây để bắt đầu ghi phím tắt...
            </div>
            <div v-else-if="isRecording" class="recording-text">
              <el-icon class="recording-icon"><Loading /></el-icon>
              Đang ghi, vui lòng nhấn phím tắt...
            </div>
            <div v-else-if="currentHotkey" class="hotkey-display">
              {{ parsedHotkey?.displayName || currentHotkey }}
            </div>
          </div>
          
          <!-- Thông báo lỗi -->
          <div v-if="errorMessage" class="error-message">
            <el-icon><WarningFilled /></el-icon>
            {{ errorMessage }}
          </div>
          
          <!-- cảnh báo xung đột -->
          <div v-if="conflictWarning" class="warning-message">
            <el-icon><Warning /></el-icon>
            {{ conflictWarning }}
          </div>
          
          <!-- Lời khuyên để thành công -->
          <div v-if="parsedHotkey?.isValid && !errorMessage && !conflictWarning" class="success-message">
            <el-icon><CircleCheckFilled /></el-icon>
            Phím tắt hợp lệ và có thể sử dụng
          </div>
        </div>

        <!-- Các phím tắt cài sẵn được đề xuất -->
        <div class="preset-section">
          <el-text class="section-title">Hoặc chọn phím tắt đề xuất:</el-text>
          <div class="preset-buttons">
            <el-button
              v-for="preset in recommendedHotkeys"
              :key="preset.value"
              size="small"
              :type="currentHotkey === preset.value ? 'primary' : 'default'"
              @click="selectPreset(preset.value)"
              class="preset-button"
            >
              {{ preset.label }}
            </el-button>
          </div>
        </div>

        <!-- Giải thích đơn giản -->
        <div class="help-section">
          <el-text size="small" type="info">
            Gợi ý: nên dùng tổ hợp có phím bổ trợ (ví dụ Ctrl+chữ cái) để tránh xung đột phím hệ thống. Lưu ý: không thể dùng CMD làm phím tắt.
          </el-text>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancel">Hủy</el-button>
          <el-button @click="clearHotkey" v-if="currentHotkey">Xóa</el-button>
          <el-button 
            type="primary" 
            @click="handleConfirm"
            :disabled="!canConfirm"
          >
            Xác nhận
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="CustomHotkeyInput">
import { ref, computed, nextTick, watch } from 'vue';
import { ElDialog, ElButton, ElText, ElIcon, ElCollapse, ElCollapseItem } from 'element-plus';
import { Loading, WarningFilled, Warning, CircleCheckFilled } from '@element-plus/icons-vue';
import { parseHotkey, matchesHotkey, validateHotkeyConflicts, type ParsedHotkey } from '@/entrypoints/utils/hotkey';

// Props
interface Props {
  modelValue: boolean;
  currentValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  currentValue: ''
});

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', hotkey: string): void;
  (e: 'cancel'): void;
}

const emit = defineEmits<Emits>();

// Dữ liệu đáp ứng
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const currentHotkey = ref(props.currentValue || '');
const isRecording = ref(false);
const pressedKeys = ref(new Set<string>());
const errorMessage = ref('');
const conflictWarning = ref('');
const inputField = ref<HTMLElement>();

// Phân tích phím tắt hiện tại
const parsedHotkey = computed<ParsedHotkey | null>(() => {
  if (!currentHotkey.value || currentHotkey.value === 'none') return null;
  return parseHotkey(currentHotkey.value);
});

// Kiểm tra xem bạn có thể Xác nhận nhận không
const canConfirm = computed(() => {
  return currentHotkey.value === 'none' || 
         (parsedHotkey.value?.isValid && !errorMessage.value);
});

// Phím tắt được đề xuất
const recommendedHotkeys = [
  { value: 'Alt+T', label: 'Alt+T' },
  { value: 'Alt+Q', label: 'Alt+Q' },
  { value: 'Alt+D', label: 'Alt+D' },
  { value: 'F9', label: 'F9' },
  { value: 'F10', label: 'F10' },
];

// Theo dõi thay đổi giá trị hiện tại
watch(() => props.currentValue, (newValue) => {
  currentHotkey.value = newValue || '';
});

// Theo dõi các thay đổi của phím tắt và xác minh
watch(currentHotkey, (newValue) => {
  validateCurrentHotkey(newValue);
});

// Xác minh các phím tắt hiện tại
function validateCurrentHotkey(hotkeyString: string) {
  errorMessage.value = '';
  conflictWarning.value = '';
  
  if (!hotkeyString || hotkeyString === 'none') return;
  
  const parsed = parseHotkey(hotkeyString);
  
  if (!parsed.isValid) {
    errorMessage.value = parsed.errorMessage || 'Phím tắt không hợp lệ';
    return;
  }
  
  // Kiểm tra xung đột
  const conflictCheck = validateHotkeyConflicts(parsed);
  if (conflictCheck.hasConflict) {
    conflictWarning.value = conflictCheck.conflictDescription || 'Có thể có xung đột';
  }
}

// BậtPhím tắt ghi âmBắt đầu
async function startRecording() {
  if (isRecording.value) return;
  
  isRecording.value = true;
  pressedKeys.value.clear();
  errorMessage.value = '';
  conflictWarning.value = '';
  
  // Hộp nhập tiêu điểm
  await nextTick();
  inputField.value?.focus();
}

// Xử lý các thao tác nhấn phím
function handleKeyDown(event: KeyboardEvent) {
  if (!isRecording.value) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Ghi lại các phím đã nhấn
  if (event.ctrlKey) pressedKeys.value.add('ctrl');
  if (event.altKey) pressedKeys.value.add('alt');
  if (event.shiftKey) pressedKeys.value.add('shift');
  if (event.metaKey) pressedKeys.value.add('meta');
  
  // Xử lý các phím thông thường
  const key = event.key.toLowerCase();
  const code = event.code?.toLowerCase();
  
  // Bỏ qua các phím bổ trợ riêng lẻ
  if (['control', 'alt', 'shift', 'meta'].includes(key)) {
    return;
  }
  
  // Ghi lại các lần gõ phím thông thường
  if (key.length === 1) {
    pressedKeys.value.add(key);
  } else if (code?.startsWith('key')) {
    pressedKeys.value.add(code.slice(3));
  } else if (/^f\d+$/.test(key)) {
    pressedKeys.value.add(key);
  } else {
    // Xử lý phím đặc biệt
    const specialKeys = {
      'escape': 'escape',
      'enter': 'enter',
      'space': 'space',
      'tab': 'tab',
      'backspace': 'backspace',
      'delete': 'delete',
      'arrowup': 'arrowup',
      'arrowdown': 'arrowdown',
      'arrowleft': 'arrowleft',
      'arrowright': 'arrowright'
    };
    
    if (specialKeys[key as keyof typeof specialKeys]) {
      pressedKeys.value.add(specialKeys[key as keyof typeof specialKeys]);
    }
  }
}

// Xử lý việc nhả phím
function handleKeyUp(event: KeyboardEvent) {
  if (!isRecording.value) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Trì hoãn một chút trước khi tạo phím tắt để đảm bảo tất cả các phím được ghi lại
  setTimeout(() => {
    if (pressedKeys.value.size > 0) {
      generateHotkeyFromKeys();
    }
  }, 100);
}

// Tạo chuỗi phím tắt từ tổ hợp phím
function generateHotkeyFromKeys() {
  const modifiers: string[] = [];
  let regularKey = '';
  
  // Trích xuất các phím bổ trợ
  if (pressedKeys.value.has('ctrl')) modifiers.push('Ctrl');
  if (pressedKeys.value.has('alt')) modifiers.push('Alt');
  if (pressedKeys.value.has('shift')) modifiers.push('Shift');
  if (pressedKeys.value.has('meta')) modifiers.push('Meta');
  
  // Trích xuất các khóa thông thường (tìm khóa không sửa đổi cuối cùng)
  for (const key of pressedKeys.value) {
    if (!['ctrl', 'alt', 'shift', 'meta'].includes(key)) {
      regularKey = key.toUpperCase();
    }
  }
  
  if (regularKey) {
    currentHotkey.value = [...modifiers, regularKey].join('+');
  }
  
  isRecording.value = false;
  pressedKeys.value.clear();
}

// Chọn một phím tắt cài sẵn
function selectPreset(value: string) {
  currentHotkey.value = value;
  isRecording.value = false;
  pressedKeys.value.clear();
}

// Xóa phím tắt
function clearHotkey() {
  currentHotkey.value = '';
  isRecording.value = false;
  pressedKeys.value.clear();
  errorMessage.value = '';
  conflictWarning.value = '';
}

// Xác nhận
function handleConfirm() {
  if (!canConfirm.value) return;
  
  emit('confirm', currentHotkey.value);
  dialogVisible.value = false;
}

// Hủy
function handleCancel() {
  currentHotkey.value = props.currentValue || '';
  isRecording.value = false;
  pressedKeys.value.clear();
  errorMessage.value = '';
  conflictWarning.value = '';
  emit('cancel');
  dialogVisible.value = false;
}
</script>

<style scoped>
.custom-hotkey-input {
  width: 100%;
}

.hotkey-input-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-label {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.hotkey-input-field {
  min-height: 50px;
  border: 2px solid var(--el-border-color);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color);
  position: relative;
}

.hotkey-input-field:hover {
  border-color: var(--el-color-primary);
}

.hotkey-input-field:focus {
  outline: none;
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.hotkey-input-field.recording {
  border-color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  animation: pulse 2s infinite;
}

.hotkey-input-field.error {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.hotkey-input-field.success {
  border-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 var(--el-color-warning-light-5); }
  70% { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.placeholder {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.recording-text {
  color: var(--el-color-warning);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.recording-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.hotkey-display {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
  padding: 8px 16px;
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  border: 1px solid var(--el-color-primary-light-7);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-danger);
  font-size: 14px;
  padding: 8px 12px;
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
  border: 1px solid var(--el-color-danger-light-7);
}

.warning-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-warning);
  font-size: 14px;
  padding: 8px 12px;
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
  border: 1px solid var(--el-color-warning-light-7);
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-success);
  font-size: 14px;
  padding: 8px 12px;
  background: var(--el-color-success-light-9);
  border-radius: 6px;
  border: 1px solid var(--el-color-success-light-7);
}

.preset-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-button {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.help-section {
  margin-top: 4px;
}

.help-content {
  padding: 0 4px;
}

.help-content h4 {
  margin: 16px 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.help-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 4px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.help-content strong {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
