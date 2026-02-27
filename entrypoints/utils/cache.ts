import { customModelString } from "./option";
import { config } from "@/entrypoints/utils/config";

const prefix = "flcache_"; // fluent read cache

// Xây dựng khóa bộ đệm
function buildKey(message: string) {
    const { service, model, to, style, customModel } = config;
    const selectedModel = model[service] === customModelString ? customModel[service] : model[service];
    // tiền tố_service_model_target_message
    return [prefix, style, service, selectedModel, to, message].join('_');
}

export const cache = {
    // Lưu trữ trong bộ đệm và đặt thời gian hết hạn
    set(set: Set<any>, key: any, expire: number) {
        // Nếu bộ nhớ đệm bị tắt, không có tác dụng gì
        if (!config.useCache) return;
        
        set.add(key);
        if (expire >= 0) {
            setTimeout(() => set.delete(key), expire);
        }
    },

    // Chuỗi cục bộ là một phương pháp lưu vào bộ nhớ đệm chuyên dụng được sử dụng để vận hành bộ đệm dịch.
    localSet(key: string, value: string) {
        // Nếu bộ nhớ đệm bị tắt, không có tác dụng gì
        if (!config.useCache) return;
        
        localStorage.setItem(buildKey(key), value);
    },

    localSetDual(key: string, value: string) {
        // Nếu bộ nhớ đệm bị tắt, không có tác dụng gì
        if (!config.useCache) return;
        
        this.localSet(value, key);
        this.localSet(key, value);
    },

    localGet(origin: string) {
        // Nếu bộ nhớ đệm bị tắt, luôn trả về null
        if (!config.useCache) return null;
        
        return localStorage.getItem(buildKey(origin));
    },

    localRemove(origin: string) {
        const key = buildKey(origin);
        const result = localStorage.getItem(key);
        localStorage.removeItem(key);
        if (result) {
            localStorage.removeItem(buildKey(result));
        }
    },

    // Xóa bộ nhớ đệm cứ sau 24 giờ một lần (nên được gọi mỗi khi trang được mở, tức là main.js)
    cleaner() {
        const lastSessionTimestamp = localStorage.getItem('flLastSessionTimestamp');
        const currentTime = Date.now();

        if (!lastSessionTimestamp || currentTime - parseInt(lastSessionTimestamp) > 24 * 3600000) {
            this.clean();
            localStorage.setItem('flLastSessionTimestamp', currentTime.toString());
        }
    },

    // Xóa bộ đệm dịch cho url.host hiện tại
    clean() {
        const keysToDelete = [];
        // Thu thập tất cả các phím để xóa
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) keysToDelete.push(key);
        }
        // Xóa hàng loạt
        keysToDelete.forEach(key => localStorage.removeItem(key));
    }
};

// để tuần tự hóa nút
export function stringifyNode(node: any): string {
    const serializer = new XMLSerializer();
    let outerHTML = serializer.serializeToString(node);
    // Loại bỏ các ký tự khoảng trắng thừa
    return outerHTML.replace(/\s{2,}/g, ' ').trim();
}