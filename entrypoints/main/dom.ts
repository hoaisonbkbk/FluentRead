import { getMainDomain, selectCompatFn } from "@/entrypoints/main/compat";
import { html } from 'js-beautify';
import { handleBtnTranslation } from "@/entrypoints/main/trans";

// Tập hợp các thẻ được dịch trực tiếp (các phần tử cấp khối)
const directSet = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // tiêu đề
    'p', 'li', 'dd', 'blockquote',       // đoạn văn và danh sách
    'figcaption'                         // Mô tả hình ảnh
]);

// Thẻ cần bỏ qua
const skipSet = new Set([
    'html', 'body', 'script', 'style', 'noscript', 'iframe',
    'input', 'textarea', 'select', 'button', 'code', 'pre',
]);

// Tập hợp các phần tử nội tuyến (các phần tử có thể được chứa trong các phần tử khác)
export const inlineSet = new Set([
    'a', 'b', 'strong', 'span', 'em', 'i', 'u', 'small', 'sub', 'sup',
    'font', 'mark', 'cite', 'q', 'abbr', 'time', 'ruby', 'bdi', 'bdo',
    'img', 'br', 'wbr', 'svg'
]);

// Truyền vào nút cha và trả về một mảng gồm tất cả các phần tử DOM cần được dịch.
export function grabAllNode(rootNode: Node): Element[] {
    if (!rootNode) return [];

    const result: Element[] = [];

    const walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node: Node): number => {
                if (node instanceof Text) return NodeFilter.FILTER_ACCEPT;

                if (!(node instanceof Element)) return NodeFilter.FILTER_SKIP;

                const tag = node.tagName.toLowerCase();

                // Bỏ qua thẻ danh sách đen
                if (skipSet.has(tag) ||
                    node.classList?.contains('sr-only') ||
                    node.classList?.contains('notranslate')) {
                    return NodeFilter.FILTER_REJECT;
                }

                // Bỏ qua đầu trang và chân trang trong quá trình dịch toàn cầu ban đầu
                if (tag === 'header' || tag === 'footer') {
                    return NodeFilter.FILTER_REJECT;
                }

                // Kiểm tra xem nó chỉ chứa nội dung văn bản hợp lệ
                let hasText = false;
                let hasElement = false;
                let hasNonEmptyElement = false;

                for (const child of node.childNodes) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        hasElement = true;
                        // Kiểm tra xem phần tử con có chứa văn bản không
                        if (child.textContent?.trim()) {
                            hasNonEmptyElement = true;
                        }
                    }
                    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                        hasText = true;
                    }
                }

                // Nếu có phần tử con không trống, hãy bỏ qua nút hiện tại
                if (hasNonEmptyElement) {
                    return NodeFilter.FILTER_SKIP;
                }

                if (hasText && !hasElement) {
                    return NodeFilter.FILTER_ACCEPT;
                }

                // Nếu có phần tử con, tiếp tục duyệt qua
                if (node.childNodes.length > 0) {
                    return NodeFilter.FILTER_SKIP;
                }

                return NodeFilter.FILTER_REJECT;
            }
        }
    );

    // Duyệt qua tất cả các nút có thể dịch được
    let currentNode: Node | null;
    while (currentNode = walker.nextNode()) {
        const translateNode = grabNode(currentNode as Element | Text);
        if (translateNode) {
            result.push(translateNode);
            // Bỏ qua tất cả các nút con của nút đã được dịch
            walker.currentNode = currentNode.nextSibling || currentNode;
        }
    }
    return Array.from(new Set(result));;
}

// Trả về nút cha cuối cùng sẽ được dịch hoặc sai
export function grabNode(node: any): any {
    // Kiểm tra nút trống
    if (!node) return false;

    // Đối với nút Văn bản, hãy thử tìm nút cha có thể dịch được của nó
    if (node instanceof Text) {
        const parentOrSelf = findTranslatableParent(node);
        if (parentOrSelf && parentOrSelf !== node) {
            return parentOrSelf;
        }
        return false;
    }

    if (!node.tagName) return false;

    const curTag = node.tagName.toLowerCase();

    // 1. Lọc nhanh: bỏ qua các nút không cần dịch
    if (shouldSkipNode(node, curTag)) return false;

    // 2. Thích ứng đặc biệt: xử lý đặc biệt dựa trên tên miền
    const domainHandler = selectCompatFn[getMainDomain(location.href.split('?')[0])];
    if (domainHandler) {
        const result = domainHandler(node);
        // Nếu một đối tượng được trả về và thuộc tính bỏ qua là đúng thì nút sẽ bị bỏ qua.
        if (result && typeof result === 'object' && 'skip' in result && result.skip === true) {
            return false;
        }
        // Nếu giá trị trả về là một nút hoặc giá trị thực khác, hãy trả về giá trị đó dưới dạng nút dịch
        if (result) return result;
    }

    // 3. Dịch trực tiếp: các phần tử cấp khối
    if (directSet.has(curTag)) return node;

    // 4. Xử lý nút: Xử lý đặc biệt văn bản bên trong các nút
    if (isButton(node, curTag)) {
        handleButtonTranslation(node);
        return false;
    }

    // 5. Xử lý phần tử nội tuyến: Tìm kiếm nút cha phù hợp
    if (isInlineElement(node, curTag)) {
        return findTranslatableParent(node);
    }

    // 6. Xử lý dòng đầu tiên của văn bản: xử lý dòng văn bản đầu tiên của div và nhãn
    if (curTag === 'div' || curTag === 'label') {
        return handleFirstLineText(node);
    }

    return false;
}

// Kiểm tra xem có nên bỏ qua nút không
function shouldSkipNode(node: any, tag: string): boolean {
    // 1. Xác định xem nhãn có nằm trong SkipSet không
    // 2. Kiểm tra xem có lớp notranslate nào không
    // 3. Xác định xem nút có thể chỉnh sửa được không
    // 4. Xác định văn bản có quá dài không
    // 5. Xác định xem văn bản ở định dạng số thuần túy hay số chuẩn (chỉ bỏ qua nếu nội dung nút gần như hoàn toàn là số)
    return skipSet.has(tag) ||
        node.classList?.contains('notranslate') ||
        node.isContentEditable ||
        checkTextSize(node) ||
        isMainlyNumericContent(node);
}

// Kiểm tra độ dài văn bản
function checkTextSize(node: any): boolean {
    // 1. Nếu độ dài nội dung văn bản vượt quá 3072
    // 2. Hoặc nếu độ dài của externalHTML vượt quá 4096 thì được coi là quá dài.
    // 3. Ít hơn 3 ký tự
    return node.textContent.length > 3072 ||
        (node.outerHTML && node.outerHTML.length > 4096) ||
        node.textContent.length < 3;
}

// Kiểm tra xem nội dung nút có chủ yếu là số không
function isMainlyNumericContent(node: any): boolean {
    if (!node || !node.textContent) return false;
    
    const text = node.textContent.trim();
    if (!text) return false;
    
    // Bỏ qua nếu nội dung ngắn và ở định dạng số thuần túy
    // Đối với văn bản ngắn, trực tiếp xác định xem toàn bộ văn bản có ở định dạng kỹ thuật số hay không.
    if (text.length < 30 && isNumericContent(text)) return true;
    
    // Kiểm tra xem nó có ở định dạng tên người dùng hoặc userID không
    if (isUserIdentifier(text)) return true;
    
    // Để có nội dung dài hơn, hãy kiểm tra xem nội dung đó có chủ yếu ở định dạng kỹ thuật số không
    // Xử lý các tình huống trong đó một nút có thể chứa nhiều nút con văn bản
    // Điều này giúp xác định chính xác hơn phần kỹ thuật số của nội dung hỗn hợp
    const textNodes = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    let textNode;
    while (textNode = walker.nextNode()) {
        const nodeText = textNode.textContent?.trim() || '';
        if (nodeText) {
            textNodes.push(nodeText);
        }
    }
    
    // Nếu chỉ có một nút văn bản và đó là một số, bỏ qua dịch
    if (textNodes.length === 1 && isNumericContent(textNodes[0])) return true;
    
    // Bỏ qua bản dịch nếu tất cả các nút văn bản đều là số
    // Đây có thể là một cột số trong bảng hoặc danh sách số thuần túy, v.v.
    if (textNodes.length > 0 && textNodes.every(t => isNumericContent(t))) return true;
    
    // Nếu không thì đừng bỏ qua và cho phép dịch
    return false;
}

/**
 * Kiểm tra xem văn bản có phải là mã định danh người dùng hay không (tên người dùng, ID, v.v.)  */
function isUserIdentifier(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    const trimmedText = text.trim();
    
    // Kiểm tra xem nó có ở định dạng tên người dùng mạng xã hội không
    if (/^@\w+/.test(trimmedText)) return true;  // Định dạng Twitter: @tên người dùng
    if (/^u\/\w+/.test(trimmedText)) return true; // Định dạng Reddit: u/tên người dùng
    
    // Kiểm tra xem đó có phải là định dạng ID của x.com hay twitter.com không
    if (/^id@https?:\/\/(x\.com|twitter\.com)\/[\w-]+\/status\/\d+/.test(trimmedText)) return true;
    
    // Kiểm tra xem nó có chứa nội dung Tắt liên quan đến "TẮT NOTE" không
    if (/Tắt\u6ce8.*\w+/.test(trimmedText) || /Follow.*\w+/.test(trimmedText)) return true;
    
    // Kiểm tra xem tên người dùng có ở định dạng thuần túy hay không (kết hợp các chữ cái, số và dấu gạch dưới)
    if (/^[A-Za-z0-9_]{1,15}$/.test(trimmedText)) return true;
    
    // Định dạng đặc biệt: tên người dùng có hành động nhấp chuột
    if (/\u70b9\u51fb.*\w+/.test(trimmedText) && trimmedText.length < 50) return true;
    
    return false;
}

/**
 * Kiểm tra xem văn bản ở định dạng số thuần hay số chuẩn  * 
 * Nhận biết các dạng số sau:  * 1. Số nguyên (ví dụ: 12345, -123)  * 2. Các số có dấu phân cách hàng nghìn (ví dụ: 1.234.567)  * 3. Phạm vi số (ví dụ: 1-100, 5~10)  * 4. Số thập phân (ví dụ: 3.14159)  * 5. Phần trăm (ví dụ: 85%, -2,5%)  * 6. Ký hiệu khoa học (ví dụ: 1.23e+4)  * 7. Số tiền (ví dụ: $123,45, €100)  * 8. Các định dạng ngày phổ biến (ví dụ: 2023-01-01, 01/01/2023)  * 9. Định dạng thời gian (ví dụ: 13:45:30, 9:30)  * 10. Số phiên bản (ví dụ: 1.0.0, 2.3.5-beta)  * 11. Định dạng ID (ví dụ: id@x.com/user/status/123456789)  * 12. Định dạng tên người dùng (ví dụ: @username, Gunnrosesgirl3)  * 13. #Định dạng số  * 
 * Các số và mã định danh người dùng ở các định dạng này thường không cần dịch và trang sẽ dễ hiểu hơn nếu chúng được giữ nguyên.  */
function isNumericContent(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    // Loại bỏ các ký tự khoảng trắng
    const trimmedText = text.trim();
    if (!trimmedText) return false;

    // Trước tiên hãy kiểm tra xem đó có phải là mã định danh người dùng không
    if (isUserIdentifier(trimmedText)) return true;
    
    // Không được coi là nội dung thuần túy bằng số nếu nó chứa nhiều từ
    if (/\s+/.test(trimmedText.replace(/[\d,.\-%+]/g, ''))) return false;
    
    // Kiểm tra xem đó có phải là số thuần không
    if (/^-?\d+$/.test(trimmedText)) return true;
    
    // Kiểm tra định dạng số chuẩn: số có dấu phẩy (ví dụ: 1.234.567)
    if (/^-?(\d{1,3}(,\d{3})+)$/.test(trimmedText)) return true;
    
    // Kiểm tra xem đó có phải là số trong phạm vi không (ví dụ: 1-123)
    if (/^\d+\s*[-~]\s*\d+$/.test(trimmedText)) return true;
    
    // Kiểm tra nếu thập phân
    if (/^-?\d+\.\d+$/.test(trimmedText)) return true;
    
    // Kiểm tra xem đó có phải là tỷ lệ phần trăm không
    if (/^-?\d+(\.\d+)?%$/.test(trimmedText)) return true;
    
    // Kiểm tra xem nó có phải là ký hiệu khoa học không (ví dụ: 1.23e+4)
    if (/^-?\d+(\.\d+)?(e[-+]\d+)?$/i.test(trimmedText)) return true;
    
    // Kiểm tra xem đó có phải là số tiền có ký hiệu tiền tệ không (ví dụ: $123,45, €123, ¥123)
    if (/^[$€¥£₹₽₩]?\s*-?\d+(,\d{3})*(\.\d+)?$/.test(trimmedText)) return true;
    
    // Kiểm tra xem nó có ở định dạng ngày giờ không (chỉ xem xét các định dạng ngày số phổ biến)
    // Phù hợp với YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY, MM/DD/YYYY
    if (/^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{1,2})$/.test(trimmedText)) return true;
    
    // Định dạng thời gian phù hợp HH:MM:SS, HH:MM
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmedText)) return true;
    
    // Số phiên bản trùng khớp (ví dụ: 1.0.0, 2.3.5-beta)
    if (/^\d+(\.\d+){1,3}(-[a-zA-Z0-9]+)?$/.test(trimmedText)) return true;
    
    // Phù hợp với các định dạng ID phương tiện truyền thông xã hội
    if (/^id@https?:\/\/(x\.com|twitter\.com)\/[\w-]+\/status\/\d+/.test(trimmedText)) return true;
    
    // Khớp các định dạng ID số phổ biến
    if (/^ID[:：]?\s*\d+$/.test(trimmedText)) return true;
    if (/^No[\.:]?\s*\d+$/i.test(trimmedText)) return true;

    // #định dạng số
    if (/^#[\d]+$/.test(trimmedText)) return true;

    return false;
}

// Kiểm tra xem đó có phải là một nút không
function isButton(node: any, tag: string): boolean {
    // 1. Nếu nhãn hiện tại là nút
    // 2. Hoặc nếu nhãn hiện tại là span và nút cha của nó là nút thì nó được coi là một nút.
    return tag === 'button' ||
        (tag === 'span' && node.parentNode?.tagName.toLowerCase() === 'button');
}

// Xử lý dịch nút
function handleButtonTranslation(node: any): void {
    // 1. Nếu văn bản không trống, hãy gọi handBtnTranslation để dịch văn bản nút.
    if (node.textContent.trim()) {
        handleBtnTranslation(node);
    }
}

// Kiểm tra xem nó có phải là phần tử nội tuyến không
function isInlineElement(node: any, tag: string): boolean {
    // 1. Xác định xem nó có nằm trong inlineSet không
    // 2. Xác định xem đó có phải là nút văn bản không
    // 3. Kiểm tra xem các phần tử con có chứa các phần tử không cùng dòng hay không
    return inlineSet.has(tag) ||
        node.nodeType === Node.TEXT_NODE ||
        detectChildMeta(node);
}

// Tìm kiếm nút cha có thể dịch được
function findTranslatableParent(node: any): any {
    // 1. Gọi đệ quy GrabNode Search xem nút cha có thể dịch được không
    // 2. Nếu nút cha không thể dịch được, hãy trả về nút hiện tại
    const parentResult = grabNode(node.parentNode);
    return parentResult || node;
}

// Xử lý dòng văn bản đầu tiên
function handleFirstLineText(node: any): boolean {
    // 1. Duyệt qua các nút con và tìm nút văn bản đầu tiên
    // 2. Nếu có phiên bản Bản dịch có thể dịch được, hãy sử dụng browser.runtime.sendMessage để dịch nó.
    // 3. Sau khi dịch thành công, thay thế văn bản; khi xảy ra lỗi, in nhật ký lỗi
    let child = node.firstChild;
    while (child) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
            browser.runtime.sendMessage({
                context: document.title,
                origin: child.textContent
            })
                .then((text: string) => child.textContent = text)
                .catch((error: any) => console.error('Dịch thất bại:', error));
            return false;
        }
        child = child.nextSibling;
    }
    return false;
}

// Phát hiện xem phần tử con có chứa các phần tử khác ngoài thẻ đã chỉ định hay không
function detectChildMeta(parent: any): boolean {
    // 1. Kiểm tra từng nút con
    // 2. Nếu tìm thấy phần tử không cùng dòng, trả về false; mặt khác, trả về true nếu tất cả các lần kiểm tra đều đạt.
    let child = parent.firstChild;
    while (child) {
        if (child.nodeType === Node.ELEMENT_NODE && !inlineSet.has(child.nodeName.toLowerCase())) {
            return false;
        }
        child = child.nextSibling;
    }
    return true;
}

// Chỉ hiển thị bản dịch Lấy HTML chuẩn mà LLM sẽ dịch
export function LLMStandardHTML(node: any) {
    // 1. Khởi tạo chuỗi văn bản trống
    // 2. Duyệt qua các nút con
    // 3. Nếu là nút văn bản, hãy ghép nội dung văn bản của nó
    // 4. Nếu nó là một nút phần tử và nằm trong inlineSet, hãy ghép HTML bên ngoài của nó
    // 5. Ngược lại, tiếp tục xử lý đệ quy các nút con
    let text = "";
    node.childNodes.forEach((child: any) => {
        if (child.nodeType === Node.TEXT_NODE) {
            text += child.nodeValue;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            if (inlineSet.has(child.tagName.toLowerCase())) {
                text += child.outerHTML;
            } else {
                text += LLMStandardHTML(child);
            }
        }
    });
    return text;
}

export function beautyHTML(text: string): string {
    // 1. Đầu tiên hãy thay thế các từ phân biệt chữ hoa chữ thường trong SVG
    // 2. Sau đó sử dụng js-beautify để định dạng HTML
    text = replaceSensitiveWords(text);
    return html(text)
}

// Thay thế một số từ phân biệt chữ hoa chữ thường trong thẻ svg (html không phân biệt chữ hoa chữ thường, nhưng thẻ svg phân biệt chữ hoa chữ thường)
function replaceSensitiveWords(text: string): string {
    // 1. Sử dụng biểu thức chính quy để ghép các từ phân biệt chữ hoa chữ thường
    // 2. Thay thế từng cái một bằng dạng chữ hoa và chữ thường chính xác.
    return text.replace(/viewbox|preserveaspectratio|clippathunits|gradienttransform|patterncontentunits|lineargradient|clippath/gi, (match) => {
        switch (match.toLowerCase()) {
            case 'viewbox':
                return 'viewBox';
            case 'preserveaspectratio':
                return 'preserveAspectRatio';
            case 'clippathunits':
                return 'clipPathUnits';
            case 'gradienttransform':
                return 'gradientTransform';
            case 'patterncontentunits':
                return 'patternContentUnits';
            case 'lineargradient':
                return 'linearGradient';
            case 'clippath':
                return 'clipPath';
            default:
                return match;
        }
    });
}

// Xóa các kiểu cụ thể
export function checkAndRemoveStyle(node: any, styleProperty: any) {
    // 1. Nếu nút có kiểu và thuộc tính tương ứng không được xác định, hãy xóa thuộc tính
    if (node.style && node.style[styleProperty] !== undefined) {
        node.style[styleProperty] = '';
    }
}

// Loại bỏ kiểu cắt ngắn
export function smashTruncationStyle(node: any) {
    // 1. Đầu tiên gọi checkAndRemoveStyle để xóa thuộc tính webkitLineClamp
    // 2. Đặt kiểu Tắt tương đối của nút thành 'unset'
    checkAndRemoveStyle(node, 'webkitLineClamp');
    node.style.webkitLineClamp = 'unset';
    node.style.maxHeight = 'unset';
}
