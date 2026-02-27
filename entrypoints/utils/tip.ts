import {ElMessage} from "element-plus";
import {throttle} from "@/entrypoints/utils/common";

// deprecated
const prefix = "";

function _sendErrorMessage(message: string) {
    ElMessage({message: prefix + message, type: 'error'});
}

function _sendSuccessMessage(message: string) {
    ElMessage({message: prefix + message, type: 'success'});
}

// Sử dụng gói chức năng chống rung, tin nhắn chỉ có thể được gửi một lần trong vòng 1 giây.
export const sendErrorMessage = throttle(_sendErrorMessage, 1000);
export const sendSuccessMessage = throttle(_sendSuccessMessage, 1000);
