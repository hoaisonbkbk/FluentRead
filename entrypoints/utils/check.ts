import { customModelString, services, servicesType } from "./option";
import { sendErrorMessage } from "./tip";
import { config } from "@/entrypoints/utils/config";

// Check configuration before translation
export function checkConfig(): boolean {
    // 1. Check if the plugin is enabled
    if (!config.on) return false;

    // 2. Check if the token is provided for services that require it
    if (servicesType.isUseToken(config.service) && !config.token[config.service]) {
        // Mã thông báo của DeepLX là tùy chọn và không yêu cầu kiểm tra bắt buộc
        if (config.service === services.deeplx) {
        } else {
            sendErrorMessage("Token chưa được cấu hình, vui lòng vào trang cài đặt để cấu hình");
            return false;
        }
    }
    // Special case for YiYan service (requires both AK and SK)
    if (config.service === services.yiyan && (!config.ak || !config.sk)) {
        sendErrorMessage("Token chưa được cấu hình, vui lòng vào trang cài đặt để cấu hình");
        return false;
    }
    
    // Special case for Tencent Cloud service (requires both SecretId and SecretKey)
    if (config.service === services.tencent && (!config.tencentSecretId || !config.tencentSecretKey)) {
        sendErrorMessage("Khóa dịch máy Tencent Cloud chưa được cấu hình, vui lòng vào trang cài đặt để cấu hình SecretId và SecretKey");
        return false;
    }

    // 3. Check if a model is selected for AI services (except specific services like Coze)
    if (servicesType.isAI(config.service) && ![services.cozecn, services.cozecom].includes(config.service)) {
        const model = config.model[config.service];
        const customModel = config.customModel[config.service];
        if (!model || (model === customModelString && !customModel)) {
            sendErrorMessage("Mô hình chưa được cấu hình, vui lòng vào trang cài đặt để cấu hình");
            return false;
        }
    }

    // Some translation services require "bilingual mode" to be enabled
    if (config.display === 0 && config.service === services.google) {
        sendErrorMessage("Google Dịch chỉ hỗ trợ chế độ song ngữ, vui lòng chuyển dịch vụ dịch");
        return false;
    }

    return true;
}

// Check if the node needs to be translated
export function skipNode(node: Node): boolean {
    return !node || !node.textContent?.trim() || hasLoadingSpinner(node) || hasRetryTag(node);
}

// Check if the node or any of its children contains a loading spinner
export function hasLoadingSpinner(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return false;

    // Type guard to check if the node is an Element
    if (node instanceof Element && node.classList.contains('fluent-read-loading')) return true;

    // Check children only if the node is an Element
    if (node instanceof Element) {
        return Array.from(node.children).some(child => hasLoadingSpinner(child));
    }

    return false;
}

// Check if the node or any of its children contains a retry tag
export function hasRetryTag(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return false;

    // Type guard to check if the node is an Element
    if (node instanceof Element && node.classList.contains('fluent-read-failure')) return true;

    // Check children only if the node is an Element
    if (node instanceof Element) {
        return Array.from(node.children).some(child => hasRetryTag(child));
    }

    return false;
}

// Search for a node with a specific class name
export function searchClassName(node: Node, className: string): Node | null {
    if (node instanceof Element && node.classList.contains(className)) return node;

    // Check children only if the node is an Element
    if (node instanceof Element) {
        for (let child of node.children) {
            let result = searchClassName(child, className);
            if (result) return result;
        }
    }

    return null;
}

export function contentPostHandler(text: string) {
    // Thay thế nội dung giữa <think> và </think>
    let content = text;
    content = content.replace(/^<think>[\s\S]*?<\/think>/, "");
    return content;
}