import {_service} from "@/entrypoints/service/_service";
import {config} from "@/entrypoints/utils/config";
import {CONTEXT_MENU_IDS} from "@/entrypoints/utils/constant";

// Quản lý trạng thái dịch
let translationStateMap = new Map<number, boolean>(); // tabId -> isTranslated

/**
 * Gọi Microsoft DịchAPI trong tập lệnh nền (tránh các sự cố CORS của Firefox)
 */
async function translateWithMicrosoftInBackground(text: string, targetLang: string): Promise<string> {
    try {
        // Nhận JWT token cho Microsoft Dịch
        const jwtToken = await refreshMicrosoftTokenInBackground();
        
        // Gọi Microsoft DịchAPI
        const response = await fetch(`https://api-edge.cognitive.microsofttranslator.com/translate?from=&to=${targetLang}&api-version=3.0&includeSentenceLength=true&textType=html`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + jwtToken
            },
            body: JSON.stringify([{Text: text}])
        });

        if (response.ok) {
            const result = await response.json();
            return result[0].translations[0].text;
        } else {
            throw new Error(`Dịch Microsoft thất bại: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Yêu cầu dịch Microsoft thất bại:', error);
        throw error;
    }
}

/**
 * Làm mới mã thông báo Microsoft Dịch trong tập lệnh nền
 */
async function refreshMicrosoftTokenInBackground(): Promise<string> {
    try {
        const response = await fetch("https://edge.microsoft.com/translate/auth");
        if (response.ok) {
            return await response.text();
        } else {
            throw new Error(`Lấy token Microsoft Translator thất bại: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Lấy token Microsoft Translator thất bại:', error);
        throw error;
    }
}

export default defineBackground({
    persistent: {
        safari: false,
    },
    main() {
        // Tạo các mục menu chuột phải
        try {
            // Tạo menu cha
            browser.contextMenus.create({
                id: 'fluentread-parent',
                title: 'FluentRead',
                contexts: ['page', 'selection'],
            });
            
            // Tạo menu con Dịch toàn trang
            browser.contextMenus.create({
                id: CONTEXT_MENU_IDS.TRANSLATE_FULL_PAGE,
                title: 'Dịch toàn trang',
                parentId: 'fluentread-parent',
                contexts: ['page', 'selection'],
            });
            
            // Tạo menu con dịch hoàn chỉnh
            browser.contextMenus.create({
                id: CONTEXT_MENU_IDS.RESTORE_ORIGINAL,
                title: 'Hoàn tác bản dịch',
                parentId: 'fluentread-parent',
                contexts: ['page', 'selection'],
                enabled: false, // Trạng thái ban đầu là Tắt
            });
        } catch (error) {
            console.error('Error setting up context menu:', error);
        }

        // Nghe các sự kiện nhấp chuột phải vào menu
        browser.contextMenus.onClicked.addListener((info: any, tab: any) => {
            if (!tab?.id) return;
            
            if (info.menuItemId === CONTEXT_MENU_IDS.TRANSLATE_FULL_PAGE) {
                // Gửi tin nhắn tới nội dung script để kích hoạt Dịch toàn trang
                browser.tabs.sendMessage(tab.id, {
                    type: 'contextMenuTranslate',
                    action: 'fullPage'
                }).then(() => {
                    // Cập nhật trạng thái dịch
                    translationStateMap.set(tab.id!, true);
                    updateContextMenus(tab.id!);
                }).catch((error: any) => {
                    console.error('Failed to send message to content script:', error);
                });
            } else if (info.menuItemId === CONTEXT_MENU_IDS.RESTORE_ORIGINAL) {
                // Gửi tin nhắn tới nội dung script Hoàn tác bản dịch
                browser.tabs.sendMessage(tab.id, {
                    type: 'contextMenuTranslate',
                    action: 'restore'
                }).then(() => {
                    // Cập nhật trạng thái dịch
                    translationStateMap.set(tab.id!, false);
                    updateContextMenus(tab.id!);
                }).catch((error: any) => {
                    console.error('Failed to send message to content script:', error);
                });
            }
        });

        // Cập nhật trạng thái menu chuột phải
        const updateContextMenus = (tabId: number) => {
            const isTranslated = translationStateMap.get(tabId) || false;
            
            try {
                // Đã cập nhật mục menu Dịch toàn trang
                browser.contextMenus.update(CONTEXT_MENU_IDS.TRANSLATE_FULL_PAGE, {
                    enabled: !isTranslated,
                    title: isTranslated ? 'Dịch toàn trang (đã dịch)' : 'Dịch toàn trang'
                });
                
                // Cập nhật Mục menu dịch hoàn chỉnh
                browser.contextMenus.update(CONTEXT_MENU_IDS.RESTORE_ORIGINAL, {
                    enabled: isTranslated,
                    title: isTranslated ? 'Hoàn tác bản dịch' : 'Hoàn tác bản dịch (chưa dịch)'
                });
            } catch (error) {
                console.error('Failed to update context menus:', error);
            }
        };

        // Nghe các sự kiện chuyển đổi tab và cập nhật trạng thái menu
        browser.tabs.onActivated.addListener((activeInfo: any) => {
            updateContextMenus(activeInfo.tabId);
        });

        // Lắng nghe các sự kiện cập nhật tab (làm mới trang, v.v.)
        browser.tabs.onUpdated.addListener((tabId: any, changeInfo: any) => {
            if (changeInfo.status === 'complete') {
                // Trang được tải và trạng thái dịch được đặt lại.
                translationStateMap.set(tabId, false);
                updateContextMenus(tabId);
            }
        });

        // Nghe sự kiện Tắt của trang tab và xóa trạng thái
        browser.tabs.onRemoved.addListener((tabId: any) => {
            translationStateMap.delete(tabId);
        });

        // Xử lý các yêu cầu dịch thuật
        browser.runtime.onMessage.addListener((message: any) => {
            return new Promise(async (resolve, reject) => {
                try {
                    // Xử lý Dịch trong các yêu cầu nhập ô
                    if (message.type === 'inputBoxTranslation') {
                        const translatedText = await translateWithMicrosoftInBackground(message.text, message.targetLang);
                        resolve({ success: true, translatedText });
                        return;
                    }
                    
                    // Xử lý các yêu cầu dịch thuật chung
                    _service[config.service](message)
                        .then(resp => resolve(resp))    // thành công
                        .catch(error => reject(error)); // thất bại
                } catch (error) {
                    resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
                }
            });
        });
    }
});
