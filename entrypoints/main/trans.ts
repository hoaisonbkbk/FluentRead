import { checkConfig, searchClassName, skipNode } from "../utils/check";
import { cache } from "../utils/cache";
import { options, servicesType } from "../utils/option";
import { insertFailedTip, insertLoadingSpinner } from "../utils/icon";
import { styles } from "@/entrypoints/utils/constant";
import { beautyHTML, grabNode, grabAllNode, LLMStandardHTML, smashTruncationStyle } from "@/entrypoints/main/dom";
import { detectlang, throttle } from "@/entrypoints/utils/common";
import { getMainDomain, replaceCompatFn } from "@/entrypoints/main/compat";
import { config } from "@/entrypoints/utils/config";
import { translateText, cancelAllTranslations } from '@/entrypoints/utils/translateApi';

let hoverTimer: any; // Hẹn giờ di chuột
let htmlSet = new Set(); // Chống rung
export let originalContents = new Map(); // LưuNội dung gốc
let isAutoTranslating = false; // Kiểm soát xem có tiếp tục dịch nội dung mới hay không
let observer: IntersectionObserver | null = null; // Lưu phiên bản quan sát
let mutationObserver: MutationObserver | null = null; // Lưu ví dụ về người quan sát thay đổi DOM

// Đánh dấu các nút đã dịch bằng thuộc tính tùy chỉnh
const TRANSLATED_ATTR = 'data-fr-translated';
const TRANSLATED_ID_ATTR = 'data-fr-node-id'; // Thêm thuộc tính ID nút

let nodeIdCounter = 0; // Bộ đếm ID nút

// Khôi phục nội dung văn bản Nguyên
export function restoreOriginalContent() {
    // Tất cả các tác vụ dịch đang chờ xử lý tại Hủy
    cancelAllTranslations();
    
    // 1. Duyệt qua tất cả các nút đã dịch
    document.querySelectorAll(`[${TRANSLATED_ATTR}="true"]`).forEach(node => {
        const nodeId = node.getAttribute(TRANSLATED_ID_ATTR);
        if (nodeId && originalContents.has(nodeId)) {
            const originalContent = originalContents.get(nodeId);
            node.innerHTML = originalContent;
            node.removeAttribute(TRANSLATED_ATTR);
            node.removeAttribute(TRANSLATED_ID_ATTR);
            
            // Loại bỏ lớp dịch có thể được thêm vào Lớp Tắt
            node.classList.remove('fluent-read-bilingual');
        }
    });
    
    // 2. Loại bỏ tất cả các thành phần nội dung đã dịch
    document.querySelectorAll('.fluent-read-bilingual-content').forEach(element => {
        element.remove();
    });
    
    // 3. Xóa tất cả hình động tải và thông báo lỗi được thêm vào trong quá trình dịch
    document.querySelectorAll('.fluent-read-loading, .fluent-read-retry-wrapper').forEach(element => {
        element.remove();
    });
    
    // 4. Xóa nội dung được lưu trữ ban đầu
    originalContents.clear();
    
    // 5. Dừng tất cả người quan sát
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }
    
    // 6. Đặt lại trạng thái tất cả các giai đoạn dịch Tắt
    isAutoTranslating = false;
    htmlSet.clear(); // Bộ sưu tập chống rung rõ ràng
    nodeIdCounter = 0; // Đặt lại bộ đếm ID nút
    
    // 7. Loại bỏ ô nhiễm kiểu toàn cầu có thể xảy ra
    const tempStyleElements = document.querySelectorAll('style[data-fr-temp-style]');
    tempStyleElements.forEach(el => el.remove());
}

// Khả năng tự động dịch toàn bộ trang
export function autoTranslateEnglishPage() {
    // Nếu đã dịch rồi thì quay lại
    if (isAutoTranslating) return;
    
    // Lấy ngôn ngữ của trang hiện tại (nhận xét tạm thời, có vấn đề về nhận dạng)
    // const text = document.documentElement.innerText || '';
    // const cleanText = text.replace(/[\s\u3000]+/g, ' ').trim().slice(0, 500);
    // const language = detectlang(cleanText);
    // console.log('Ngôn ngữ trang hiện tại:', ngôn ngữ);
    // const to = config.to;
    // if (to.includes(language)) {
    //     console.log('Ngôn ngữ đích có cùng ngôn ngữ với trang hiện tại và sẽ không được dịch');
    //     return;
    // }
    // console.log('Trang hiện tại không phải là ngôn ngữ đích, Kích hoạt chưa được dịch');

    // Nhận tất cả các nút cần dịch
    const nodes = grabAllNode(document.body);
    if (!nodes.length) return;

    isAutoTranslating = true;

    // Tạo người quan sát
    observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && isAutoTranslating) {
                const node = entry.target as Element;

                // Xóa trùng lặp
                if (node.hasAttribute(TRANSLATED_ATTR)) return;
                
                // Gán ID duy nhất cho nút
                const nodeId = `fr-node-${nodeIdCounter++}`;
                node.setAttribute(TRANSLATED_ID_ATTR, nodeId);
                
                // LưuNội dung gốc
                originalContents.set(nodeId, node.innerHTML);
                
                // Đánh dấu là đã dịch
                node.setAttribute(TRANSLATED_ATTR, 'true');

                if (config.display === styles.bilingualTranslation) {
                    handleBilingualTranslation(node, false);
                } else {
                    handleSingleTranslation(node, false);
                }

                // Dừng quan sát nút này
                observer.unobserve(node);
            }
        });
    }, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1 // Kích hoạt bắt đầu dịch ngay khi 10% xuất hiện
    });

    // Kích hoạt bắt đầu quan sát tất cả các nút
    nodes.forEach(node => {
        observer?.observe(node);
    });

    // Tạo MutationObserver để theo dõi các thay đổi của DOM
    mutationObserver = new MutationObserver((mutations) => {
        if (!isAutoTranslating) return;
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // nút phần tử
                    // Chỉ xử lý các nút mới chưa được dịch
                    const newNodes = grabAllNode(node as Element).filter(
                        n => !n.hasAttribute(TRANSLATED_ATTR)
                    );
                    newNodes.forEach(n => observer?.observe(n));
                }
            });
        });
    });

    // Theo dõi những thay đổi trong toàn bộ cơ thể
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Chức năng chính xử lý dịch khi di chuột qua
export function handleTranslation(mouseX: number, mouseY: number, delayTime: number = 0) {
    // Kiểm tra cấu hình
    if (!checkConfig()) return;

    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {

        let node = grabNode(document.elementFromPoint(mouseX, mouseY));

        // Xác định xem có nên bỏ qua nút hay không
        if (skipNode(node)) return;

        // Chống rung
        let nodeOuterHTML = node.outerHTML;
        if (htmlSet.has(nodeOuterHTML)) return;
        htmlSet.add(nodeOuterHTML);

        // Dịch dựa trên chế độ dịch
        if (config.display === styles.bilingualTranslation) {
            handleBilingualTranslation(node, delayTime > 0);  // Xác định xem đó có phải là dịch trượt dựa trên delayTime không
        } else {
            handleSingleTranslation(node, delayTime > 0);
        }
    }, delayTime);
}

// dịch song ngữ
export function handleBilingualTranslation(node: any, slide: boolean) {
    let nodeOuterHTML = node.outerHTML;
    // Nếu nó đã được dịch, hãy xóa nó sau 250ms. Kết quả dịch
    let bilingualNode = searchClassName(node, 'fluent-read-bilingual');
    if (bilingualNode) {
        if (slide) {
            htmlSet.delete(nodeOuterHTML);
            return;
        }
        let spinner = insertLoadingSpinner(bilingualNode as HTMLElement, true);
        setTimeout(() => {
            spinner.remove();
            const content = searchClassName(bilingualNode as HTMLElement, 'fluent-read-bilingual-content');
            if (content && content instanceof HTMLElement) content.remove();
            (bilingualNode as HTMLElement).classList.remove('fluent-read-bilingual');
            htmlSet.delete(nodeOuterHTML);
        }, 250);
        return;
    }

    // Kiểm tra xem có bộ đệm không
    let cached = cache.localGet(node.textContent);
    if (cached) {
        let spinner = insertLoadingSpinner(node, true);
        setTimeout(() => {
            spinner.remove();
            htmlSet.delete(nodeOuterHTML);
            bilingualAppendChild(node, cached);
        }, 250);
        return;
    }

    // Dịch
    bilingualTranslate(node, nodeOuterHTML);
}

// Dịch đơn ngữ
export function handleSingleTranslation(node: any, slide: boolean) {
    let nodeOuterHTML = node.outerHTML;
    let outerHTMLCache = cache.localGet(node.outerHTML);


    if (outerHTMLCache) {
        // handTranslation đã được xử lý chống rung nên được đánh giá là sẽ bị xóa. Lỗi ban đầu là sau khi Lưu hoàn thành. Làm mới trang có thể lấy bộ nhớ đệm và quay lại trực tiếp mà không cần dịch.
        let spinner = insertLoadingSpinner(node, true);
        setTimeout(() => {
            spinner.remove();
            htmlSet.delete(nodeOuterHTML);

            // Tương thích với cấu trúc DOM độc đáo của một số trang web
            let fn = replaceCompatFn[getMainDomain(document.location.hostname)];
            if (fn) fn(node, outerHTMLCache);
            else node.outerHTML = outerHTMLCache;

        }, 250);
        return;
    }

    singleTranslate(node);
}


function bilingualTranslate(node: any, nodeOuterHTML: any) {
    if (detectlang(node.textContent.replace(/[\s\u3000]/g, '')) === config.to) return;

    let origin = node.textContent;
    let spinner = insertLoadingSpinner(node);
    
    // Sử dụng API dịch được quản lý hàng đợi
    translateText(origin, document.title)
        .then((text: string) => {
            spinner.remove();
            htmlSet.delete(nodeOuterHTML);
            bilingualAppendChild(node, text);
        })
        .catch((error: Error) => {
            spinner.remove();
            insertFailedTip(node, error.toString() || "Dịch thất bại", spinner);
        });
}


export function singleTranslate(node: any) {
    if (detectlang(node.textContent.replace(/[\s\u3000]/g, '')) === config.to) return;

    let origin = servicesType.isMachine(config.service) ? node.innerHTML : LLMStandardHTML(node);
    let spinner = insertLoadingSpinner(node);
    
    // Sử dụng API dịch được quản lý hàng đợi
    translateText(origin, document.title)
        .then((text: string) => {
            spinner.remove();
            
            text = beautyHTML(text);
            
            if (!text || origin === text) return;
            
            let oldOuterHtml = node.outerHTML;
            node.innerHTML = text;
            let newOuterHtml = node.outerHTML;
            
            // Lưu đệm kết quả dịch
            cache.localSetDual(oldOuterHtml, newOuterHtml);
            cache.set(htmlSet, newOuterHtml, 250);
            htmlSet.delete(oldOuterHtml);
        })
        .catch((error: Error) => {
            spinner.remove();
            insertFailedTip(node, error.toString() || "Dịch thất bại", spinner);
        });
}

export const handleBtnTranslation = throttle((node: any) => {
    let origin = node.innerText;
    let rs = cache.localGet(origin);
    if (rs) {
        node.innerText = rs;
        return;
    }

    config.count++ && storage.setItem('local:config', JSON.stringify(config));

    browser.runtime.sendMessage({ context: document.title, origin: origin })
        .then((text: string) => {
            cache.localSetDual(origin, text);
            node.innerText = text;
        }).catch((error: any) => console.error('Gọi API thất bại:', error))
}, 250)


function bilingualAppendChild(node: any, text: string) {
    node.classList.add("fluent-read-bilingual");
    let newNode = document.createElement("span");
    newNode.classList.add("fluent-read-bilingual-content");
    // find the style
    const style = options.styles.find(s => s.value === config.style && !s.disabled);
    if (style?.class) {
        newNode.classList.add(style.class);
    }
    newNode.append(text);
    smashTruncationStyle(node);
    node.appendChild(newNode);
}