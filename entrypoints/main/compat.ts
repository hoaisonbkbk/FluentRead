// Tương thích với cấu trúc DOM độc đáo của một số trang web

import {findMatchingElement} from "@/entrypoints/utils/common";

type ReplaceFunction = (node: any, text: any) => any;
type SelectFunction = (node: any) => any | {skip: boolean} | false;

const parser = new DOMParser();

// Gỡ lỗi liên quan
const isDev = process.env.NODE_ENV === 'development';

/**
 * Chức năng ghi nhật ký gỡ lỗi, chỉ xuất ở chế độ phát triển
 * @param loại nhật ký loại
 * Tin nhắn nhật ký tin nhắn @param
 * @param ... tham số nhật ký args
 */
function debugLog(type: string, message: string, ...args: any[]): void {
  if (!isDev) return;

  // Đặt màu khác nhau cho các loại khác nhau
  const colors: {[key: string]: string} = {
    'Twitter': 'color: #1DA1F2; font-weight: bold',
    'GitHub': 'color: #6e5494; font-weight: bold',
    'StackOverflow': 'color: #f48024; font-weight: bold',
    'Reddit': 'color: #FF4500; font-weight: bold',
    'Medium': 'color: #00ab6c; font-weight: bold',
    'YouTube': 'color: #FF0000; font-weight: bold',  // Thêm màu YouTube
    'Compat': 'color: #0366d6; font-weight: bold',
    'Skip': 'color: #d73a49; font-weight: bold',
    'Content': 'color: #28a745; font-weight: bold',
    'Default': 'color: #24292e; font-weight: bold'
  };
  
  const color = colors[type] || colors['Default'];
  const prefix = `%c[FluentRead][${type}]`;
  
  // Xác định xem có cần nhóm hay không dựa trên loại nhật ký
  if (['Content', 'Skip', 'YouTube', 'GitHub', 'Twitter'].includes(type) && args.length > 0) {
    // Sử dụng nhóm gấp để giảm nhiễu trực quan trong nhật ký
    console.groupCollapsed(prefix, color, message);
    args.forEach((arg, index) => {
      if (typeof arg === 'string') {
        console.log(`Tham số ${index + 1}:`, arg.substring(0, 100) + (arg.length > 100 ? '...' : ''));
      } else {
        console.log(`Tham số ${index + 1}:`, arg);
      }
    });
    console.groupEnd();
  } else {
    // Đầu ra nhật ký chung
    console.log(prefix, color, message, ...args);
  }
}

interface ReplaceCompatFn {
    [domain: string]: ReplaceFunction;
}

interface SelectCompatFn {
    [domain: string]: SelectFunction;
}

// Lấy tên miền chính theo url.host của trình duyệt
export function getMainDomain(url: any) {
    try {
        // Xử lý các đối tượng hoặc chuỗi URL
        let hostname = '';
        
        // Nếu là chuỗi URL thì trích xuất phần tên máy chủ
        if (typeof url === 'string') {
            // Xóa phần thỏa thuận
            const noProtocol = url.replace(/^(https?:\/\/)/, '');
            // Trích xuất phần tên miền (xóa đường dẫn và tham số truy vấn)
            hostname = noProtocol.split('/')[0];
        } else if (url instanceof URL) {
            hostname = url.hostname;
        } else {
            return '';
        }
        
        // Xử lý các tình huống đặc biệt: Thống nhất tên miền cũ và tên miền mới của Twitter
        if (hostname === 'twitter.com' || hostname === 'x.com' || 
            hostname === 'www.twitter.com' || hostname === 'www.x.com') {
            return 'x.com';
        }
        
        // Xóa tiền tố www có thể
        hostname = hostname.replace(/^www\./, '');
        
        // Trích xuất tên miền cơ sở
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            // Đối với các tên miền cấp 2 phổ biến (chẳng hạn như co.uk), cần phải có cách xử lý đặc biệt
            if (parts.length >= 3 && 
                ((parts[parts.length-2] === 'co' || parts[parts.length-2] === 'com') && 
                 parts[parts.length-1].length === 2)) {
                // Ví dụ: example.co.uk sẽ trả về example.co.uk
                return parts.slice(-3).join('.');
            } else {
                // Ngược lại trả về tên miền chính và tên miền cấp cao nhất
                return parts.slice(-2).join('.');
            }
        }
        
        return hostname;
    } catch (error) {
        console.error('getMainDomain error:', error);
        return '';
    }
}

/**
 * Kiểm tra nội dung văn bản có phải là nội dung đặc biệt không nên dịch
 * Ví dụ: URL, địa chỉ email, tên người dùng, đoạn mã, v.v.
 */
function isSpecialContent(text: string): boolean {
    if (!text) return false;
    
    const trimmedText = text.trim();
    
    // Kiểm tra xem đó có phải là URL không
    if (/^https?:\/\/\S+/i.test(trimmedText)) return true;
    
    // Kiểm tra xem đó có phải là địa chỉ email không
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedText)) return true;
    
    // Kiểm tra xem nó có ở định dạng tên người dùng mạng xã hội không
    if (/^@\w+$/.test(trimmedText)) return true;      // Định dạng Twitter: @tên người dùng
    if (/^u\/\w+$/.test(trimmedText)) return true;    // Định dạng Reddit: u/tên người dùng
    
    // Kiểm tra xem đó có phải là định dạng ID của x.com hay twitter.com không
    if (/^id@https?:\/\/(x\.com|twitter\.com)\/[\w-]+\/status\/\d+/.test(trimmedText)) return true;
    
    // Kiểm tra xem đó có phải là nội dung đặc biệt liên quan đến GitHub không
    // Vấn đề GitHub hoặc số PR
    if (/^#\d+$/.test(trimmedText)) return true;
    // Người dùng tham chiếu kho lưu trữ GitHub/repo#123
    if (/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+#\d+$/.test(trimmedText)) return true;
    // Đường dẫn tệp GitHub
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/(blob|tree)\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-\/]+$/.test(trimmedText)) return true;
    // Hàm băm cam kết GitHub
    if (/^[a-f0-9]{7,40}$/.test(trimmedText)) return true;
    // Tên tệp bắt đầu bằng .
    if (/^\.[a-zA-Z0-9_.-]+$/.test(trimmedText)) return true;
    // kết thúc bằng hậu tố tập tin
    if (/^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9_.-]+$/.test(trimmedText)) return true;

    // Kiểm tra xem có phải là đoạn mã không (đánh giá đơn giản, có thể có phán đoán sai)
    if (/^[a-zA-Z0-9_]+\([^)]*\)/.test(trimmedText)) return true;  // gọi hàm
    if (/^import\s+|^from\s+|^require\(/.test(trimmedText)) return true;  // báo cáo nhập khẩu
    if (/^const\s+|^let\s+|^var\s+|^function\s+/.test(trimmedText)) return true;  // Khai báo biến/hàm
    
    // Kiểm tra xem đó có phải là giá trị băm hay mã định danh đặc biệt khác không
    if (/^[a-f0-9]{8,}$/i.test(trimmedText)) return true;
    
    return false;
}

// Chức năng tương thích của liên kết thay thế văn bản, tên miền chính: chức năng tương thích
export const replaceCompatFn: ReplaceCompatFn = {
    ["youtube.com"]: (node: any, text: any) => {
        // Phân tích cú pháp HTML đã dịch bằng DOMParser
        const doc = parser.parseFromString(text, 'text/html');
        const newNode = doc.body.firstChild as HTMLElement;
        
        // Xử lý đặc biệt các chuỗi định dạng dành riêng cho YouTube
        if (node.tagName.toLowerCase() === 'yt-formatted-string') {
            // Cố gắng giữ lại các thuộc tính và kiểu dáng ban đầu
            if (node.hasAttribute('has-link-only_')) {
                node.innerHTML = newNode.innerHTML;
                return;
            }
            
            // Xử lý nội dung với các định dạng đặc biệt
            if (node.querySelector('a') || node.querySelector('span')) {
                // Cố gắng giữ lại các liên kết và định dạng nhưng cập nhật nội dung văn bản
                const links = node.querySelectorAll('a');
                const spans = node.querySelectorAll('span');
                
                if (links.length > 0 || spans.length > 0) {
                    // Tạo phần tử tạm thời để lưu trữ văn bản mới
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newNode.innerHTML;
                    
                    // Giữ nguyên các liên kết và thành phần định dạng ban đầu
                    node.childNodes.forEach((child: Node) => {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                            // Giữ các phần tử HTML gốc
                            if (child.nodeName.toLowerCase() === 'a' || child.nodeName.toLowerCase() === 'span') {
                                // Cập nhật nội dung phần tử nhưng giữ lại thuộc tính
                                (child as HTMLElement).textContent = tempDiv.textContent || '';
                            }
                        }
                    });
                    return;
                }
            }
        }
        
        // Xử lý mặc định: thay thế trực tiếp bên trongHTML
        node.innerHTML = newNode.innerHTML;
    }
};

// Chức năng tương thích của liên kết chọn nút phần tử
export const selectCompatFn: SelectCompatFn = {
    ["mvnrepository.com"]: (node: any) => {
        if (node.tagName.toLowerCase() === 'div' && node.classList.contains('im-description')) return node
    },
    ["aozora.gr.jp"]: (node: any) => {
        if (node.tagName.toLowerCase() === 'div' && node.classList.contains('main_text')) return node
    },
    ["youtube.com"]: (node: any) => {
        // Kiểm tra xem nút có nên được bỏ qua không
        if (shouldSkipYouTubeElement(node)) {
            debugLog('Compat', 'Bỏ qua các phần tử YouTube:', node.textContent);
            return { skip: true };
        }
        
        // tiêu đề video
        const videoTitle = findMatchingElement(node, 'h1.title');
        if (videoTitle) {
            debugLog('YouTube', 'Dịch tiêu đề video', videoTitle.textContent);
            return videoTitle;
        }
        
        // Mô tả video
        const videoDescription = findMatchingElement(node, 'div#description-inline-expander');
        if (videoDescription) {
            debugLog('YouTube', 'Dịch mô tả video', videoDescription.textContent?.substring(0, 50) + '...');
            return videoDescription;
        }
        
        // Nội dung bình luận
        const commentContent = findMatchingElement(node, 'yt-formatted-string#content-text');
        if (commentContent) {
            debugLog('YouTube', 'Dịch nội dung đánh giá', commentContent.textContent);
            return commentContent;
        }
        
        // Giới thiệu kênh
        const channelDescription = findMatchingElement(node, 'div#description');
        if (channelDescription) {
            debugLog('YouTube', 'Giới thiệu kênh dịch', channelDescription.textContent?.substring(0, 50) + '...');
            return channelDescription;
        }

        // Mô tả danh sách phát
        const playlistDescription = findMatchingElement(node, 'yt-formatted-string.ytd-playlist-panel-renderer');
        if (playlistDescription) {
            debugLog('YouTube', 'Dịch mô tả danh sách phát', playlistDescription.textContent);
            return playlistDescription;
        }
        
        // Tiêu đề thẻ video
        const videoCardTitle = findMatchingElement(node, 'yt-formatted-string.ytd-compact-video-renderer');
        if (videoCardTitle) {
            debugLog('YouTube', 'Dịch tiêu đề card màn hình', videoCardTitle.textContent);
            return videoCardTitle;
        }
        
        // Nội dung bài đăng của cộng đồng
        const communityPost = findMatchingElement(node, 'div#content');
        if (communityPost && communityPost.closest('ytd-backstage-post-renderer')) {
            debugLog('YouTube', 'Dịch bài đăng trên cộng đồng', communityPost.textContent?.substring(0, 50) + '...');
            return communityPost;
        }
        
        // nội dung phụ đề
        const captionText = findMatchingElement(node, 'span.captions-text');
        if (captionText) {
            debugLog('YouTube', 'Dịch nội dung phụ đề', captionText.textContent);
            return captionText;
        }
        
        // Văn bản thông tin video - xử lý chuỗi được định dạng chung
        if (node.tagName.toLowerCase() === 'yt-formatted-string' && 
            node.textContent?.trim() &&
            node.textContent.length > 5) {
            // Kiểm tra xem nó có nằm trong nút hoặc vùng điều khiển không
            let isInControl = false;
            let parent = node.parentElement;
            while (parent) {
                if (parent.id === 'top-level-buttons-computed' || 
                    parent.id === 'subscribe-button' || 
                    parent.classList?.contains('ytd-menu-renderer')) {
                    isInControl = true;
                    break;
                }
                parent = parent.parentElement;
            }
            
            if (!isInControl) {
                debugLog('YouTube', 'Dịch các chuỗi được định dạng', node.textContent);
                return node;
            }
        }
        
        // Không được dịch theo mặc định
        return false;
    },
    ['webtrees.net']: (node: any) => {
        // class='kmsg'
        if (node.tagName.toLowerCase() === 'div' && node.classList.contains('kmsg')) return node
    },
    ['x.com']: (node: any) => {
        // Trước tiên bạn cần kiểm tra xem đó có phải là phần tử nên bỏ qua không
        if (shouldSkipTwitterElement(node)) {
            // Ghi nhật ký các phần tử Twitter bị bỏ qua trong chế độ phát triển
            debugLog('Compat', 'Bỏ qua các yếu tố Twitter:', node.textContent);
            return { skip: true };
        }
        
        // Hồ sơ
        const userDescription = findMatchingElement(node, 'div[data-testid="UserDescription"]'); 
        if (userDescription) return userDescription;
        
        // Nội dung của tweet - nhưng không đề cập đến tên người dùng
        const tweetText = findMatchingElement(node, 'div[data-testid="tweetText"]');
        if (tweetText) return tweetText;
        
        // Nội dung bình luận
        const reply = findMatchingElement(node, 'div[role="group"] div[lang]');
        if (reply) return reply;
        
        // Trang chủ Dòng thời gian Bài viết
        const timelineCell = findMatchingElement(node, 'div[data-testid="cellInnerDiv"] div[lang]');
        if (timelineCell) return timelineCell;

        // Trả về thành phần nội dung chính cần dịch
        const tweetContent = findMatchingElement(node, 'article div[lang]');
        if (tweetContent) return tweetContent;
        
        // Trả về sai theo mặc định, biểu thị không có bản dịch
        return false;
    },
    ['github.com']: (node: any) => {
        // Xác định xem nút có nên được bỏ qua hay không
        if (shouldSkipGitHubElement(node)) {
            return { skip: true };
        }
        
        // Kiểm tra xem nó có phải là nút thư mục không
        if (isGitHubPathOrFileName(node)) {
            debugLog('GitHub', 'Bỏ qua thư mục/tên tập tin', node.textContent);
            return { skip: true };
        }
        
        // Dịch nội dung văn bản quan trọng nhất trước
        
        // Vấn đề và nội dung PR
        const issueBody = findMatchingElement(node, 'div.comment-body');
        if (issueBody) return issueBody;
        
        // Nội dung bình luận
        const comment = findMatchingElement(node, 'div.comment-body td.comment-body');
        if (comment) return comment;
        
        // Sau đó dịch nội dung ít quan trọng hơn nhưng vẫn quan trọng
        
        // Tiêu đề vấn đề
        const issueTitle = findMatchingElement(node, 'div.js-issue-title');
        if (issueTitle) return issueTitle;
        
        // Mô tả PR
        const prDescription = findMatchingElement(node, 'div.pull-request-review-comment');
        if (prDescription) return prDescription;
        
        // Mô tả kho hàng
        const repoDescription = findMatchingElement(node, 'p.f4.my-3');
        if (repoDescription) return repoDescription;
        
        // Thông tin gửi mã
        const commitMessage = findMatchingElement(node, 'div.commit-desc pre');
        if (commitMessage) return commitMessage;
        
        // Văn bản Giới thiệu (Giới thiệu) về Dự án
        const aboutText = findMatchingElement(node, 'div.BorderGrid-cell > p');
        if (aboutText) return aboutText;
        
        // Cuối cùng dịch các nội dung phụ trợ khác
        
        // Thông tin trạng thái PR
        const prStatus = findMatchingElement(node, 'div.merge-status-item span.status-meta');
        if (prStatus) return prStatus;
        
        // Mô tả ngôn ngữ dự án
        const languageDesc = findMatchingElement(node, 'div.f6.color-fg-muted.mt-2');
        if (languageDesc) return languageDesc;
        
        // Hồ sơ
        const profile = findMatchingElement(node, 'div.p-note.user-profile-bio');
        if (profile) return profile;
        
        // Mô tả mục danh sách kho
        const repoListDesc = findMatchingElement(node, 'p.pinned-item-desc');
        if (repoListDesc) return repoListDesc;
        
        // Nhật ký chạy hành động
        const actionLog = findMatchingElement(node, 'div.js-log-container pre');
        if (actionLog) return actionLog;
        
        // Không được dịch theo mặc định
        return false;
    },
    ['stackoverflow.com']: (node: any) => {
        // Xác định xem nút có nên được bỏ qua hay không
        if (shouldSkipStackOverflowElement(node)) {
            return { skip: true };
        }
        
        // Dịch nội dung quan trọng nhất trước
        
        
        // Sau đó dịch nội dung ít quan trọng hơn nhưng vẫn quan trọng
        
        // Tiêu đề câu hỏi
        const questionTitle = findMatchingElement(node, 'h1.question-hyperlink');
        if (questionTitle) return questionTitle;
        
        // Tóm tắt mô tả vấn đề
        const excerpt = findMatchingElement(node, 'div.excerpt');
        if (excerpt) return excerpt;
        
        // Cuối cùng dịch các nội dung phụ trợ khác
        
        // Lời nhắc trạng thái sự cố
        const status = findMatchingElement(node, 'div.question-status');
        if (status) return status;
        
        // Hồ sơ người dùng
        const userProfile = findMatchingElement(node, 'div.profile-about');
        if (userProfile) return userProfile;
        
        // Thông báo lỗi
        const errorMessage = findMatchingElement(node, 'div.s-notice');
        if (errorMessage) return errorMessage;
        
        // Không được dịch theo mặc định
        return false;
    },
    ['medium.com']: (node: any) => {
        // Xác định xem nút có nên được bỏ qua hay không
        if (shouldSkipMediumElement(node)) {
            return { skip: true };
        }
        
        // Tiêu đề bài viết
        const articleTitle = findMatchingElement(node, 'h1');
        if (articleTitle) return articleTitle;
        
        // Phụ đề bài viết
        const articleSubtitle = findMatchingElement(node, 'h2');
        if (articleSubtitle) return articleSubtitle;
        
        // Đoạn văn
        const articleParagraph = findMatchingElement(node, 'p');
        if (articleParagraph) return articleParagraph;
        
        // Mục danh sách bài viết
        const articleListItem = findMatchingElement(node, 'li');
        if (articleListItem) return articleListItem;
        
        // Trích dẫn nội dung
        const blockquote = findMatchingElement(node, 'blockquote');
        if (blockquote) return blockquote;
        
        // Thùng đựng vật phẩm
        const articleBody = findMatchingElement(node, 'article section');
        if (articleBody) return articleBody;
        
        // Về tác giả
        const authorBio = findMatchingElement(node, 'p.pw-author-note');
        if (authorBio) return authorBio;
        
        // Nội dung bình luận
        const comment = findMatchingElement(node, 'div.pw-responses-thread p');
        if (comment) return comment;
        
        // Không được dịch theo mặc định
        return false;
    },
    ['reddit.com']: (node: any) => {
        // Xác định xem nút có nên được bỏ qua hay không
        if (shouldSkipRedditElement(node)) {
            debugLog('Reddit', 'Bỏ qua các phần tử Reddit', node.textContent);
            return { skip: true };
        }
        
        // Tiêu đề bài viết
        const postTitle = findMatchingElement(node, 'h1, h3[data-click-id="body"]');
        if (postTitle) {
            debugLog('Reddit', 'Dịch tiêu đề bài viết', postTitle.textContent);
            return postTitle;
        }
        
        // văn bản mô tả
        const description = findMatchingElement(node, 'div.community-details-heading p, div.community-details p, div.wiki-page-content, div[data-click-id="text"]');
        if (description) {
            debugLog('Reddit', 'Dịch văn bản mô tả', description.textContent?.substring(0, 50) + '...');
            return description;
        }
        
        // nội dung Wiki
        const wikiContent = findMatchingElement(node, 'div.md-container div.md, div.md');
        if (wikiContent) {
            debugLog('Reddit', 'Dịch nội dung wiki', wikiContent.textContent?.substring(0, 50) + '...');
            return wikiContent;
        }
        
        // mô tả cộng đồng
        const communityDescription = findMatchingElement(node, 'div[data-click-id="about"] h2, div[data-redditstyle="true"] h2');
        if (communityDescription) {
            debugLog('Reddit', 'Mô tả cộng đồng dịch thuật', communityDescription.textContent);
            return communityDescription;
        }
        
        // quy tắc cộng đồng
        const communityRules = findMatchingElement(node, 'div.rules-list div.rule-item div.rule-item-body, div.rule-item p');
        if (communityRules) {
            debugLog('Reddit', 'Nội quy cộng đồng dịch thuật', communityRules.textContent);
            return communityRules;
        }
        
        // Nội dung bưu thiếp
        const postCard = findMatchingElement(node, 'div[data-testid="post-title"], div.Post h3');
        if (postCard) {
            debugLog('Reddit', 'Dịch bưu thiếp', postCard.textContent);
            return postCard;
        }
        
        // Nội dung thông báo
        const announcement = findMatchingElement(node, 'div[data-testid="content"], div.announcement');
        if (announcement) {
            debugLog('Reddit', 'Dịch nội dung thông báo', announcement.textContent?.substring(0, 50) + '...');
            return announcement;
        }
        
        // Không được dịch theo mặc định
        return false;
    },
    ['news.ycombinator.com']: (node: any) => {
        // Xác định xem nút có nên được bỏ qua hay không
        if (shouldSkipHNElement(node)) {
            return { skip: true };
        }
        
        // Tiêu đề bài viết
        const storyTitle = findMatchingElement(node, 'td.title a.titlelink');
        if (storyTitle) return storyTitle;
        
        // Nội dung bình luận
        const comment = findMatchingElement(node, 'div.comment span.commtext');
        if (comment) return comment;
        
        // Đăng văn bản
        const storyText = findMatchingElement(node, 'div.toptext');
        if (storyText) return storyText;
        
        // Hồ sơ người dùng
        const userAbout = findMatchingElement(node, 'td.default');
        if (userAbout) return userAbout;
        
        // Không được dịch theo mặc định
        return false;
    }
}

/**
 * Xác định xem có nên bỏ qua một yếu tố cụ thể trên trang web Twitter hay không
 */
function shouldSkipTwitterElement(node: any): boolean {
    // Kiểm tra xem đó có phải là nội dung đặc biệt không (URL, email, tên người dùng, v.v.)
    if (node.textContent && isSpecialContent(node.textContent)) {
        debugLog('Twitter', 'nội dung đặc biệt', node.textContent);
        return true;
    }

    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Điều hướng thanh bên
        // 'nav[aria-label="Primary"]',
        'div[data-testid="sidebarColumn"]',
        // thanh xu hướng
        'div[aria-label="Timeline: Trending now"]',
        'aside[aria-label="Who to follow"]',
        // thanh tìm kiếm
        'div[data-testid="SearchBox_Search_Input"]',
        // Các nút và thành phần UI khác nhau
        'div[role="button"]',
        'div[data-testid="BottomBar"]',
        // Khu vực đăng hành động chưa được mở rộng
        'div[role="group"][aria-label]',
        // Đề nghị chú ý
        'div[data-testid="suggestedUserHover"]',
        // Các biểu tượng và nút hành động khác nhau
        'div[aria-label*="icon"]',
        'div[data-testid*="icon"]',
        // Thanh ứng dụng hàng đầu
        'header[role="banner"]',
        // bộ đếm giới hạn từ
        'div[data-testid="characterCount"]',
        // Tên người dùng liên quan
        'div[data-testid="User-Name"]',
        'div[data-testid="UserName"]',
        'span[data-testid="tweetText"] span.r-bcqeeo',
        // ID người dùng và tên người dùng liên quan
        'div[data-testid="HoverCard"]',
        'div[data-testid="UserCell"]',
        'a[role="link"][href*="/status/"]',
        // nút theo dõi
        'div[role="button"][data-testid="follow"]',
        'div[role="button"][data-testid="unfollow"]',
        // Phần tử chứa văn bản "Theo dõi"
        'div[dir="auto"][id^="id__"]'
    ];

    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) {
            debugLog('Twitter', 'bỏ qua kết quả chọn', selector, node.textContent);
            return true;
        }
    }
    
    // Kiểm tra tên lớp, thuộc tính và các đặc điểm khác của nút
    const nodeTag = node.tagName?.toLowerCase();
    if (nodeTag === 'svg' || nodeTag === 'path' || nodeTag === 'g') {
        debugLog('Twitter', 'Các phần tử SVG bị bỏ qua', node.textContent);
        return true;
    }

    // Kiểm tra xem đó có phải là văn bản nút hành động không (như, tweet lại, bình luận, v.v.)
    if (node.textContent?.trim().match(/^(\d+|Like|Reply|Retweet|Share)$/)) {
        debugLog('Twitter', 'Nút hành động bỏ qua', node.textContent);
        return true;
    }
    
    // Kiểm tra xem đó là tên người dùng hay userid
    const textContent = node.textContent?.trim();
    if (textContent) {
        // Kiểm tra xem nó có ở định dạng tên người dùng không
        if (textContent.startsWith('@')) {
            debugLog('Twitter', 'bỏ qua tên người dùng', node.textContent);
            return true;
        }
        
        // Kiểm tra xem nó có ở định dạng ID người dùng không 
        if (textContent.startsWith('id@')) {
            debugLog('Twitter', 'ID người dùng bị bỏ qua', node.textContent);
            return true;
        }
        
        // Kiểm tra xem từ "chú ý" có được bao gồm không
        if (textContent.includes('\u5173\u6ce8') || textContent.includes('Follow')) {
            debugLog('Twitter', 'nút theo dõi bỏ qua', node.textContent);
            return true;
        }
        
        // Kiểm tra xem đó có phải là thẻ tên người dùng Twitter không
        if (/^([A-Za-z0-9_]{1,15})$/.test(textContent)) {
            debugLog('Twitter', 'Thẻ tên người dùng bị bỏ qua', node.textContent);
            return true;
        }
    }
    
    // Kiểm tra tên lớp thành phần giao diện người dùng Twitter phổ biến
    const classList = node.classList;
    if (classList) {
        // Tiền tố tên lớp UI thường được sử dụng trên Twitter
        for (const className of classList) {
            if (className.startsWith('r-') || className.startsWith('css-')) {
                // Kiểm tra thêm xem nội dung nút có phải là thành phần UI thuần túy hay không
                const text = node.textContent?.trim();
                if (!text || text.length < 10) {
                    debugLog('Twitter', 'Các thành phần giao diện người dùng bị bỏ qua', node.textContent);
                    return true;
                }
            }
        }
    }
    
    // Kiểm tra thuộc tính ID
    if (node.id && node.id.startsWith('id__')) {
        debugLog('Twitter', 'Thuộc tính ID bị bỏ qua', node.textContent);
        return true;
    }
    
    return false;
}

/**
 * Xác định xem có nên bỏ qua các thành phần cụ thể trên trang GitHub hay không
 */
function shouldSkipGitHubElement(node: any): boolean {
    // Kiểm tra xem đó có phải là nội dung đặc biệt không (URL, email, tên người dùng, v.v.)
    if (node.textContent && isSpecialContent(node.textContent)) {
        debugLog('GitHub', 'Nội dung đặc biệt bị bỏ qua', node.textContent);
        return true;
    }
    
    // Xác định xem đó là tên thư mục hay đường dẫn
    if (isGitHubPathOrFileName(node)) {
        debugLog('GitHub', 'Bỏ qua thư mục/tên tập tin', node.textContent);
        return true;
    }
    
    // Kiểm tra xem văn bản thẻ cụ thể của GitHub
    const gitHubLabels = [
        'bug', 'feature', 'enhancement', 'documentation', 'duplicate', 'good first issue',
        'help wanted', 'invalid', 'question', 'wontfix', 'dependencies', 'security',
        'enhancement', 'open', 'closed', 'merged', 'draft', 'done', 'in progress',
        'pending', 'fixed', 'resolved', 'won\'t fix', 'needs review', 'approved',
        'blocked', 'stale', 'needs work', 'ready for review', 'needs more information',
        'enhancement', 'frontend', 'backend', 'api', 'ui', 'ux', 'refactor', 'test',
        'needs tests', 'ready for work', 'wip', 'top priority', 'low priority', 'medium priority',
        'high priority', 'work in progress', 'needs investigation', 'feature request',
        'discussion', 'breaking change', 'needs triage'
    ];
    
    // Văn bản trạng thái GitHub
    const gitHubStatusTexts = [
        'Open', 'Closed', 'Merged', 'Draft', 'Pending', 'Approved',
        'Changes requested', 'Review required', 'Needs work', 'Ready for review',
        'Assignee', 'Author', 'Changed', 'Comments', 'Commits', 'Conversation',
        'Files changed', 'Participants', 'Reviewers', 'Unresolved conversations',
        'View changes', 'Clone', 'Code', 'Contributors', 'Raw', 'Blame', 'History',
        'is:issue', 'is:pr', 'is:open', 'is:closed', 'state:open', 'state:closed',
        'No wrap', 'Soft wrap', 'Set status'
    ];
    
    // Bỏ qua bản dịch nếu văn bản nút là nhãn GitHub hoặc văn bản trạng thái
    if (node.textContent) {
        const text = node.textContent.trim();
        
        // Kiểm tra xem đó có phải là văn bản Nhãn GitHub không
        for (const label of gitHubLabels) {
            if (text.toLowerCase() === label.toLowerCase()) {
                debugLog('GitHub', 'Nhãn GitHubBỏ qua', text);
                return true;
            }
        }
        
        // Kiểm tra xem văn bản trạng thái GitHub
        for (const status of gitHubStatusTexts) {
            if (text === status) {
                debugLog('GitHub', 'Văn bản trạng thái GitHub bị bỏ qua', text);
                return true;
            }
        }
        
        // Kiểm tra xem cú pháp bộ lọc tìm kiếm
        if (/^([a-z]+):([a-z]+)(\s+([a-z]+):([a-z]+))*$/.test(text)) {
            debugLog('GitHub', 'Bỏ qua cú pháp bộ lọc tìm kiếm', text);
            return true;
        }
        
        // Kiểm tra xem đó là số phiên bản hay số liệu thống kê
        if (/^v?\d+\.\d+(\.\d+)?(-[a-z0-9.]+)?$/.test(text) || 
            /^\d+\s+(issues|pull requests|commits|stars|forks|watching)$/.test(text.toLowerCase())) {
            debugLog('GitHub', 'Số phiên bản hoặc số liệu thống kê bị bỏ qua', text);
            return true;
        }
    }
    
    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Thanh điều hướng và menu
        'header.Header',
        'nav.js-repo-nav',
        'nav.menu',
        // thanh bên
        'div.Layout-sidebar',
        // phần tử biểu mẫu
        'form',
        'input',
        'textarea',
        'button',
        // Khối mã và các phần tử liên quan
        'pre.highlight',
        'code',
        'table.highlight',
        'table.diff-table',
        // Phân trang và bộ lọc
        'div.pagination',
        'div.subnav',
        // Khu vực nút thao tác
        'div.file-header',
        'div.file-actions',
        // Biểu đồ đóng góp
        'div.js-calendar-graph',
        // Khu vực thông tin thống kê
        'ul.repository-lang-stats-numbers',
        // văn bản nút
        'summary',
        'span.Counter',
        'div.controls',
        'span.js-hidden-pane-button',
        // cây tập tin
        'div.js-details-container Details',
        'div.Box-row',
        // Tên tập tin thư mục liên quan
        'div.react-directory-filename-column',
        'div.react-directory-filename-cell',
        'div.react-directory-truncate',
        'div[class*="directory-"]', // Khớp tất cả các tên lớp có chứa thư mục-
        'a[title][aria-label*="Directory"]',
        'a[title][aria-label*="File"]',
        // đáy
        'footer',
        // Tên người dùng liên quan
        'a.author',
        'span.author',
        'a.user-mention',
        'a.commit-author',
        // Kéo các phần tử liên quan đến Yêu cầu và Vấn đề
        'div.merge-status-list',
        'div.js-navigation-container',
        'span.State', // Nhãn trạng thái PR
        'div.TimelineItem-badge',
        'div.color-fg-muted', // Văn bản nhắc nhở màu xám
        'div.Box-header',
        'div.js-details-container', // Vùng chứa chi tiết đã thu gọn
        'span.Link--secondary', // Văn bản liên kết phụ
        // Siêu dữ liệu kho
        'div.BorderGrid-row',
        
        // Thống kê kho và vật dụng
        '.repo-language-color', // Chỉ báo màu ngôn ngữ
        'a.topic-tag', // Thẻ bắt đầu bằng #
        'span.d-inline-block.mr-3', // Khối thống kê nội tuyến
        'a.Link--muted', // liên kết phụ
        'span.no-wrap', // Văn bản không ngắt dòng (thường là số liệu thống kê)
        '.octicon', // biểu tượng
        'a.Link--primary > svg.octicon', // Các biểu tượng trong liên kết chính
        'div.d-flex', // Vùng chứa bố cục linh hoạt (thường được sử dụng để thống kê)
        'div.repo-and-owner', // Thông tin kho và chủ sở hữu
        
        // Khu vực trên cùng của kho
        'nav.js-repo-nav',
        'h1.flex-auto', // Tiêu đề
        'div.pagehead', // Tiêu đề trang
        'div.pagehead-actions', // Khu vực hoạt động tiêu đề trang
        'div.f4.mt-3', // mô tả chính
        'h2#files', // tiêu đề danh sách tập tin
        
        // phần tử vùng đáy
        'div.commit-tease', // Gửi bản xem trước thông tin
        'div.file-wrap', // trình bao bọc tập tin
        'ul.repository-lang-stats-numbers', // thống kê ngôn ngữ
        
        // Bộ đếm và nhãn thống kê
        'span.Counter', // quầy tính tiền
        'a.UnderlineNav-item', // Các mục được gạch chân trong điều hướng
        'span[data-view-component="true"]', // xem thành phần
        'span.color-fg-muted', // văn bản màu xám
        'span.text-bold', // văn bản in đậm
        
        // Khu vực điều hướng vấn đề/PR
        'div.tabnav', // Điều hướng thẻ
        'div.tabnav-tabs', // Thẻ điều hướng thẻ
        'div.table-list-header-toggle', // Chuyển đổi tiêu đề cột của bảng
        
        // Khu vực hoạt động
        'div.Box-header',
        'div.TimelineItem-badge',
        
        // Khu vực quản lý và xuất bản gói
        'div.package-list', // Danh sách gói hàng
        'div.release-entry', // Đăng một mục
        
        // Các thành phần chung
        'span.Label', // gắn thẻ
        'span.State', // chỉ báo trạng thái
        'a.social-count', // số lượng xã hội
        'a.pl-3', // Liên kết có phần đệm bên trái
        'div[role="grid"]', // div cho vai trò lưới
        'div.flash', // thông báo chớp nhoáng
        
        // Thẻ thông tin kho hàng
        'div.Box-row--gray', // hàng màu xám
        'div.BorderGrid-cell', // ô lưới viền
        
        // Các thành phần của trang kết quả tìm kiếm Vấn đề và PR
        'div.issue-item', // Mục phát hành
        'div.issue-item-header', // Tiêu đề vấn đề
        'span.opened-by', // dấu mở
        'div.issue-item-body', // Nội dung mục phát hành
        'div.issue-item-footer', // Vấn đề mục dưới cùng
        'span.issue-item-meta', // Siêu dữ liệu về mục phát hành
        'span.issue-meta-section', // Khu vực siêu dữ liệu vấn đề
        'div.flex-auto.min-width-0', // Thùng chứa chiều rộng tối thiểu tự động linh hoạt
        'div.issues-reset-query-wrapper', // Đặt lại trình bao bọc truy vấn
        'span.issue-keyword', // Từ khóa phát hành
        'a.issues-reset-query', // Đặt lại liên kết truy vấn
        'span.selected-text', // Chọn văn bản
        'a.filter-item', // Lọc các mục
        'span.label', // gắn thẻ
        'span.tooltipped', // Nhãn nhắc nhở
        'div.select-menu-item-text', // Chọn văn bản mục menu
        'div.select-menu-filters', // Chọn bộ lọc menu
        'a.select-menu-item', // Chọn mục menu
        'div.select-menu-list', // Chọn danh sách thực đơn
        'nav.subnav', // điều hướng phụ
        'div.flex-column.flex-auto', // Thùng chứa tự động cột linh hoạt
        'div.table-list-filters', // bộ lọc danh sách bảng
        'div.table-list-header', // Tiêu đề cột của bảng
        'div.flex-items-center.flex-justify-between', // Các mục Flex được căn giữa và căn chỉnh
        'div.js-issue-row', // Dòng vấn đề
        'div.lh-default', // Chiều cao hàng mặc định
        'a.js-selected-navigation-item', // Mục điều hướng đã chọn
        'nav.d-flex', // Điều hướng linh hoạt
        'div.js-check-all-container', // Chọn tất cả các container
        'div.flex-shrink-0', // Độ co đàn hồi là 0
        'div.timeline-comment-header', // Tiêu đề bình luận dòng thời gian
        'div.comment-form-textarea', // Trường văn bản mẫu bình luận
        'div.sidebar-notifications', // Thông báo thanh bên
        'div.gh-header', // Tiêu đề GitHub
        'span.js-issue-title', // Tiêu đề vấn đề
        'a.js-hard-refresh', // Buộc làm mới liên kết
        'div.Link--muted', // liên kết phụ
        
        // Mới: Yếu tố thẻ phát hành
        'a.IssueLabel', // Liên kết thẻ phát hành
        'span.IssueLabel', // Thẻ phát hành
        'span.Label', // Nhãn phổ quát
        'span.labels', // hộp đựng nhãn
        'span.label-link', // gắn thẻ liên kết
        'a.label-link', // gắn thẻ liên kết
        'div.labels', // hộp đựng nhãn
        'span.color-label', // nhãn màu
        'span.bg-yellow', // Nền màu vàng (thường dùng cho nhãn)
        'span.bg-green', // nền xanh
        'span.bg-red', // nền đỏ
        'span.bg-purple', // nền màu tím
        'span.bg-blue', // nền màu xanh
        'span.text-green', // văn bản màu xanh lá cây
        'span.text-red', // văn bản màu đỏ
        'span.text-gray', // văn bản màu xám
        'div.js-issue-labels', // Vùng chứa thẻ phát hành
        'div.js-issue-labels .labels a', // Liên kết thẻ phát hành
        'div.js-issue-labels .IssueLabel', // Thẻ phát hành
        'span.js-issue-labels', // Thẻ phát hành
        'span.issue-meta-section.ml-2.issue-label-group', // Nhóm nhãn phát hành
        'span.color-fg-danger', // Màu nguy hiểm (thường được sử dụng cho trạng thái đóng/bị từ chối)
        'span.color-fg-success', // Màu thành công (thường được sử dụng cho trạng thái mở/chấp nhận)
        'span.color-fg-muted', // Màu sắc buồn tẻ (thường dùng để hỗ trợ thông tin)
        'span.color-fg-done', // màu hoàn thiện
    ];

    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) {
            debugLog('GitHub', 'bỏ qua kết quả chọn', selector, node.textContent);
            return true;
        }
    }
    
    // Kiểm tra xem tên lớp của nút có chứa từ khóa cụ thể không
    const skipClassKeywords = [
        'octicon', 'anim-', 'btn', 'menu', 'icon', 'Avatar', 'repo', 
        'branch', 'commits', 'issues', 'pull', 'directory', 'filename', 
        'Counter', 'topic-tag', 'social-count', 'State', 'Label', 'UnderlineNav',
        'IssueLabel', 'issue-keyword', 'issue-label', 'label-link', 'color-label',
        'js-issue-labels', 'issue-meta', 'bg-',  'color-text-'
    ];
    
    if (node.className && typeof node.className === 'string') {
        for (const keyword of skipClassKeywords) {
            if (node.className.includes(keyword)) {
                debugLog('GitHub', 'Bỏ qua từ khóa tên lớp', keyword, node.className);
                return true;
            }
        }
    }
    
    // Kiểm tra thuộc tính cụ thể
    const skipAttributes = [
        'data-hovercard-type', 'data-issue-and-pr-hovercards-enabled',
        'data-issue-title', 'data-url', 'data-pjax', 'data-hotkey', 'data-target', 
        'data-filter-value', 'data-direction', 'data-state'
    ];
    
    for (const attr of skipAttributes) {
        if (node.hasAttribute && node.hasAttribute(attr)) {
            debugLog('GitHub', 'Kết hợp thuộc tính bị bỏ qua', attr);
            return true;
        }
    }
    
    // Kiểm tra xem đó có phải là tên người dùng hoặc @mention không
    if (node.textContent?.trim().startsWith('@')) {
        debugLog('GitHub', 'Tên người dùng @đề cập bị bỏ qua', node.textContent);
        return true;
    }
    
    // Bỏ qua đoạn mã
    if (node.tagName?.toLowerCase() === 'pre' || node.tagName?.toLowerCase() === 'code') {
        debugLog('GitHub', 'bỏ qua đoạn mã', node.tagName);
        return true;
    }
    
    // biểu tượng bỏ qua
    if (node.tagName?.toLowerCase() === 'svg') {
        debugLog('GitHub', 'bỏ qua biểu tượng SVG');
        return true;
    }
    
    // Kiểm tra số liệu thống kê và số lượng (ví dụ: 16,3 nghìn sao, 854 lượt xem, v.v.)
    const statCountPattern = /^\s*\d+(\.\d+)?[kKmMbB]?\s*(stars|watching|forks|views|issues|pull|commits|watchers)?\s*$/;
    if (statCountPattern.test(node.textContent?.trim())) {
        debugLog('GitHub', 'Thống kê bị bỏ qua', node.textContent);
        return true;
    }
    
    // Kiểm tra xem đó có phải là văn bản nhãn kho không
    if (node.className?.includes('topic-tag-link') || 
        node.className?.includes('topic-tag') || 
        node.parentElement?.className?.includes('topic-tag')) {
        debugLog('GitHub', 'Nhãn kho bị bỏ qua', node.textContent);
        return true;
    }
    
    // Kiểm tra văn bản giấy phép
    if (/^Apache-[\d.]+|MIT|GPL-[\d.]+|BSD|LGPL/.test(node.textContent?.trim())) {
        debugLog('GitHub', 'Văn bản giấy phép bị bỏ qua', node.textContent);
        return true;
    }
    
    return false;
}

/**
 * Xác định xem nút có chứa đường dẫn hoặc tên tệp của GitHub không
 */
function isGitHubPathOrFileName(node: any): boolean {
    if (!node || !node.textContent) return false;
    
    const text = node.textContent.trim();
    if (!text) return false;
    
    // Kiểm tra xem nút có phải là thành phần đường dẫn điều hướng không
    if (node.matches?.('nav[aria-label="Breadcrumb"]') || 
        node.matches?.('span.final-path') || 
        node.matches?.('span.js-repo-root') ||
        node.matches?.('a[title][aria-label*="Directory"]') ||
        node.matches?.('a[title][aria-label*="File"]')) {
        debugLog('GitHub', 'phần tử điều hướng đường dẫn', 'khớp selector', node.outerHTML?.substring(0, 100));
        return true;
    }
    
    // Kiểm tra xem phần tử cha có phải là phần tử thư mục không
    let parent = node.parentElement;
    while (parent) {
        if (parent.matches?.('div.react-directory-filename-column') || 
            parent.matches?.('div.react-directory-filename-cell') ||
            parent.matches?.('div.react-directory-truncate') ||
            parent.className?.includes('directory-')) {
            debugLog('GitHub', 'Nút cha của phần tử thư mục', 'khớp selector phần tử cha', parent.outerHTML?.substring(0, 100));
            return true;
        }
        parent = parent.parentElement;
    }
    
    // Kiểm tra xem đó có phải là liên kết thư mục không
    if (node.tagName?.toLowerCase() === 'a' && 
        node.getAttribute('aria-label')?.includes('Directory')) {
        debugLog('GitHub', 'liên kết thư mục', 'aria-label chứa Directory', node.getAttribute('aria-label'));
        return true;
    }
    
    // Kiểm tra xem đó có phải là tên thư mục hoặc tệp chung không
    if (/^\.github|^src\/|^test\/|^docs\/|^\.gitignore$|^LICENSE$|^README\.md$|^CHANGELOG\.md$|^package\.json$|^Dockerfile$/i.test(text)) {
        // Nếu nút hiện tại là một liên kết hoặc trong danh sách tệp
        if (node.tagName?.toLowerCase() === 'a' || 
            node.parentElement?.matches?.('div.Box-row')) {
            debugLog('GitHub', 'Tên thư mục hoặc tập tin chung', text);
            return true;
        }
    }
    
    // Kiểm tra xem nó có ở định dạng đường dẫn không (văn bản ngắn chứa /)
    if (text.includes('/') && text.length < 100 && 
        !/\s/.test(text) && // Không chứa dấu cách
        !/[，。？！；：""''（）【】「」『』〔〕]/.test(text)) { // Không chứa dấu câu tiếng Trung
        debugLog('GitHub', 'văn bản định dạng đường dẫn', text);
        return true;
    }
    
    // Kiểm tra các phần mở rộng tệp phổ biến liên quan đến phát triển
    if (/\.(js|ts|jsx|tsx|css|scss|html|json|md|py|java|go|rs|c|cpp|h|hpp|rb|php|sh|bat|cmd|yaml|yml|xml)$/i.test(text)) {
        debugLog('GitHub', 'Phần mở rộng tập tin phù hợp', text);
        return true;
    }
    
    // Kiểm tra xem đó có phải là định dạng số Vấn đề/PR không
    if (/^#\d+$/.test(text) || /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+#\d+$/.test(text)) {
        debugLog('GitHub', 'Số phát hành/số PR', text);
        return true;
    }
    
    return false;
}

/**
 * Xác định xem có nên bỏ qua các thành phần cụ thể trên trang web Stack Overflow hay không
 */
function shouldSkipStackOverflowElement(node: any): boolean {
    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Thanh điều hướng
        'nav.s-topbar',
        'div.s-topbar',
        // thanh bên
        'div.s-sidebarwidget',
        // phần tử biểu mẫu
        'form',
        'input',
        'textarea',
        'button',
        // khối mã
        'pre.s-code-block',
        'code',
        // Nút hành động
        'div.js-voting-container',
        'div.js-post-menu',
        // Liên kết và thẻ
        'div.post-taglist',
        'div.module.community-bulletin',
        // Thống kê
        'div.-flair',
        'div.s-stats',
        'div.s-badge',
        // chân trang
        'footer',
        'div.site-footer',
    ];
    
    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) return true;
        
        // Kiểm tra các nút tổ tiên
        let parent = node.parentElement;
        while (parent) {
            if (parent.matches?.(selector)) return true;
            parent = parent.parentElement;
        }
    }
    
    // Kiểm tra xem tên lớp của nút có chứa từ khóa cụ thể không
    const skipClassKeywords = ['js-', 'icon', 'btn', 'badge', 'vote', 'tag', 's-btn', 'vote-count'];
    
    if (node.className && typeof node.className === 'string') {
        for (const keyword of skipClassKeywords) {
            if (node.className.includes(keyword)) return true;
        }
    }
    
    // Bỏ qua đoạn mã
    if (node.tagName?.toLowerCase() === 'pre' || node.tagName?.toLowerCase() === 'code') return true;
    
    // biểu tượng bỏ qua
    if (node.tagName?.toLowerCase() === 'svg') return true;
    
    return false;
}

/**
 * Xác định xem có nên bỏ qua các thành phần cụ thể trên trang Medium hay không
 */
function shouldSkipMediumElement(node: any): boolean {
    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Thanh điều hướng và thanh công cụ
        'nav',
        'div.metabar',
        'div.js-metabar',
        // thanh bên 
        'div.js-sidebarContainer',
        'div.js-sidebar',
        // thành phần giao diện người dùng
        'button',
        'input',
        'textarea',
        // khối mã
        'pre',
        'code',
        // phần tử dưới cùng
        'footer',
        // Thẻ thông tin tác giả
        'div.pw-multi-author-card',
        // Đề xuất nội dung ngoài tiêu đề/mô tả trên thẻ bài viết
        'div.pw-card-body div.pw-card-description ~ *',
        // Nút chia sẻ và nút phản hồi
        'div.pw-post-actions',
        'div.pw-responses-header',
    ];
    
    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) return true;
        
        // Kiểm tra các nút tổ tiên
        let parent = node.parentElement;
        while (parent) {
            if (parent.matches?.(selector)) return true;
            parent = parent.parentElement;
        }
    }
    
    // Kiểm tra xem tên lớp của nút có chứa từ khóa cụ thể không
    const skipClassKeywords = ['js-', 'btn', 'button', 'u-', 'overlay', 'postActionsBar'];
    
    if (node.className && typeof node.className === 'string') {
        for (const keyword of skipClassKeywords) {
            if (node.className.includes(keyword)) return true;
        }
    }
    
    // Bỏ qua đoạn mã
    if (node.tagName?.toLowerCase() === 'pre' || node.tagName?.toLowerCase() === 'code') return true;
    
    // bỏ qua biểu tượng hình ảnh
    if (node.tagName?.toLowerCase() === 'svg' || node.tagName?.toLowerCase() === 'img') return true;
    
    return false;
}

/**
 * Xác định xem có nên bỏ qua một phần tử cụ thể trên trang Reddit hay không
 */
function shouldSkipRedditElement(node: any): boolean {
    // Kiểm tra xem đó có phải là nội dung đặc biệt không (URL, email, tên người dùng, v.v.)
    if (node.textContent && isSpecialContent(node.textContent)) {
        debugLog('Reddit', 'Nội dung đặc biệt bị bỏ qua', node.textContent);
        return true;
    }
    
    // Xử lý nội dung trình đọc màn hình trong tiêu đề bài viết
    if (node.tagName?.toLowerCase() === 'faceplate-screen-reader-content') {
        debugLog('Reddit', 'Nội dung trình đọc màn hình bị bỏ qua', node.textContent);
        return true;
    }
    
    // Xử lý thẻ thời gian trong bài viết
    if (node.tagName?.toLowerCase() === 'time') {
        debugLog('Reddit', 'bỏ qua thẻ thời gian', node.textContent);
        return true;
    }
    
    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Thanh điều hướng và tiêu đề
        'header', 
        'div._3Qx5bBCG_O8wVZee9J-KyJ', // Vùng chứa tiêu đề Reddit
        'div._1x6pySZ2CoUnAfsFhGe7J1', // Thanh điều hướng
        'div._1QhgSEQa6-vyHBHcV0rygZ', // biểu ngữ hàng đầu
        'nav, div[data-testid="subreddit-header"]', // khu vực điều hướng
        'div._3ozFtOe6WpJEMUtxDOIvtU', // thanh thực đơn
        'div._2QZ7T4uAFMs_N83BZcN-Em', // cột sắp xếp
        
        // Các thành phần giao diện người dùng mới của Reddit
        'faceplate-timeago', // Thành phần hiển thị thời gian
        'a[data-ks-id]', // Đăng liên kết
        'shreddit-post[data-ks-item]', // Đăng thành phần
        'a[slot="full-post-link"]', // Liên kết bài viết đầy đủ
        'span[slot="credit-bar"]', // thanh tín dụng
        'shreddit-post-flair', // Đăng thẻ
        'shreddit-join-button', // nút tham gia
        'shreddit-post-overflow-menu', // menu tràn
        'shreddit-async-loader', // Trình tải không đồng bộ
        'faceplate-hovercard', // thẻ di chuột
        'faceplate-tracker', // người theo dõi
        'faceplate-number', // Thành phần định dạng số
        'shreddit-distinguished-post-tags', // Thẻ bài đặc biệt
        
        // thanh bên
        'div._1OVBBWLtHoSPfGCRaPzpTf', // thùng chứa thanh bên
        'div.wBtTDilkW_zr1D60d6V2Z', // Thành phần thanh bên
        'div._3Qkp11fjcAw9I9wtLo8frE', // Thẻ thanh bên
        'div._1HSQGYlfPWzs40LP8sZqzT', // Thanh bên cộng đồng
        'div._2vEf-C2keJaBMY9qk_BxVn', // khối thanh bên
        'div._3Qkp11fjcAw9I9wtLo8frE', // thẻ thông tin cộng đồng
        'div._2QmHYFeMADTpuXJtd36LQs', // Mô-đun thanh bên
        
        // phần tử biểu mẫu
        'form', 'input', 'textarea', 'button',
        'button._3QMG29bQNj9RUoGMvSHpZg', // nút chính
        'button._10K5i7NW6qcm-UoCtpB3aK', // nút phụ
        'div._3QMG29bQNj9RUoGMvSHpZg, div._10K5i7NW6qcm-UoCtpB3aK', // hộp đựng nút
        
        // Khu vực sau hoạt động
        'div._1ixsU4oQRnNfZ91jhBU74y', // khu vực bỏ phiếu
        'div._3-SW6hQX6gXK9G4FM74obr', // Khu vực hoạt động bình luận
        'div._2hw0iZ3L5x8UbnfX8ZDKb', // Nhóm nút hành động
        'div[data-testid="post-comment-header"]', // tiêu đề bình luận
        'div[data-click-id="upvote"]', // nút biểu quyết
        'div[data-click-id="downvote"]', // nút nhấn
        'div[data-click-id="share"]', // nút chia sẻ
        'div[data-click-id="comments"]', // Nút bình luận
        
        // Các phần tử xem cụ thể của Reddit
        'div[data-post-click-location="text-body"]', // Khu vực nhấp chuột vào bài viết
        'div.md.feed-card-text-preview', // Xem trước bài đăng
        'div#feed-post-credit-bar', // Cột tín dụng sau
        'span.created-separator', // Tạo dấu phân cách
        'span.inline-block.my-0.created-separator', // dấu phân cách
        'div[data-testid="post-content"]', // Đăng nội dung
        
        // Các tiện ích thăm dò ý kiến và tương tác - các thành phần hiển thị từ ảnh chụp màn hình
        'button._2pFdCpgBihIaYh9DSMWBIu', // Nút phổ quát
        'div._1E9mcoVn4MYnuBQSVDt1gC', // thùng chứa khu vực bỏ phiếu
        'span._vaFo96phV6L5Hltvwcox', // yếu tố kiểm phiếu
        'div._3-SW6hQX6gXK9G4FM74obr', // Khu vực nút thao tác
        'div._3Qkp11fjcAw9I9wtLo8frE', // Đăng thẻ thông tin
        'div._2X6EB3ZhEeXCh1eIVA64XM, div._1hwEKkB_38tIoal6fcdrt9', // Các tiện ích tích hợp
        'div._3nSp9cdBpqL13CqjdMr2L_', // yếu tố thống kê
        'div._2FKpII1jz0h6xCAw1kQAvS, div._2xLbdLcm9WYMj6tMTDwBmf', // khu vực tương tác
        'div._3U_7i38RDFqmOFXMuRZYvZ, div._VmOLt6lJfSjP8Pr5DL9T', // Nút chia sẻ và lưu
        
        // Các yếu tố thống kê mới của Reddit
        'span[data-testid="community-hover-card:active-count"]', // Số người dùng hoạt động trong cộng đồng
        'span.bg-kiwigreen-400', // Chỉ báo trạng thái trực tuyến
        'span.text-12.leading-4.text-neutral-content-weak', // văn bản trạng thái
        
        // phần tử điều khiển giao diện
        'a[href="/settings"]', // Đặt liên kết
        'div[role="menu"]', // yếu tố vai trò menu
        'div[role="button"]', // Yếu tố vai trò nút
        'div._JRBNstMcGxbZUxrrIKXe, div._2IHh1GBfUxJVQQX0dJvAEf', // Thu gọn/mở rộng điều khiển
        'div._3MknXZVbkWU8JL9XGlzASi, div._3Z6MIaeww5FJSez7H2YWXi', // điều khiển cuộn
        'div[data-adclicklocation="top_bar"]', // thuộc tính vị trí quảng cáo
        'a[data-click-id="subreddit"]', // Kiểm soát liên kết cộng đồng
        
        // quảng cáo
        'div.promotedlink', 'div._3Qkp11fjcAw9I9wtLo8frE div._2vEf-C2keJaBMY9qk_BxVn',
        'div[data-before-content="advertisement"]', // thẻ quảng cáo
        'div[data-testid="post-container"][data-promoted="true"]', // Bài đăng được quảng cáo
        'div[data-testid="post"][data-promoted="true"]', // Một loại bài viết quảng cáo khác
        'div.ad-container, div.AdPlace', // thùng đựng quảng cáo
        
        // thanh tìm kiếm
        'div._2dkUkgReBsuY2IHM9aAHMx', // thanh tìm kiếm
        'input[name="q"]', // Hộp nhập tìm kiếm
        'div._1LganuXpbKgkYX39pbmrCl, form._1QxZxZ9ntXPkuXMnfDTHzH', // Tìm kiếm các phần tử biểu mẫu
        
        // đáy
        'footer', 'div._3w_665DK_NH7yIsRMuZkqB',
        'div._3Wl-riAhLCZuDLzWNbD_z6', // Điều hướng dưới cùng
        'div._3qX0zy2NNkra76bgyHbrcR, div._10YWGZZj2W-2J7T-IJVVNU', // nhóm liên kết dưới cùng
        
        // Liên quan đến người dùng
        'a[data-testid="post_author_link"]',
        'a.author', 'span.author',
        'a[data-testid="comment_author_link"]',
        'div._2mHuuvyV9doV3zwbZPtIPG', // Thanh thông tin người dùng
        'a._3BcIEQadBHDKnV8E-qUMtJ', // liên kết người dùng
        'div._23wugcdiaj44hdfugIAlnX', // thẻ người dùng
        'div[data-testid="comment_author"]', // Đánh giá tác giả
        'span._12nHw-MGuz_r1dQx4wxxAf, a._12nHw-MGuz_r1dQx4wxxAf', // Phần tử hiển thị tên người dùng
        'div[data-testid="subreddit-sidebar"] div._3ryJoIoycVkI7DggMcJiKM', // Cột người dùng cộng đồng
        
        // Thống kê
        'span._vaFo96phV6L5Hltvwcox', // Số phiếu bầu
        'span._1jNPl3YUk6zbpLWdjaJT1r', // Số lượng bình luận
        'div._2mHuuvyV9doV3zwbZPtIPG', // Dấu thời gian
        'div._2ETuFsOP3jKbVR95iRImaDvU-g6W3dAQ', // Thanh thông tin đăng
        'div._3-SW6hQX6gXK9G4FM74obr span', // văn bản nút hành động
        'div._3XFx6CfPlg-4Usgxm0gK8R, div.BilRyRl5iuFY2VJoNfVz0', // khu vực thống kê
        'div._11dVAO6CK-nOlDyrYr6tsX, div._3ioGMz1QkHcUCVgLx3kzOQ', // đếm
        'div._2hYRM7d0BaB17cCB3FGmm9', // đếm thời gian
        
        // Biểu ngữ và thông báo
        'div._3q-XSJ2JokLxfTqcOzQxzf', // Thông báo bài viết mới
        'div[data-redditstyle="true"] div._1DooEIX-1Nj5rweIc5cw_E', // biểu ngữ chung
        'div._31L5xyMG1DzvGnqhbHkKV4, div._3NpZ0JJ2ZEBZXLpt7AMxgW', // thông báo
        'div._3Im6OD67aKo33nql4FpSp0, div._2zeq1aXKDHDDXUNXAJyRVk', // Thông báo hệ thống
        
        // Các yếu tố dành riêng cho Reddit khác
        'div._2vkeRJojnV7cb9pMlPHy7d', // Nút tham gia
        'div[data-testid="frontpage-sidebar"]', // Thanh bên trang chủ
        'div._2vEf-C2keJaBMY9qk_BxVn button', // nút thanh bên
        'div._3Qx5bBCG_O8wVZee9J-KyJ', // vùng đầu
        'div[data-testid="subreddit-name"]', // Khu vực tên cộng đồng
        'div._2x02fRB8KYZPG74bIR0jpe', // Thanh công cụ đăng bài
        'div[data-test-id="post-content"] video', // nội dung video
        'div._3gbb_EMFXxTYrxDZ2kusIp', // bài đăng hình ảnh
        'div._1sDtEhccxFpHDn2ruDutJe', // Xem trước liên kết
        'div._2wKMjKBrZFbRMP33ghA1uI', // phiếu bầu
        'div._3_HlHJ56dAfStT19Jgl1bF', // nhóm nút biểu quyết
        'div._pGofQ7zn0wPWxvde-6HDL', // huy hiệu khác nhau
        'div._33axOHPa8DzNnTmwzen-wO', // Huy hiệu giải thưởng
        'div._2hgXdc8jVQaXYAXvnqVBBh, div._1yxKmMhLFJJp2CfU1jFZz5', // Thẻ bài viết phổ biến/mới
        'div._2FbYTP2kJW6pyJnjwLWr8f, div._3bl3XkXsAgnvhW0Ghm6Dh-', // Thanh điều khiển chủ đề trang chủ
    ];
    
    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) {
            debugLog('Reddit', 'bỏ qua kết quả chọn', selector, node.textContent);
            return true;
        }
    }
    
    // Kiểm tra thuộc tính dữ liệu
    const skipDataAttributes = [
        'click-id="share"', 'click-id="upvote"', 'click-id="downvote"', 'click-id="award"', 
        'click-id="comments"', 'click-id="save"', 'click-id="vote-arrows"', 'click-id="media"',
        'adclicklocation', 'promoted="true"', 'test-id="comment-top-meta"'
    ];
    
    for (const attr of skipDataAttributes) {
        if (node.hasAttribute && node.hasAttribute(attr)) {
            debugLog('Reddit', 'Việc khớp thuộc tính dữ liệu bị bỏ qua', attr);
            return true;
        }
    }
    
    // Kiểm tra xem tên lớp của nút có chứa từ khóa cụ thể không
    const skipClassKeywords = [
        '_', 'icon', 'Button', 'vote', 'score', 'flair', 'author',
        'award', 'caret', 'expando', 'menu', 'hover', 'promoted',
        'badge', 'thumbnail', 'timestamp', 'banner', 'hover', 'nav',
        'submit', 'upvote', 'downvote', 'premium', 'moderator', 'join',
        'subscribe', 'share', 'save', 'expand', 'collapse', 'points'
    ];
    
    if (node.className && typeof node.className === 'string') {
        for (const keyword of skipClassKeywords) {
            if (node.className.includes(keyword) && node.textContent?.length < 20) {
                debugLog('Reddit', 'Bỏ qua từ khóa tên lớp', keyword, node.className);
                return true;
            }
        }
    }
    
    // Kiểm tra xem nó có ở định dạng tên người dùng không
    const textContent = node.textContent?.trim();
    if (textContent) {
        // Định dạng tên người dùng Reddit u/tên người dùng
        if (/^u\/\w+$/.test(textContent)) {
            debugLog('Reddit', 'Định dạng tên người dùng bị bỏ qua', textContent);
            return true;
        }
        
        // Định dạng tên cộng đồng r/community
        if (/^r\/\w+$/.test(textContent)) {
            debugLog('Reddit', 'Định dạng tên cộng đồng bị bỏ qua', textContent);
            return true;
        }
        
        // Bỏ qua việc kiểm phiếu
        if (/^\d+(\.\d+)?[kKmM]?$/.test(textContent) || /^[+-]?\d+(\.\d+)?[kKmM]?$/.test(textContent)) {
            debugLog('Reddit', 'số phiếu bầu bị bỏ qua', textContent);
            return true;
        }
        
        // Bỏ qua định dạng dấu thời gian
        if (/^(Posted )?\d+ (minutes|hours|days|weeks|months|years) ago$/.test(textContent)) {
            debugLog('Reddit', 'bỏ qua dấu thời gian', textContent);
            return true;
        }
        
        // Bỏ qua số lượng bình luận
        if (/^\d+(\.\d+)?[kKmM]? comments?$/.test(textContent)) {
            debugLog('Reddit', 'Số bình luận bị bỏ qua', textContent);
            return true;
        }
        
        // Định dạng thống kê: "19K", "1K", v.v.
        if (/^\s*\d+[KkMmBb]?\s*$/.test(textContent)) {
            debugLog('Reddit', 'Thống kê bị bỏ qua', textContent);
            return true;
        }
        
        // Bỏ qua văn bản giao diện người dùng Reddit phổ biến
        const skipPhrases = [
            'upvote', 'downvote', 'share', 'save', 'hide', 'report', 'crosspost',
            'award', 'reply', 'give award', 'hide', 'comments', 'comment',
            'best', 'top', 'new', 'controversial', 'old', 'random', 'live',
            'hot', 'rising', 'gilded', 'wiki', 'mod', 'moderator', 'approved',
            'submission', 'removed', 'spam', 'reported', 'locked', 'unlocked',
            'pinned', 'unpinned', 'archived', 'unarchived', 'distinguished',
            'undistinguished', 'spoiler', 'nsfw', 'upvoted', 'downvoted',
            'follow', 'join', 'create post', 'community options', 'sort by',
            'join', 'leave', 'view all comments', 'more comments', 'continue this thread',
            'copy link', 'mark as spoiler', 'delete', 'edit', 'embed', 
            'follow thread', 'add to collection', 'post insights', 'view poll',
            'download', 'open in app', 'view community'
        ];
        
        for (const phrase of skipPhrases) {
            if (textContent.toLowerCase() === phrase) {
                debugLog('Reddit', 'Bỏ qua văn bản giao diện người dùng phổ biến', textContent);
                return true;
            }
        }
    }
    
    // Bỏ qua đoạn mã
    if (node.tagName?.toLowerCase() === 'pre' || node.tagName?.toLowerCase() === 'code') {
        debugLog('Reddit', 'bỏ qua đoạn mã');
        return true;
    }
    
    // Bỏ qua hình ảnh và biểu tượng
    if (node.tagName?.toLowerCase() === 'svg' || node.tagName?.toLowerCase() === 'img') {
        debugLog('Reddit', 'Bỏ qua hình ảnh/biểu tượng');
        return true;
    }
    
    return false;
}

/**
 * Xác định xem có nên bỏ qua các thành phần cụ thể trên trang web Hacker News hay không
 */
function shouldSkipHNElement(node: any): boolean {
    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Điều hướng trên và dưới
        'td.hnnavbar',
        'span.pagetop',
        // Các khu vực liên kết khác nhau
        'td.subtext',
        // Thông tin người dùng
        'span.hnuser',
        'span.age',
        // phần tử biểu mẫu
        'form',
        'input',
        'textarea',
    ];
    
    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) return true;
        
        // Kiểm tra các nút tổ tiên
        let parent = node.parentElement;
        while (parent) {
            if (parent.matches?.(selector)) return true;
            parent = parent.parentElement;
        }
    }
    
    // Kiểm tra xem văn bản nút có phải là văn bản nút/liên kết đơn giản không
    const skipTexts = ['reply', 'flag', 'favorite', 'hide', 'past', 'web', 'comments', 'ask', 'show', 'jobs', 'submit'];
    if (node.textContent && skipTexts.includes(node.textContent.trim().toLowerCase())) {
        return true;
    }
    
    return false;
}

/**
 * Xác định xem có nên bỏ qua một thành phần cụ thể trên trang web YouTube hay không
 */
function shouldSkipYouTubeElement(node: any): boolean {
    // Kiểm tra xem đó có phải là nội dung đặc biệt không (URL, email, tên người dùng, v.v.)
    if (node.textContent && isSpecialContent(node.textContent)) {
        debugLog('YouTube', 'Nội dung đặc biệt bị bỏ qua', node.textContent);
        return true;
    }
    
    // Bỏ qua nếu nút hiện tại hoặc nút tổ tiên của nó khớp với các bộ chọn này
    const skipSelectors = [
        // Điều hướng và menu liên quan
        'div#masthead-container', // thanh điều hướng trên cùng
        'div#guide-content', // menu bên trái
        'ytd-mini-guide-renderer', // điều hướng nhỏ
        'div#buttons', // khu vực nút
        'ytd-topbar-menu-button-renderer', // nút menu trên cùng
        'ytd-guide-entry-renderer', // Lối vào điều hướng
        'ytd-guide-section-renderer h3', // Tiêu đề khu vực điều hướng
        'div#channel-header', // Vùng tiêu đề kênh
        'div#channel-navigation', // Khu vực điều hướng kênh
        
        // Điều khiển video liên quan
        'div.ytp-chrome-bottom', // Thanh điều khiển phía dưới trình phát
        'div.ytp-chrome-top', // Thanh điều khiển trên cùng của trình phát
        'div.ytp-right-controls', // điều khiển bên phải
        'div.ytp-left-controls', // điều khiển bên trái
        'div.ytp-progress-bar-container', // vùng chứa thanh tiến trình
        'span.ytp-time-current', // thời điểm hiện tại
        'span.ytp-time-duration', // Tổng thời lượng video
        'button.ytp-button', // Tất cả các nút của trình phát
        'div.ytp-chapter-container', // thùng đựng chương
        
        // Khu vực thống kê và tương tác
        'div#info-contents ytd-video-primary-info-renderer div#top-level-buttons-computed', // Nút thích/chia sẻ
        'span#dot', // điểm phân cách
        'span.ytd-video-view-count-renderer', // lượt xem
        'span.ytd-video-owner-renderer', // Khu vực thông tin kênh
        'div#owner', // Khu vực chủ sở hữu video
        'a.ytd-video-owner-renderer', // Liên kết kênh
        'ytd-subscribe-button-renderer', // Nút đăng ký
        'div.ytd-subscribe-button-renderer', // Trình kết xuất nút đăng ký
        'ytd-button-renderer', // trình kết xuất nút
        'ytd-menu-renderer', // Trình kết xuất thực đơn
        'ytd-badge-supported-renderer', // Trình kết xuất hỗ trợ huy hiệu
        'div#sponsor-button', // Nút tài trợ
        
        // Yếu tố kiểm soát khu vực bình luận
        'div#action-buttons', // Nút hành động bình luận
        'ytd-toggle-button-renderer', // nút chuyển đổi
        'div#vote-count-middle', // Số phiếu bình luận
        'ytd-comments-header-renderer', // Nhận xét về trình kết xuất tiêu đề
        'div#title.ytd-comments-header-renderer', // Tiêu đề bình luận
        'span.ytd-comments-header-renderer', // Số lượng bình luận
        'ytd-sort-filter-sub-menu-renderer', // Tùy chọn sắp xếp bình luận
        'ytd-comment-action-buttons-renderer', // Nút hành động bình luận
        
        // Thẻ nội dung và siêu dữ liệu
        'div.ytd-metadata-row-container-renderer', // hàng siêu dữ liệu
        'div#subscribe-button', // Nút đăng ký
        'span.ytd-channel-name', // Tên kênh
        'div#owner-sub-count', // Số lượng người đăng ký
        'div.ytd-watch-metadata yt-formatted-string[is-empty]', // chuỗi định dạng trống
        'ytd-metadata-row-renderer', // hàng siêu dữ liệu
        'div#above-the-fold', // khu vực trên cùng của trang
        'div#primary-inner ytd-merch-shelf-renderer', // Giá đựng hàng hóa
        'div.ytd-structured-description-content-renderer', // Nội dung mô tả có cấu trúc
        'ytd-info-panel-content-renderer', // Nội dung bảng thông tin
        'ytd-info-panel-container-renderer', // Hộp chứa bảng thông tin
        
        // Hình thu nhỏ và thông tin video được đề xuất
        'span.ytd-thumbnail-overlay-time-status-renderer', // Thời lượng video
        'span.ytd-video-meta-block', // khối siêu dữ liệu video
        'div#metadata-line', // hàng siêu dữ liệu
        'span.ytd-grid-video-renderer', // Trình kết xuất video dạng lưới
        'div#video-title.ytd-grid-video-renderer', // Tiêu đề lưới video
        'a.yt-simple-endpoint.ytd-grid-video-renderer', // Liên kết lưới video
        'ytd-thumbnail', // hình thu nhỏ
        'div#hover-overlays', // Lớp phủ di chuột
        
        // Các thành phần giao diện người dùng khác
        'button', // Tất cả các nút
        'yt-icon', // Biểu tượng YouTube
        'a.yt-simple-endpoint[href^="/hashtag/"]', // Liên kết gắn thẻ bắt đầu bằng #
        'a.yt-simple-endpoint[href^="/channel/"]', // Liên kết kênh
        'div#text.ytd-channel-name', // Văn bản tên kênh
        'span.yt-core-attributed-string--link-inherit-color', // chuỗi định dạng cụ thể
        'ytd-notification-topbar-button-renderer', // nút thông báo
        'ytd-searchbox', // hộp tìm kiếm
        'ytd-dropdown-renderer', // trình đơn thả xuống
        'ytd-live-chat-frame', // Trò chuyện trực tiếp
        'ytd-playlist-header-renderer div#stats', // Thống kê danh sách phát
        'ytd-playlist-panel-renderer div#header-count', // số danh sách phát
        'ytd-playlist-panel-renderer div#play-button', // Nút phát danh sách phát
        'ytd-playlist-panel-renderer a.ytd-playlist-panel-video-renderer', // Liên kết video danh sách phát
        'ytd-playlist-byline-renderer', // Chữ ký danh sách phát
    ];
    
    // Kiểm tra xem nút hiện tại có khớp với bộ chọn bỏ qua không
    for (const selector of skipSelectors) {
        if (node.matches?.(selector)) {
            debugLog('YouTube', 'bỏ qua kết quả chọn', selector, node.textContent);
            return true;
        }
    }
    
    // Kiểm tra xem tên lớp của nút có chứa từ khóa cụ thể không
    const skipClassKeywords = ['ytp-', 'button', 'badge', 'menu', 'selector', 'icon', 'thumbnail', 'avatar'];
    
    if (node.className && typeof node.className === 'string') {
        for (const keyword of skipClassKeywords) {
            if (node.className.includes(keyword)) {
                debugLog('YouTube', 'Bỏ qua từ khóa tên lớp', keyword, node.className);
                return true;
            }
        }
    }
    
    // Kiểm tra đặc điểm nội dung văn bản
    const textContent = node.textContent?.trim();
    if (textContent) {
        // Bỏ qua các số thuần túy, số lượt xem, ngày tháng, v.v.
        if (/^\d+(\.\d+)?[KMB]?$/.test(textContent)) {
            debugLog('YouTube', 'bỏ qua đếm số', textContent);
            return true;
        }
        
        // Bỏ qua định dạng thời lượng video
        if (/^\d+:\d+$/.test(textContent) || /^\d+:\d+:\d+$/.test(textContent)) {
            debugLog('YouTube', 'bỏ qua định dạng thời gian', textContent);
            return true;
        }
        
        // Bỏ qua số lượt xem và kết hợp ngày
        if (/^\d+(\.\d+)?[KMB]? views/.test(textContent) || 
            /\d+ (days|months|years) ago$/.test(textContent) ||
            /^\d+(\.\d+)?[KMB]? watching now$/.test(textContent)) {
            debugLog('YouTube', 'Lượt xem/Ngày bỏ qua', textContent);
            return true;
        }
        
        // Bỏ qua các từ và cụm từ phổ biến trên YouTube
        const skipPhrases = [
            'Subscribe', 'subscribed', 'subscribers', 'Join', 'Share', 'Save', 
            'Report', 'Download', 'Add to', 'Show more', 'Show less', 
            'Like', 'Dislike', 'Reply', 'Sort by', 'Top comments', 'Newest first',
            'Edit', 'View', 'playlist', 'Autoplay', 'Cast', 'Settings', 'Play',
            'Pause', 'Stream', 'Live', 'Premiere', 'Premieres', 'Premiered',
            'Skip', 'Next', 'Previous', 'Shuffle', 'Transcript', 'Captions',
            'Quality', 'Playback speed', 'More', 'Stats for nerds'
        ];
        
        for (const phrase of skipPhrases) {
            if (textContent.includes(phrase) && textContent.length < 30) {
                debugLog('YouTube', 'cụm từ cụ thể bị bỏ qua', phrase, textContent);
                return true;
            }
        }
        
        // Kiểm tra xem đó có phải là tên kênh/@tên người dùng không
        if (/^@\w+$/.test(textContent) || 
            (textContent.startsWith('@') && textContent.length < 30)) {
            debugLog('YouTube', 'Bỏ qua kênh/tên người dùng', textContent);
            return true;
        }
    }
    
    // Bỏ qua các biểu tượng và hình ảnh
    if (node.tagName?.toLowerCase() === 'svg' || node.tagName?.toLowerCase() === 'img') {
        debugLog('YouTube', 'Bỏ qua biểu tượng/hình ảnh');
        return true;
    }
    
    return false;
}
