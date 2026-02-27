import {method, urls} from "../utils/constant";
import {commonMsgTemplate} from "../utils/template";
import {config} from "@/entrypoints/utils/config";
import {contentPostHandler} from "@/entrypoints/utils/check";

async function azureOpenai(message: any) {
    try {
        // Xác minh cấu hình cần thiết
        const apiKey = config.token[config.service];
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('Azure OpenAI API Key chưa được cấu hình, vui lòng nhập API Key hợp lệ trong cài đặt');
        }

        const endpoint = config.azureOpenaiEndpoint;
        if (!endpoint || endpoint.trim() === '') {
            throw new Error('Endpoint Azure OpenAI chưa được cấu hình, vui lòng nhập endpoint đầy đủ trong cài đặt');
        }

        // Xác minh định dạng địa chỉ điểm cuối
        if (!endpoint.includes('openai.azure.com') || !endpoint.includes('/chat/completions')) {
            throw new Error('Định dạng endpoint Azure OpenAI không đúng, vui lòng đảm bảo đúng tên miền và đường dẫn');
        }

        const headers = new Headers({
            'Content-Type': 'application/json',
            'api-key': apiKey
        });
                
        const resp = await fetch(endpoint, {
            method: method.POST,
            headers,
            body: commonMsgTemplate(message.origin)
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            let errorMessage = `Gọi Azure OpenAI API thất bại: ${resp.status} ${resp.statusText}`;
            
            // Cung cấp thông tin lỗi cụ thể hơn dựa trên mã trạng thái
            switch (resp.status) {
                case 401:
                    errorMessage = 'API Key không hợp lệ hoặc đã hết hạn, vui lòng kiểm tra Azure OpenAI API Key của bạn';
                    break;
                case 404:
                    errorMessage = 'Endpoint không tồn tại, vui lòng kiểm tra tên tài nguyên và tên triển khai';
                    break;
                case 429:
                    errorMessage = 'Tần suất gọi API vượt giới hạn, vui lòng thử lại sau hoặc kiểm tra quota';
                    break;
                case 500:
                    errorMessage = 'Lỗi nội bộ dịch vụ Azure OpenAI, vui lòng thử lại sau';
                    break;
                default:
                    errorMessage += `\nChi tiết: ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        const result = await resp.json();
        
        if (!result.choices || !result.choices[0] || !result.choices[0].message) {
            throw new Error('Định dạng dữ liệu trả về từ Azure OpenAI bất thường, vui lòng kiểm tra cấu hình mô hình');
        }
        
        return contentPostHandler(result.choices[0].message.content);
    } catch (error) {
        console.error('Gọi Azure OpenAI API thất bại:', error);
        throw error;
    }
}

export default azureOpenai;
