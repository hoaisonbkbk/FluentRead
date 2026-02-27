import { Config } from "@/entrypoints/utils/model";

// Khai báo loại cấu hình, new Config() sẽ đặt tất cả các giá trị mặc định
export let config: Config = new Config();
export const configReady = loadConfig();

// Kiểm tra xem đối tượng được phân tích cú pháp từ bộ lưu trữ có phải là đối tượng Cấu hình hợp lệ hay không
function isConfigObjectValid(obj: any): obj is Config {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    // Kiểm tra xem một số thuộc tính chính có tồn tại hay không để xác định xem cấu hình có hợp lệ không
    return 'on' in obj && 'service' in obj && 'from' in obj && 'to' in obj;
}

// Tải cấu hình không đồng bộ và áp dụng
async function loadConfig() {
    try {
        const value = await storage.getItem('local:config');
        if (typeof value === 'string' && value.trim().length > 0) {
            const parsedConfig = JSON.parse(value);
            if (isConfigObjectValid(parsedConfig)) {
                // Nếu cấu hình hợp lệ, hãy hợp nhất nó vào cấu hình hiện tại
                Object.assign(config, parsedConfig);
                return; // Đang tải thành công, quay lại trực tiếp
            }
        }
        // Nếu không có cấu hình trong bộ lưu trữ, cấu hình trống hoặc không hợp lệ, đối tượng cấu hình hiện tại có giá trị mặc định sẽ được lưu trong bộ lưu trữ
        await storage.setItem('local:config', JSON.stringify(config));
    } catch (error) {
        console.error('Error loading or validating config:', error);
        // Đồng thời cố gắng lưu cấu hình mặc định một lần khi xảy ra lỗi
        try {
            await storage.setItem('local:config', JSON.stringify(new Config()));
        } catch (saveError) {
            console.error('Failed to save default config after an error:', saveError);
        }
    }
}

// Theo dõi thay đổi cấu hình và cập nhật cấu hình
storage.watch('local:config', (newValue: any, oldValue: any) => {
    if (typeof newValue === 'string' && newValue.trim().length > 0) {
        try {
            const parsedConfig = JSON.parse(newValue);
            if (isConfigObjectValid(parsedConfig)) {
                // Nếu cấu hình mới hợp lệ, hãy cập nhật cấu hình
                Object.assign(config, parsedConfig);
            } else {
                console.warn('An invalid configuration was detected in storage.watch. Ignoring.');
            }
        } catch (error) {
            console.error('Error parsing new config in storage.watch:', error);
        }
    }
});