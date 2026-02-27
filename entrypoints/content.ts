import { handleTranslation, autoTranslateEnglishPage, restoreOriginalContent } from "./main/trans";
import { cache } from "./utils/cache";
import { constants } from "@/entrypoints/utils/constant";
import { getCenterPoint } from "@/entrypoints/utils/common";
import './style.css';
import { config, configReady } from "@/entrypoints/utils/config";
import { mountFloatingBall, unmountFloatingBall, toggleFloatingBallPosition } from "@/entrypoints/utils/floatingBall";
import { mountSelectionTranslator, unmountSelectionTranslator } from "@/entrypoints/utils/selectionTranslator";
import { cancelAllTranslations, translateText } from "@/entrypoints/utils/translateApi";
import { createApp } from 'vue';
import TranslationStatus from '@/components/TranslationStatus.vue';
import { mountNewApiComponent } from "@/entrypoints/utils/newApi";

export default defineContentScript({
    matches: ['<all_urls>'],  // khớp tất cả các trang
    runAt: 'document_end',  // Chạy sau khi trang tải xong
    async main() {
        await configReady // Đợi quá trình tải cấu hình hoàn tất
        if (config.on === false) return; // Nếu Tắt được định cấu hình, không làm gì cả
        // Thêm trình xử lý sự kiện dịch thủ công
        setupManualTranslationTriggers();
        // Thêm trình xử lý sự kiện phím tắt bóng nổi
        setupFloatingBallHotkey();
        // Khi đánh bóng Tắt, vẫn được phép Tắt độc lập bằng phím tắt cho Dịch toàn trang
        let isFullPageTranslating = false;
        document.addEventListener('fluentread-toggle-translation', () => {
            // Các phím tắt chỉ được nội dung script tiếp quản khi bóng nổi bị Tắt (không được gắn)
            if (config.disableFloatingBall === true) {
                isFullPageTranslating = !isFullPageTranslating;
                if (isFullPageTranslating) {
                    autoTranslateEnglishPage();
                } else {
                    restoreOriginalContent();
                }
            }
        });
        // Thêm trình xử lý sự kiện dịch tự động
        if (config.autoTranslate) autoTranslationEvent();

        // Gắn bóng nổi (nếu được cấu hình không có Tắt)
        if (config.disableFloatingBall !== true) {
            // Sử dụng vị trí từ cấu hình
            mountFloatingBall();
        }
        
        // Gắn thành phần Dịch khi bôi trơn (nếu được định cấu hình không có Tắt)
        if (config.disableSelectionTranslator !== true) {
            mountSelectionTranslator();
        }
        
        // Gắn kết thành phần trạng thái dịch (Tắt cấu hình)
        if (config.translationStatus === true) {
            mountTranslationStatusComponent();
        }

        mountNewApiComponent();

        cache.cleaner();    // Kiểm tra xem có xóa bộ nhớ đệm không

        // background.ts
        browser.runtime.onMessage.addListener((message: { message: string; }, sender: any, sendResponse: () => void) => {
            if (message.message === 'clearCache') cache.clean()
            sendResponse();
            return true;
        });
        
        // Xử lý tin nhắn kiểm soát bóng nổi
        browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: () => void) => {
            if (message.type === 'toggleFloatingBall') {
                if (message.isEnabled) {
                    mountFloatingBall();
                } else {
                    unmountFloatingBall();
                }
                sendResponse();
                return true;
            }
            return false;
        });
        
        // Xử lý dịch khi bôi các thông báo điều khiển
        browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: () => void) => {
            if (message.type === 'updateSelectionTranslatorMode') {
                // Cập nhật cấu hình
                config.selectionTranslatorMode = message.mode;
                
                if (message.mode === 'disabled') {
                    unmountSelectionTranslator();
                } else {
                    // Nếu nó chưa được gắn trước đó, hãy gắn nó ngay bây giờ
                    if (!document.getElementById('fluent-read-selection-translator-container')) {
                        mountSelectionTranslator();
                    }
                }
                sendResponse();
                return true;
            }
            return false;
        });
        
        // Xử lý Dịch toàn trang và Hoàn tác kích hoạt bằng menu chuột phải
        browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response?: any) => void) => {
            if (message.type === 'contextMenuTranslate') {
                // Kiểm tra xem plugin có được kích hoạt không
                if (config.on === false) {
                    sendResponse({ status: 'disabled' });
                    return true;
                }
                
                if (message.action === 'fullPage') {
                    // Trigger toàn trang
                    autoTranslateEnglishPage();
                    sendResponse({ status: 'success', action: 'translated' });
                    return true;
                } else if (message.action === 'restore') {
                    // Hoàn tác bản dịch, khôi phục Nguyên văn
                    restoreOriginalContent();
                    sendResponse({ status: 'success', action: 'restored' });
                    return true;
                }
            }
            return false;
        });
        
        // Dọn dẹp nội dung khi trang được tải xuống
        window.addEventListener('beforeunload', () => {
            // Tất cả các tác vụ dịch đang chờ xử lý tại Hủy
            cancelAllTranslations();
            // Loại bỏ bóng nổi
            unmountFloatingBall();
            // Loại bỏ thành phần Dịch khi áp dụng
            unmountSelectionTranslator();
        });
    }
})

// Đăng ký tất cả trình xử lý sự kiện kích hoạt dịch thủ công
function setupManualTranslationTriggers() {
    const screen = { mouseX: 0, mouseY: 0, hotkeyPressed: false, otherKeyPressed: false, hasSlideTranslation: false };
    let mouseHotkeysPressed = new Set<string>();
    
    // Lấy rê chuột Phím tắt được cấu hình hiện tại
    const getConfiguredMouseHotkeyParts = () => {
        // Nếu tùy chọn tắt phím được chọn, hãy sử dụng tùy chọn tùy chỉnh
        const hotkeyString = config.hotkey === 'custom' 
            ? config.customHotkey 
            : config.hotkey;
        
        if (!hotkeyString || hotkeyString === 'none') {
            return [];
        }
        
        // Nếu là định dạng khóa đơn cũ, hãy quay lại trực tiếp
        if (!hotkeyString.includes('+')) {
            const k = hotkeyString.toLowerCase();
            // Tên khóa sửa đổi được tiêu chuẩn hóa
            if (k === 'ctrl') return ['control'];
            if (k === 'option') return ['alt'];
            return [k];
        }
        
        // Định dạng tổ hợp phím
        return hotkeyString.split('+').map(key => {
            const k = key.toLowerCase();
            // Tên khóa sửa đổi được tiêu chuẩn hóa
            if (k === 'ctrl') return 'control';
            if (k === 'option') return 'alt';
            return k;
        });
    };
    
    // Kiểm tra xem có khớp với Phím tắt rê chuột không
    const checkMouseHotkey = () => {
        const hotkeyParts = getConfiguredMouseHotkeyParts();
        if (hotkeyParts.length === 0) return false;
        
        const allKeysPressed = hotkeyParts.every(key => mouseHotkeysPressed.has(key));
        const exactMatch = allKeysPressed && hotkeyParts.length === mouseHotkeysPressed.size;
        
        return exactMatch;
    };

    // 1. Khi mất tập trung
    window.addEventListener('blur', () => {
        screen.hotkeyPressed = false;
        screen.otherKeyPressed = false;
        screen.hasSlideTranslation = false;
        mouseHotkeysPressed.clear();
    });

    // 2. Khi nhấn nút
    window.addEventListener('keydown', event => {
        // Ngăn chặn sự cố trùng lặp
        if (event.repeat) return;
        
        // Vô hiệu hóa phím cmd tham gia phím tắt trên Mac
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if (isMac && event.metaKey) {
            return;
        }
        
        // Ghi lại các phím bổ trợ
        if (event.altKey) mouseHotkeysPressed.add('alt');
        if (event.ctrlKey) mouseHotkeysPressed.add('control');
        if (event.metaKey && !isMac) mouseHotkeysPressed.add('control'); // MetaKey được ánh xạ để điều khiển trên các hệ thống không phải Mac
        if (event.shiftKey) mouseHotkeysPressed.add('shift');
        
        // Xử lý các phím thông thường
        const key = event.key.toLowerCase();
        const code = event.code?.toLowerCase();
        
        // Xử lý các phím chữ cái
        if (code && code.startsWith('key')) {
            const letter = code.slice(3).toLowerCase();
            mouseHotkeysPressed.add(letter);
        } else if (key.length === 1) {
            // Phím ký tự đơn
            mouseHotkeysPressed.add(key);
        } else if (/^f\d+$/.test(key)) {
            // Phím chức năng F1-F12
            mouseHotkeysPressed.add(key);
        } else {
            // Ánh xạ khóa đặc biệt
            const specialKeys: Record<string, string> = {
                'escape': 'escape',
                'enter': 'enter',
                'space': 'space',
                'tab': 'tab',
                'backspace': 'backspace',
                'delete': 'delete',
                'insert': 'insert',
                'home': 'home',
                'end': 'end',
                'pageup': 'pageup',
                'pagedown': 'pagedown',
                'arrowup': 'arrowup',
                'arrowdown': 'arrowdown',
                'arrowleft': 'arrowleft',
                'arrowright': 'arrowright'
            };
            if (specialKeys[key]) {
                mouseHotkeysPressed.add(specialKeys[key]);
            }
        }
        
        // Kiểm tra xem có khớp với Phím tắt rê chuột không
        if (checkMouseHotkey()) {
            screen.hotkeyPressed = true;
            screen.otherKeyPressed = false;
        } else if (screen.hotkeyPressed) {
            screen.otherKeyPressed = true;
        }
    });

    // 3. Khi nhấc nút
    window.addEventListener('keyup', event => {
        // Xóa trạng thái phím chữ (Xóa trước khi kiểm tra)
        const releasedKey = event.key.toLowerCase();
        const releasedCode = event.code?.toLowerCase();
        if (releasedCode && releasedCode.startsWith('key')) {
            const letter = releasedCode.slice(3).toLowerCase();
            mouseHotkeysPressed.delete(letter);
        } else if (releasedKey.length === 1) {
            mouseHotkeysPressed.delete(releasedKey);
        } else if (/^f\d+$/.test(releasedKey)) {
            mouseHotkeysPressed.delete(releasedKey);
        } else {
            // Phím đặc biệt
            const specialKeys: Record<string, string> = {
                'escape': 'escape',
                'enter': 'enter',
                'space': 'space',
                'tab': 'tab',
                'backspace': 'backspace',
                'delete': 'delete',
                'insert': 'insert',
                'home': 'home',
                'end': 'end',
                'pageup': 'pageup',
                'pagedown': 'pagedown',
                'arrowup': 'arrowup',
                'arrowdown': 'arrowdown',
                'arrowleft': 'arrowleft',
                'arrowright': 'arrowright'
            };
            if (specialKeys[releasedKey]) {
                mouseHotkeysPressed.delete(specialKeys[releasedKey]);
            }
        }
        
        // Xóa trạng thái phím bổ trợ
        if (!event.altKey) mouseHotkeysPressed.delete('alt');
        if (!event.ctrlKey) mouseHotkeysPressed.delete('control');
        if (!event.metaKey) mouseHotkeysPressed.delete('control');
        if (!event.shiftKey) mouseHotkeysPressed.delete('shift');
        
        // Nhận các phím tắt hiện được cấu hình
        const hotkeyParts = getConfiguredMouseHotkeyParts();
        
        // Nếu tập hợp khóa hiện tại trống và phím tắt đã được kích hoạt trước đó cũng như phím tắt được định cấu hình không chứa khóa hiện được phát hành thì quá trình dịch sẽ được kích hoạt.
        if (screen.hotkeyPressed && mouseHotkeysPressed.size === 0 && !screen.otherKeyPressed && !screen.hasSlideTranslation) {
            // Kiểm tra xem plug-in đã được bật chưa
            if (config.on) {
                handleTranslation(screen.mouseX, screen.mouseY);
            }
        }
        
        // Nếu tất cả các phím được giải phóng, hãy đặt lại trạng thái
        if (mouseHotkeysPressed.size === 0) {
            screen.hotkeyPressed = false;
            screen.otherKeyPressed = false;
            screen.hasSlideTranslation = false;
        }
    });

    // 4. Cập nhật vị trí khi chuột di chuyển và quyết định có kích hoạt dịch hay không dựa trên hotkeyPressed
    document.body.addEventListener('mousemove', event => {
        screen.mouseX = event.clientX;
        screen.mouseY = event.clientY;
        if (screen.hotkeyPressed && config.on) {
            screen.hasSlideTranslation = true;
            handleTranslation(screen.mouseX, screen.mouseY, 50)
        }
    });

    // 5. Đối với sự kiện chạm trên điện thoại di động, lấy điểm trung tâm để dịch
    document.body.addEventListener('touchstart', event => {
        let coordinate;
        switch (config.hotkey) {
            case constants.TwoFinger:
                coordinate = getCenterPoint(event.touches, 2);
                break;
            case constants.ThreeFinger:
                coordinate = getCenterPoint(event.touches, 3);
                break;
            case constants.FourFinger:
                coordinate = getCenterPoint(event.touches, 4);
                break;
            default:
                return
        }

        // Kiểm tra xem plug-in đã được bật chưa
        if (config.on) {
            handleTranslation(coordinate!.x, coordinate!.y);
        }
    });

    // 6. Sự kiện dịch click đúp chuột
    document.body.addEventListener('dblclick', event => {
        if (config.hotkey == constants.DoubleClick && config.on) {
            // Nhận vị trí chuột thông qua sự kiện nhấp đúp
            let mouseX = event.clientX;
            let mouseY = event.clientY;
            // Gọi hàm handTranslation để dịch
            handleTranslation(mouseX, mouseY);
        }
    });

    // 7. Nhấn và giữ sự kiện dịch chuột (chuột không thể di chuyển trong sự kiện nhấn và giữ)
    let timer: number;
    let startPos = { x: 0, y: 0 }; // startPos ghi lại vị trí khi nhấn chuột
    document.body.addEventListener('mouseup', () => clearTimeout(timer));
    document.body.addEventListener('mousedown', event => {
        if (config.hotkey === constants.LongPress) {
            clearTimeout(timer); // Xóa bộ đếm thời gian trước đó của
            startPos.x = event.clientX; // Ghi lại vị trí ban đầu của chuột khi nhấn
            startPos.y = event.clientY;
            timer = setTimeout(() => {
                if (config.on) {
                    let mouseX = event.clientX;
                    let mouseY = event.clientY;
                    handleTranslation(mouseX, mouseY);
                }
            }, 500) as unknown as number;
        }
    });
    document.body.addEventListener('mousemove', event => {
        // Hủy sự kiện nhấn giữ nếu chuột di chuyển quá 10 pixels
        if (Math.abs(event.clientX - startPos.x) > 10 || Math.abs(event.clientY - startPos.y) > 10) {
            clearTimeout(timer);
        }
    });
    document.body.addEventListener('mousemove', event => {
        // Phát hiện chuột có di chuyển hay không, nếu chuột di chuyển quá 10 pixels, Hủy sự kiện nhấn giữ
        if (config.hotkey === constants.LongPress
            && Math.abs(event.clientX - startPos.x) > 10 || Math.abs(event.clientY - startPos.y) > 10) {
            clearTimeout(timer);
        }
    });


    // 8. Sự kiện dịch nút chuột giữa
    document.body.addEventListener('mousedown', event => {
        if (config.hotkey === constants.MiddleClick && config.on) {
            if (event.button === 1) {
                let mouseX = event.clientX;
                let mouseY = event.clientY;
                handleTranslation(mouseX, mouseY);
            }
        }
    });


    // 9. Nhấp đúp chuột vào thiết bị màn hình cảm ứng/nhấp chuột ba lần
    let touchCount = 0;
    let touchTimer: any;
    document.body.addEventListener('touchstart', event => {
        // Kiểm tra xem đó có phải là cấu hình phím nóng hợp lệ hay không và chỉ xử lý các sự kiện chạm bằng một ngón tay
        if (![constants.DoubleClickScreen, constants.TripleClickScreen].includes(config.hotkey)
            || event.touches.length !== 1) return;

        // Xác nhậnSố lần nhấp chuột được yêu cầu
        const requiredTouches = config.hotkey === constants.DoubleClickScreen ? 2 : 3;

        touchCount++; // Ghi lại số lần chạm

        if (touchCount === 1) {
            // Nếu đây là lần chạm đầu tiên, hãy đặt bộ hẹn giờ và đặt lại nếu không đạt được số lần chạm yêu cầu trong vòng 500 mili giây.
            touchTimer = setTimeout(() => touchCount = 0, 500);
        } else if (touchCount === requiredTouches) {
            // Nếu đạt số lần chạm yêu cầu, Xóa bộ đếm thời gian và gọi hàm xử lý dịch thuật
            clearTimeout(touchTimer);
            touchCount = 0;
            if (config.on) {
                handleTranslation(event.touches[0].clientX, event.touches[0].clientY);
            }
        }
    });
}

        // Đặt Khóa tắt dịch toàn trang (tách rời khỏi quả bóng lơ lửng)
function setupFloatingBallHotkey() {
    // Nếu Cài đặt phím tắt là "không", thì Tắt phím tắt
    if (config.floatingBallHotkey === 'none') return;

    // Thêm tính năng nghe sự kiện bàn phím toàn cầu
    let hotkeysPressed = new Set<string>();
    let lastKeyDownTime = 0; // Được sử dụng để ngăn chặn các sự kiện quan trọng được kích hoạt nhiều lần
    
    // Kích hoạt vấn đề về nhãn môi trường
    const isDev = process.env.NODE_ENV === 'development';
    
    // Phát hiện loại hệ điều hành
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    
    // Nhận các phím tắt hiện được cấu hình
    const getConfiguredHotkeyParts = () => {
        // Nếu tùy chọn tắt phím được chọn, hãy sử dụng tùy chọn tùy chỉnh
        const hotkeyString = config.floatingBallHotkey === 'custom' 
            ? config.customFloatingBallHotkey 
            : config.floatingBallHotkey;
        
        if (!hotkeyString || hotkeyString === 'none') {
            return [];
        }
        
        return hotkeyString.split('+').map(key => {
            const k = key.toLowerCase();
            // Tên khóa sửa đổi được tiêu chuẩn hóa
            if (k === 'ctrl') return 'control';
            if (k === 'option') return 'alt';
            return k;
        });
    };
    
    if (isDev) {
        console.log(`[FluentRead] Đặt phím tắt bóng nổi: ${config.floatingBallHotkey}, Hệ điều hành: ${isMac ? 'macOS' : 'Khác'}`);
    }
    
    // Nghe các sự kiện nhấn phím
    document.addEventListener('keydown', (event) => {
        // Ngăn chặn sự kiện được kích hoạt nhiều lần (một số trình duyệt có thể kích hoạt sự kiện keydown nhiều lần)
        const now = Date.now();
        if (now - lastKeyDownTime < 50) return;
        lastKeyDownTime = now;
        
        // Vô hiệu hóa phím cmd tham gia phím tắt trên Mac
        if (isMac && event.metaKey) {
            return;
        }
        
        // Ghi lại trạng thái phím sửa đổi
        if (event.altKey) hotkeysPressed.add('alt');
        if (event.ctrlKey) hotkeysPressed.add('control');
        if (event.metaKey && !isMac) hotkeysPressed.add('control'); // MetaKey được ánh xạ để điều khiển trên các hệ thống không phải Mac
        if (event.shiftKey) hotkeysPressed.add('shift');
        
        // Xử lý các phím thông thường
        const key = event.key.toLowerCase();
        const code = event.code?.toLowerCase();
        
        // Xử lý các phím chữ cái
        if (code && code.startsWith('key')) {
            const letter = code.slice(3).toLowerCase();
            hotkeysPressed.add(letter);
        } else if (key.length === 1) {
            // Phím ký tự đơn
            hotkeysPressed.add(key);
        } else if (/^f\d+$/.test(key)) {
            // Phím chức năng F1-F12
            hotkeysPressed.add(key);
        } else {
            // Phím đặc biệt
            const specialKeys: Record<string, string> = {
                'escape': 'escape',
                'enter': 'enter',
                'space': 'space',
                'tab': 'tab',
                'backspace': 'backspace',
                'delete': 'delete',
                'arrowup': 'arrowup',
                'arrowdown': 'arrowdown', 
                'arrowleft': 'arrowleft',
                'arrowright': 'arrowright',
                'home': 'home',
                'end': 'end',
                'pageup': 'pageup',
                'pagedown': 'pagedown',
                'insert': 'insert'
            };
            
            if (specialKeys[key]) {
                hotkeysPressed.add(specialKeys[key]);
            }
        }
        
        // Nhận các phím tắt hiện được cấu hình
        const hotkeyParts = getConfiguredHotkeyParts();
        
        // Nếu không có phím tắt nào được cấu hình, nó sẽ không được xử lý.
        if (hotkeyParts.length === 0) {
            return;
        }
        
        // Kiểm tra xem phím hiện được nhấn có khớp chính xác với phím tắt đã định cấu hình hay không
        const allKeysPressed = hotkeyParts.every(key => hotkeysPressed.has(key));
        const exactMatch = allKeysPressed && hotkeyParts.length === hotkeysPressed.size;
        
        // Nếu tổ hợp phím khớp chính xác với phím tắt đã định cấu hình
        // Bất kể quả bóng nổi có được kích hoạt hay không, một sự kiện thống nhất sẽ được gửi đi và người xử lý tương ứng sẽ tiếp quản
        if (exactMatch) {
            // Kiểm tra xem plug-in đã được bật chưa
            if (!config.on) return;
            
            // Ngăn chặn sự lan truyền sự kiện và hành vi mặc định
            event.preventDefault();
            event.stopPropagation();
            
            // Kích hoạt dịch thông qua các sự kiện tùy chỉnh
            document.dispatchEvent(new CustomEvent('fluentread-toggle-translation'));
            
            if (isDev) {
                const activeHotkey = config.floatingBallHotkey === 'custom' 
                    ? config.customFloatingBallHotkey 
                    : config.floatingBallHotkey;
                console.log(`[FluentRead] Kích hoạt dịch bằng bóng nổi, phím tắt: ${activeHotkey}`);
            }
        }
    });
    
    // Lắng nghe các sự kiện phát hành chính
    document.addEventListener('keyup', (event) => {
        // Xóa trạng thái phím chữ cái
        const releasedKey = event.key.toLowerCase();
        const releasedCode = event.code?.toLowerCase();
        if (releasedCode && releasedCode.startsWith('key')) {
            const letter = releasedCode.slice(3).toLowerCase();
            hotkeysPressed.delete(letter);
        } else if (releasedKey.length === 1) {
            hotkeysPressed.delete(releasedKey);
        } else if (/^f\d+$/.test(releasedKey)) {
            hotkeysPressed.delete(releasedKey);
        } else {
            // Phím đặc biệt
            const specialKeys: Record<string, string> = {
                'escape': 'escape',
                'enter': 'enter',
                'space': 'space',
                'tab': 'tab',
                'backspace': 'backspace',
                'delete': 'delete',
                'arrowup': 'arrowup',
                'arrowdown': 'arrowdown',
                'arrowleft': 'arrowleft',
                'arrowright': 'arrowright',
                'home': 'home',
                'end': 'end',
                'pageup': 'pageup',
                'pagedown': 'pagedown',
                'insert': 'insert'
            };
            if (specialKeys[releasedKey]) {
                hotkeysPressed.delete(specialKeys[releasedKey]);
            }
        }
        
        // Xóa trạng thái phím bổ trợ
        if (!event.altKey) hotkeysPressed.delete('alt');
        if (!event.ctrlKey) hotkeysPressed.delete('control');
        if (!event.metaKey) hotkeysPressed.delete('control');
        if (!event.shiftKey) hotkeysPressed.delete('shift');
    });
    
    // Trạng thái của tất cả các phím Xóa khi mất trang hoặc chuyển tab
    window.addEventListener('blur', () => {
        hotkeysPressed.clear();
    });
}

// Đăng ký sự kiện dịch tự động
function autoTranslationEvent() {
    // Tự động dịch trang tiếng Anh
    autoTranslateEnglishPage();
}

// Xóa tất cả các chức năng đã dịch
function clearAllTranslations() {
    // 1. Loại bỏ tất cả các thành phần dịch kết quả
    document.querySelectorAll('.fluent-read-translation').forEach(el => el.remove());

    // 2. Xóa tất cả trạng thái tải
    document.querySelectorAll('.fluent-read-loading').forEach(el => el.remove());

    // 3. Loại bỏ tất cả các trạng thái lỗi
    document.querySelectorAll('.fluent-read-failure').forEach(el => el.remove());

    // 4. Xóa tất cả các tên lớp có cách dịch tương tự với Tắt
    document.querySelectorAll('.fluent-read-processed').forEach(el => {
        el.classList.remove('fluent-read-processed');
    });

    // 5. Xóa bộ nhớ cache trong bộ nhớ
    cache.clean();

    console.log('Đã xóa toàn bộ bộ nhớ đệm dịch');
}

/**
 * Gắn kết thành phần trạng thái dịch  */
function mountTranslationStatusComponent() {
    // Tạo phần tử vùng chứa
    const container = document.createElement('div');
    container.id = 'fluent-read-translation-status-container';
    document.body.appendChild(container);
    
    // Tạo và gắn kết các thành phần
    const app = createApp(TranslationStatus);
    app.mount(container);
}

/**
 * Dịch trong hàm nhập ô  */
function setupInputBoxTranslation() {
    let keyPressCount = 0;
    let keyPressTimer: NodeJS.Timeout | null = null;
    let lastTriggerKey = '';
    const TRIPLE_KEY_TIMEOUT = 1000; // Nó có hiệu lực sau ba lần nhấn liên tiếp trong vòng 1 giây.
    
    // Nghe các sự kiện bàn phím
    document.addEventListener('keydown', async (event) => {
        // Kiểm tra xem chức năng có bật không
        if (config.inputBoxTranslationTrigger === 'disabled') {
            return;
        }
        
        // Kiểm tra xem phần tử hiện đang tập trung có phải là hộp nhập liệu hay không
        const activeElement = document.activeElement as HTMLElement;
        if (!isInputElement(activeElement)) {
            return;
        }
        
        // Xử lý các phương pháp kích hoạt khác nhau
        const triggerType = config.inputBoxTranslationTrigger;
        
        if (triggerType === 'ctrl_enter') {
            // Ctrl+Enter kích hoạt
            if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                await handleInputBoxTranslation(activeElement);
                return;
            }
        } else if (triggerType === 'triple_space' || triggerType === 'triple_equal' || triggerType === 'triple_dash') {
            // Nhấn ba lần để kích hoạt
            let targetKey = '';
            switch (triggerType) {
                case 'triple_space':
                    targetKey = ' ';
                    break;
                case 'triple_equal':
                    targetKey = '=';
                    break;
                case 'triple_dash':
                    targetKey = '-';
                    break;
            }
            
            // Chỉ phản hồi khi nhấn phím đích
            if (event.key !== targetKey) {
                // Nếu nhấn phím khác với phím đích, hãy đặt lại bộ đếm
                keyPressCount = 0;
                lastTriggerKey = '';
                if (keyPressTimer) {
                    clearTimeout(keyPressTimer);
                    keyPressTimer = null;
                }
                return;
            }
            
            // Kiểm tra xem phím đó có được nhấn liên tục không
            if (lastTriggerKey !== targetKey) {
                keyPressCount = 1;
                lastTriggerKey = targetKey;
            } else {
                keyPressCount++;
            }
            
            // Nếu là lần thứ ba nhấn phím đích
            if (keyPressCount === 3) {
                event.preventDefault(); // Chặn đầu vào mặc định
                await handleInputBoxTranslation(activeElement);
                keyPressCount = 0; // đặt lại bộ đếm
                lastTriggerKey = '';
            }
            
            // Đặt thời gian chờ. Nếu bạn không nhấn liên tục ba lần trong thời gian quy định, bộ đếm sẽ được đặt lại.
            if (keyPressTimer) {
                clearTimeout(keyPressTimer);
            }
            keyPressTimer = setTimeout(() => {
                keyPressCount = 0;
                lastTriggerKey = '';
            }, TRIPLE_KEY_TIMEOUT);
        }
    });
}

/**
 * Kiểm tra xem phần tử có phải là phần tử đầu vào không  */
function isInputElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const isInput = tagName === 'input';
    const isTextarea = tagName === 'textarea';
    const isContentEditable = element.contentEditable === 'true';
    
    // Đối với các phần tử đầu vào, bạn cũng cần kiểm tra thuộc tính type
    if (isInput) {
        const inputType = (element as HTMLInputElement).type.toLowerCase();
        const textInputTypes = ['text', 'search', 'url', 'email', 'password'];
        return textInputTypes.includes(inputType);
    }
    
    return isTextarea || isContentEditable;
}

/**
 * Lấy văn bản vào hộp nhập liệu  */
function getInputBoxText(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
        return (element as HTMLInputElement | HTMLTextAreaElement).value.trim();
    } else if (element.contentEditable === 'true') {
        return element.innerText.trim();
    }
    
    return '';
}

/**
 * Loại bỏ biểu tượng kích hoạt ở cuối theo phương pháp kích hoạt  */
function removeTriggerSymbols(text: string, triggerType: string): string {
    if (!text || triggerType === 'disabled' || triggerType === 'ctrl_enter') {
        return text;
    }
    
    let triggerSymbol = '';
    switch (triggerType) {
        case 'triple_space':
            triggerSymbol = ' ';
            break;
        case 'triple_equal':
            triggerSymbol = '=';
            break;
        case 'triple_dash':
            triggerSymbol = '-';
            break;
        default:
            return text;
    }
    
    // Xóa tất cả các ký hiệu kích hoạt ở cuối
    let cleanedText = text;
    while (cleanedText.endsWith(triggerSymbol)) {
        cleanedText = cleanedText.slice(0, -1);
    }
    
    return cleanedText.trim();
}

/**
 * Đặt văn bản vào hộp nhập  */
function setInputBoxText(element: HTMLElement, text: string): void {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
        inputElement.value = text;
        
        // Kích hoạt sự kiện đầu vào để trang web có thể cảm nhận được sự thay đổi về giá trị
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
        element.innerText = text;
        
        // kích hoạt sự kiện đầu vào
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Tạo và hiển thị cửa sổ bật lên nhắc dịch  */
function createTranslationTooltip(element: HTMLElement, message: string, type: 'translating' | 'success' | 'error'): HTMLElement {
    // Xóa các mẹo hiện có
    removeExistingTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = `fluent-input-tooltip ${type}`;
    tooltip.id = 'fluent-input-translation-tooltip';
    
    // Thêm biểu tượng và văn bản
    const icon = getTooltipIcon(type);
    tooltip.innerHTML = `${icon} ${message}`;
    
    // Tính toán vị trí
    const rect = element.getBoundingClientRect();
    const tooltipTop = rect.bottom + window.scrollY + 12;
    const tooltipLeft = rect.left + window.scrollX + (rect.width / 2);
    
    tooltip.style.top = `${tooltipTop}px`;
    tooltip.style.left = `${tooltipLeft}px`;
    tooltip.style.transform = 'translateX(-50%)';
    
    // Nếu Tắt hoạt ảnh, hiển thị trực tiếp, nếu không thì sử dụng hiệu ứng mờ dần
    if (!config.animations) {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateX(-50%) translateY(0)';
    } else {
        tooltip.style.opacity = '0';
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 10);
    }
    
    document.body.appendChild(tooltip);
    return tooltip;
}

/**
 * Nhận biểu tượng nhắc nhở  */
function getTooltipIcon(type: 'translating' | 'success' | 'error'): string {
    const icons = {
        translating: '•',
        success: '✓',
        error: '!'
    };
    return icons[type];
}

/**
 * Loại bỏ các cửa sổ bật lên nhắc nhở hiện có  */
function removeExistingTooltip(): void {
    const existing = document.getElementById('fluent-input-translation-tooltip');
    if (existing) {
        if (!config.animations) {
            // Nếu Tắt ảnh động thì gỡ trực tiếp
            existing.remove();
        } else {
            // Sử dụng hoạt ảnh mờ dần
            existing.classList.add('hide');
            setTimeout(() => existing.remove(), 300);
        }
    }
}

/**
 * Thêm ô nhập Hiệu ứng  */
function addInputBoxAnimation(element: HTMLElement, animationType: 'translating' | 'success' | 'error'): void {
    // Nếu Tắt là hoạt ảnh, Hiệu ứng không được thêm vào
    if (!config.animations) {
        return;
    }
    
    // Xóa lớp hoạt hình hiện có
    element.classList.remove('fluent-input-translating', 'fluent-input-success', 'fluent-input-error');
    
    // Thêm lớp hoạt hình mới
    element.classList.add(`fluent-input-${animationType}`);
    
    // Nếu đó không phải là hoạt ảnh trong bản dịch, hãy xóa lớp sau khi hoạt ảnh hoàn tất
    if (animationType !== 'translating') {
        setTimeout(() => {
            element.classList.remove(`fluent-input-${animationType}`);
        }, animationType === 'success' ? 1000 : 600);
    }
}

/**
 * Hàm Microsoft Translate dành riêng cho Dịch trong ô nhập (không sử dụng bộ nhớ đệm)  * Được gọi thông qua tập lệnh nền để tránh sự cố CORS của Firefox  */
async function translateWithMicrosoft(text: string, targetLang: string): Promise<string> {
    try {
        // Gửi tin nhắn đến tập lệnh nền để dịch
        const result = await browser.runtime.sendMessage({
            type: 'inputBoxTranslation',
            text: text,
            targetLang: targetLang
        });
        
        if (result && result.success) {
            return result.translatedText;
        } else {
            throw new Error(result?.error || 'Dịch Microsoft thất bại');
        }
    } catch (error) {
        console.error('Yêu cầu dịch Microsoft thất bại:', error);
        throw error;
    }
}

/**
 * Xử lý dịch trong ô nhập  */
async function handleInputBoxTranslation(element: HTMLElement): Promise<void> {
    let tooltip: HTMLElement | null = null;
    
    try {
        const originalText = getInputBoxText(element);
        
        if (!originalText) {
            return;
        }
        
        // Bỏ ký hiệu trigger ở cuối theo cách trigger
        const cleanedText = removeTriggerSymbols(originalText, config.inputBoxTranslationTrigger);
        
        if (!cleanedText) {
            return;
        }
        
        // Hiển thị hình ảnh động và lời nhắc trong bản dịch
        addInputBoxAnimation(element, 'translating');
        tooltip = createTranslationTooltip(element, 'Đang dịch bằng Microsoft', 'translating');
        
        try {
            // Gọi trực tiếp Microsoft Dịch API mà không cần sử dụng bộ đệm
            const translatedText = await translateWithMicrosoft(cleanedText, config.inputBoxTranslationTarget);
            
            if (translatedText && translatedText !== cleanedText) {
                // Xóa hoạt ảnh khỏi bản dịch
                element.classList.remove('fluent-input-translating');
                
                // SET kết quả dịch
                setInputBoxText(element, translatedText);
                
                // Hiển thị hình ảnh động và lời nhắc thành công
                addInputBoxAnimation(element, 'success');
                removeExistingTooltip();
                tooltip = createTranslationTooltip(element, 'Dịch thành công', 'success');
            } else {
                // Kết quả dịch giống với Nguyên văn hoặc trống
                element.classList.remove('fluent-input-translating');
                addInputBoxAnimation(element, 'error');
                removeExistingTooltip();
                tooltip = createTranslationTooltip(element, 'Nội dung không cần dịch', 'error');
            }
        } catch (translationError) {
            // Dịch thất bại
            element.classList.remove('fluent-input-translating');
            addInputBoxAnimation(element, 'error');
            removeExistingTooltip();
            tooltip = createTranslationTooltip(element, 'Dịch Microsoft thất bại', 'error');
            console.error('Dịch Microsoft thất bại:', translationError);
        }
        
        // Tự động ẩn lời nhắc
        setTimeout(() => removeExistingTooltip(), 2500);
        
    } catch (error) {
        console.error('Dịch trong ô nhập thất bại:', error);
        
        // Xóa hoạt ảnh khỏi bản dịch
        element.classList.remove('fluent-input-translating');
        
        // Hiển thị hình ảnh động và lời nhắc lỗi
        addInputBoxAnimation(element, 'error');
        removeExistingTooltip();
        tooltip = createTranslationTooltip(element, 'Dịch vụ dịch tạm thời không khả dụng', 'error');
        
        // Tự động ẩn thông báo lỗi
        setTimeout(() => removeExistingTooltip(), 3000);
    }
}

// Khởi tạo Dịch trong hàm nhập ô
setupInputBoxTranslation();
