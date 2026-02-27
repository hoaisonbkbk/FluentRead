import { defaultOption, services } from "./option";

interface IMapping {
    [key: string]: string;
}

// Insourcing, lưu trữ thông tin bổ sung
interface IExtra {
    [key: string]: any
}

export class Config {
    on: boolean; // Có nên bật không
    autoTranslate: boolean; // Có dịch ngay không
    from: string;
    to: string;
    hotkey: string;
    style: number;
    display: number = 1;
    service: string;
    token: IMapping;
    ak: string;
    sk: string;
    appid: string;
    key: string;
    model: IMapping;
    customModel: IMapping;  // Tên mẫu tùy chỉnh
    proxy: IMapping;  // địa chỉ proxy
    custom: string; // địa chỉ dịch vụ địa phương
    extra: IExtra;  // Thông tin bổ sung (thông tin nội bộ)
    robot_id: IMapping;  // ID robot (tương thích với coze)
    system_role: IMapping;
    user_role: IMapping;
    count: number;  // Số lượng bản dịch
    theme: string;  // Chế độ chủ đề: 'tự động' | 'ánh sáng' | 'tối tăm'
    useCache: boolean; // Có nên sử dụng bộ nhớ đệm hay không
    disableFloatingBall: boolean; // Có tắt bóng nổi không
    floatingBallPosition: 'left' | 'right'; // Vị trí bóng nổi
    floatingBallHotkey: string; // Phím tắt bóng nổi
    customFloatingBallHotkey: string; // Phím tắt bóng nổi có thể tùy chỉnh
    customHotkey: string; // Tùy chỉnh phím tắt di chuột
    disableSelectionTranslator: boolean; // Có tắt tính năng dịch từ hay không
    deeplx: string; // Địa chỉ dịch vụ DeepLX
    selectionTranslatorMode: string; // Chế độ hiển thị dịch từ: 'bị vô hiệu hóa' | 'song ngữ' | 'chỉ dịch'
    newApiUrl: string; // Địa chỉ API mới
    maxConcurrentTranslations: number; // Số lượng bản dịch đồng thời tối đa
    youdaoAppKey: string; // Khóa ứng dụng dịch Youdao
    youdaoAppSecret: string; // Bí mật ứng dụng dịch Youdao
    tencentSecretId: string; // ID bí mật đám mây của Tencent
    tencentSecretKey: string; // Khóa bí mật đám mây của Tencent
    azureOpenaiEndpoint: string; // Địa chỉ điểm cuối Azure OpenAI
    animations: boolean; // Có bật hiệu ứng hoạt hình hay không
    translationStatus: boolean; // Có bật bảng tiến trình dịch toàn văn bản hay không
    inputBoxTranslationTrigger: string; // Phương thức kích hoạt dịch hộp đầu vào
    inputBoxTranslationTarget: string; // Hộp nhập ngôn ngữ đích dịch

    constructor() {
        this.on = true;
        this.autoTranslate = false;
        this.from = defaultOption.from;
        this.to = defaultOption.to;
        this.style = defaultOption.style;
        this.display = defaultOption.display;
        this.hotkey = defaultOption.hotkey;
        this.service = defaultOption.service;
        this.token = {};
        this.ak = '';
        this.sk = '';
        this.appid = '';
        this.key = '';
        this.model = {};
        this.customModel = {};
        this.proxy = {};
        this.custom = defaultOption.custom;
        this.extra = {};
        this.robot_id = {};
        this.system_role = systemRoleFactory();
        this.user_role = userRoleFactory();
        this.count = 0;
        this.theme = 'auto';  // Theo hệ thống theo mặc định
        this.useCache = true; // Bộ nhớ đệm được bật theo mặc định
        this.disableFloatingBall = false; // Bóng nổi được bật theo mặc định
        this.floatingBallPosition = 'right'; // Mặc định là ở bên phải
        this.floatingBallHotkey = 'Alt+T'; // Phím tắt mặc định là Alt+T
        this.customFloatingBallHotkey = ''; // Phím tắt tùy chỉnh trống
        this.customHotkey = ''; // Phím tắt di chuột tùy chỉnh trống
        this.disableSelectionTranslator = false; // Dịch các từ được gạch chân bị tắt theo mặc định
        this.deeplx = ''; // Địa chỉ dịch vụ mặc định DeepLX
        this.selectionTranslatorMode = 'bilingual'; // Chế độ hiển thị song ngữ mặc định
        this.newApiUrl = 'http://localhost:3000'; // Địa chỉ mặc định NewAPI
        this.maxConcurrentTranslations = 6; // Số lượng đồng thời tối đa mặc định là 6
        this.youdaoAppKey = ''; // Khóa ứng dụng dịch Youdao
        this.youdaoAppSecret = ''; // Bí mật ứng dụng dịch Youdao
        this.tencentSecretId = ''; // ID bí mật đám mây của Tencent
        this.tencentSecretKey = ''; // Khóa bí mật đám mây của Tencent
        this.azureOpenaiEndpoint = ''; // Địa chỉ điểm cuối Azure OpenAI
        this.animations = true; // Hoạt ảnh được bật theo mặc định
        this.translationStatus = true; // Bảng tiến trình dịch được bật theo mặc định
        this.inputBoxTranslationTrigger = 'disabled'; // Dịch hộp nhập bị tắt theo mặc định
        this.inputBoxTranslationTarget = 'en'; // Được dịch sang tiếng Anh theo mặc định
    }
}

// Xây dựng system_role cho tất cả các dịch vụ
function systemRoleFactory(): IMapping {
    let systems_role: IMapping = {};
    Object.keys(services).forEach(key => systems_role[key] = defaultOption.system_role);
    return systems_role;
}

// Xây dựng user_role cho tất cả dịch vụ
function userRoleFactory(): IMapping {
    let users_role: IMapping = {};
    Object.keys(services).forEach(key => users_role[key] = defaultOption.user_role);
    return users_role;
}
