/**
 * Chức năng công cụ xử lý phím tắt
 */

// Các phím bổ trợ được hỗ trợ
export const MODIFIER_KEYS: Record<string, string[]> = {
  ctrl: ['control', 'ctrl'],
  alt: ['alt', 'option'],
  shift: ['shift'],
  meta: ['meta', 'cmd', 'command']
};

// Các phím chung được hỗ trợ
export const REGULAR_KEYS = {
  // chữ cái
  a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j',
  k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', q: 'q', r: 'r', s: 's', t: 't',
  u: 'u', v: 'v', w: 'w', x: 'x', y: 'y', z: 'z',
  // con số
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  // Phím chức năng
  f1: 'f1', f2: 'f2', f3: 'f3', f4: 'f4', f5: 'f5', f6: 'f6',
  f7: 'f7', f8: 'f8', f9: 'f9', f10: 'f10', f11: 'f11', f12: 'f12',
  // Phím đặc biệt
  space: 'space',
  enter: 'enter',
  escape: 'escape',
  tab: 'tab',
  backspace: 'backspace',
  delete: 'delete',
  insert: 'insert',
  home: 'home',
  end: 'end',
  pageup: 'pageup',
  pagedown: 'pagedown',
  arrowup: 'arrowup',
  arrowdown: 'arrowdown',
  arrowleft: 'arrowleft',
  arrowright: 'arrowright',
  // Phím ký hiệu
  '`': '`', '~': '~',
  '-': '-', '_': '_',
  '=': '=', '+': '+',
  '[': '[', '{': '{',
  ']': ']', '}': '}',
  '\\': '\\', '|': '|',
  ';': ';', ':': ':',
  "'": "'", '"': '"',
  ',': ',', '<': '<',
  '.': '.', '>': '>',
  '/': '/', '?': '?',
} as const;

// Giao diện kết quả phân tích phím tắt
export interface ParsedHotkey {
  modifiers: string[];
  key: string;
  isValid: boolean;
  displayName: string;
  errorMessage?: string;
}

/**
 * Phân tích chuỗi phím tắt
 * @param hotkeyString Chuỗi phím tắt, chẳng hạn như "Ctrl+Alt+T"
 * @returns kết quả phân tích cú pháp
 */
export function parseHotkey(hotkeyString: string): ParsedHotkey {
  if (!hotkeyString || hotkeyString.trim() === '') {
    return {
      modifiers: [],
      key: '',
      isValid: false,
      displayName: '',
      errorMessage: 'Phím tắt không được để trống'
    };
  }

  const parts = hotkeyString.toLowerCase().split('+').map(part => part.trim());
  
  if (parts.length === 0) {
    return {
      modifiers: [],
      key: '',
      isValid: false,
      displayName: '',
      errorMessage: 'Định dạng phím tắt không hợp lệ'
    };
  }

  const modifiers: string[] = [];
  let key = '';
  
  // Kiểm tra từng phần
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (i === parts.length - 1) {
      // Phần cuối cùng phải là một nút bình thường
      if (REGULAR_KEYS[part as keyof typeof REGULAR_KEYS]) {
        key = part;
      } else {
        return {
          modifiers,
          key: part,
          isValid: false,
          displayName: '',
          errorMessage: `Phím không được hỗ trợ: ${part}`
        };
      }
    } else {
      // Phần đầu tiên phải là phím bổ trợ
      let isValidModifier = false;
      for (const [modifierKey, aliases] of Object.entries(MODIFIER_KEYS)) {
        if (aliases.includes(part)) {
          if (!modifiers.includes(modifierKey)) {
            modifiers.push(modifierKey);
          }
          isValidModifier = true;
          break;
        }
      }
      
      if (!isValidModifier) {
        return {
          modifiers,
          key,
          isValid: false,
          displayName: '',
          errorMessage: `Phím bổ trợ không được hỗ trợ: ${part}`
        };
      }
    }
  }

  // Xác minh có ít nhất một phím bổ trợ (tránh chiếm một phím chữ cái)
  if (modifiers.length === 0 && key.length === 1 && /[a-z]/.test(key)) {
    return {
      modifiers,
      key,
      isValid: false,
      displayName: '',
      errorMessage: 'Phím chữ đơn phải dùng kèm phím bổ trợ'
    };
  }

  // Tắt chứa các tổ hợp phím tắt cho phím CMD/Meta
  if (modifiers.includes('meta')) {
    return {
      modifiers,
      key,
      isValid: false,
      displayName: '',
      errorMessage: 'Phím CMD đã bị vô hiệu hóa, vui lòng dùng tổ hợp phím bổ trợ khác'
    };
  }

  // Tạo tên hiển thị
  const displayName = generateDisplayName(modifiers, key);
  
  return {
    modifiers,
    key,
    isValid: true,
    displayName,
  };
}

/**
 * Tạo tên hiển thị phím tắt
 * Mảng khóa sửa đổi @param
 * Khóa @param khóa thông thường
 * @returns tên hiển thị
 */
function generateDisplayName(modifiers: string[], key: string): string {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modifierDisplayNames: Record<string, string> = isMac ? 
    {
      ctrl: 'Control',
      alt: 'Option', 
      shift: 'Shift',
      meta: 'Cmd'
    } : 
    {
      ctrl: 'Ctrl',
      alt: 'Alt',
      shift: 'Shift', 
      meta: 'Win'
    };

  const keyDisplayName = key.charAt(0).toUpperCase() + key.slice(1);
  const modifierNames = modifiers.map(mod => modifierDisplayNames[mod] || mod);
  
  return [...modifierNames, keyDisplayName].join('+');
}

/**
 * Kiểm tra xem sự kiện có khớp với phím tắt được chỉ định hay không
 * Sự kiện bàn phím sự kiện @param
 * @param paredHotkey đã phân tích cú pháp phím nóng
 * @returns có khớp không
 */
export function matchesHotkey(event: KeyboardEvent, parsedHotkey: ParsedHotkey): boolean {
  if (!parsedHotkey.isValid) return false;

  // Kiểm tra các phím bổ trợ
  const requiredModifiers = new Set(parsedHotkey.modifiers);
  const actualModifiers = new Set();
  
  if (event.ctrlKey) actualModifiers.add('ctrl');
  if (event.altKey) actualModifiers.add('alt');
  if (event.shiftKey) actualModifiers.add('shift');
  if (event.metaKey) actualModifiers.add('meta');

  // Các phím bổ trợ phải khớp chính xác
  if (requiredModifiers.size !== actualModifiers.size) return false;
  for (const modifier of requiredModifiers) {
    if (!actualModifiers.has(modifier)) return false;
  }

  // Kiểm tra các phím chung
  const eventKey = event.key.toLowerCase();
  const eventCode = event.code?.toLowerCase();
  
  // Xử lý ánh xạ khóa đặc biệt
  const keyMappings: Record<string, string[]> = {
    'space': [' ', 'space'],
    'enter': ['enter', 'return'],
    'escape': ['escape', 'esc'],
    'backspace': ['backspace'],
    'delete': ['delete', 'del'],
    'tab': ['tab'],
    'arrowup': ['arrowup', 'up'],
    'arrowdown': ['arrowdown', 'down'],
    'arrowleft': ['arrowleft', 'left'],
    'arrowright': ['arrowright', 'right'],
  };

  if (keyMappings[parsedHotkey.key]) {
    return keyMappings[parsedHotkey.key].includes(eventKey) || 
           keyMappings[parsedHotkey.key].some(k => eventCode?.includes(k));
  }

  // Phím chữ và số thông thường
  if (/^[a-z0-9]$/.test(parsedHotkey.key)) {
    return eventKey === parsedHotkey.key || eventCode === `key${parsedHotkey.key}`;
  }

  // Phím chức năng
  if (/^f\d+$/.test(parsedHotkey.key)) {
    return eventKey === parsedHotkey.key || eventCode === parsedHotkey.key;
  }

  // So sánh trực tiếp khóa biểu tượng
  return eventKey === parsedHotkey.key;
}

/**
 * Xác minh xem các phím tắt có xung đột với các phím tắt hệ thống hay không
 * @param paredHotkey đã phân tích cú pháp phím nóng
 * @returns thông tin xung đột
 */
export function validateHotkeyConflicts(parsedHotkey: ParsedHotkey): { 
  hasConflict: boolean; 
  conflictDescription?: string 
} {
  if (!parsedHotkey.isValid) {
    return { hasConflict: false };
  }

  const { modifiers, key } = parsedHotkey;
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Phát hiện xung đột phím tắt hệ thống phổ biến
  const commonConflicts = [
    // Phím tắt hệ thống Windows/Linux
    { modifiers: ['ctrl'], key: 'c', desc: 'Sao chép' },
    { modifiers: ['ctrl'], key: 'v', desc: 'Dán' },
    { modifiers: ['ctrl'], key: 'x', desc: 'Cắt' },
    { modifiers: ['ctrl'], key: 'z', desc: 'Hoàn tác' },
    { modifiers: ['ctrl'], key: 'y', desc: 'Làm lại' },
    { modifiers: ['ctrl'], key: 'a', desc: 'Chọn tất cả' },
    { modifiers: ['ctrl'], key: 's', desc: 'Lưu' },
    { modifiers: ['ctrl'], key: 'o', desc: 'Mở' },
    { modifiers: ['ctrl'], key: 'n', desc: 'Tạo mới' },
    { modifiers: ['ctrl'], key: 'w', desc: 'Đóng tab' },
    { modifiers: ['ctrl'], key: 't', desc: 'Mở tab mới' },
    { modifiers: ['ctrl'], key: 'r', desc: 'Làm mới trang' },
    { modifiers: ['ctrl'], key: 'f', desc: 'Tìm kiếm' },
    { modifiers: ['ctrl'], key: 'h', desc: 'Lịch sử' },
    { modifiers: ['ctrl'], key: 'd', desc: 'Thêm dấu trang' },
    { modifiers: ['alt'], key: 'f4', desc: 'Đóng chương trình' },
    { modifiers: ['ctrl', 'shift'], key: 't', desc: 'Mở lại tab vừa đóng' },
    { modifiers: ['ctrl', 'shift'], key: 'n', desc: 'Chế độ ẩn danh' },
    { modifiers: ['ctrl', 'shift'], key: 'delete', desc: 'Xóa dữ liệu duyệt web' },
    
    // phím tắt hệ thống macOS
    { modifiers: ['meta'], key: 'c', desc: 'Sao chép' },
    { modifiers: ['meta'], key: 'v', desc: 'Dán' },
    { modifiers: ['meta'], key: 'x', desc: 'Cắt' },
    { modifiers: ['meta'], key: 'z', desc: 'Hoàn tác' },
    { modifiers: ['meta'], key: 'a', desc: 'Chọn tất cả' },
    { modifiers: ['meta'], key: 's', desc: 'Lưu' },
    { modifiers: ['meta'], key: 'o', desc: 'Mở' },
    { modifiers: ['meta'], key: 'n', desc: 'Tạo mới' },
    { modifiers: ['meta'], key: 'w', desc: 'Đóng tab' },
    { modifiers: ['meta'], key: 't', desc: 'Mở tab mới' },
    { modifiers: ['meta'], key: 'r', desc: 'Làm mới trang' },
    { modifiers: ['meta'], key: 'f', desc: 'Tìm kiếm' },
    { modifiers: ['meta'], key: 'q', desc: 'Thoát chương trình' },
    { modifiers: ['meta'], key: 'space', desc: 'Tìm kiếm Spotlight' },
  ];

  for (const conflict of commonConflicts) {
    if (conflict.modifiers.length === modifiers.length && 
        conflict.key === key &&
        conflict.modifiers.every(mod => modifiers.includes(mod))) {
      return {
        hasConflict: true,
        conflictDescription: `Xung đột với phím tắt hệ thống: ${conflict.desc}`
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Tùy chọn phím tắt mặc định
 */
export const PRESET_HOTKEYS = [
  { value: "Alt+T", label: "Alt+T / Option+T" },
  { value: "Alt+A", label: "Alt+A / Option+A" },
  { value: "Alt+S", label: "Alt+S / Option+S" },
  { value: "Alt+D", label: "Alt+D / Option+D" },
  { value: "Alt+Q", label: "Alt+Q / Option+Q" },
  { value: "Ctrl+Alt+T", label: "Ctrl+Alt+T / Control+Option+T" },
  { value: "Ctrl+Alt+A", label: "Ctrl+Alt+A / Control+Option+A" },
  { value: "Ctrl+Shift+T", label: "Ctrl+Shift+T / Control+Shift+T" },
  { value: "Ctrl+Shift+A", label: "Ctrl+Shift+A / Control+Shift+A" },
  { value: "F9", label: "F9" },
  { value: "F10", label: "F10" },
  { value: "F11", label: "F11" },
  { value: "F12", label: "F12" },
  { value: "none", label: "Tắt phím tắt" },
  { value: "custom", label: "Phím tắt tùy chỉnh..." },
];
