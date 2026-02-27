export const services = {
    // Máy dịch truyền thống
    microsoft: "microsoft",
    deepL: "deepL",
    deeplx: "deeplx",
    google: "google",
    xiaoniu: "xiaoniu",
    youdao: "youdao",
    tencent: "tencent", // Máy dịch vụ Tencent Cloud
    // Bản dịch mô hình lớn
    openai: "openai",
    azureOpenai: "azureOpenai", // Azure OpenAI
    gemini: "gemini",
    yiyan: "yiyan",
    tongyi: "tongyi",
    zhipu: "zhipu",
    moonshot: "moonshot",
    claude: "claude",
    custom: "custom",
    infini: "infini",
    // baidu: 'baidu',
    baichuan: "baichuan",
    lingyi: "lingyi",
    deepseek: "deepseek",
    minimax: "minimax",
    jieyue: "jieyue", // StepFun
    groq: "groq",
    cozecom: "cozecom", // coze hỗ trợ robot nhưng không hỗ trợ Mô hình
    cozecn: "cozecn",
    huanYuan: "huanYuan", // Tencent Hunyuan
    huanYuanTranslation: "huanYuanTranslation", // Mô hình lớn Tencent Hunyuan Dịch
    doubao: "doubao", // Doubao
    siliconCloud: "siliconCloud", // dòng chảy silicon
    openrouter: "openrouter", // openrouter
    grok: "grok", // Grok của X.AI
    newapi: "newapi", // Giao diện API mới
    chromeTranslator: "chromeTranslator", // API dịch tích hợp của Chrome
};

export const servicesType = {
    // phân trại
    machine: new Set([services.microsoft, services.deepL, services.deeplx, services.google, services.xiaoniu, services.youdao, services.tencent, services.chromeTranslator,]),
    AI: new Set([
        services.openai,
        services.azureOpenai,
        services.gemini,
        services.yiyan,
        services.tongyi,
        services.zhipu,
        services.moonshot,
        services.claude, services.custom,
        services.infini,
        services.baichuan,
        services.deepseek,
        services.lingyi,
        services.minimax,
        services.jieyue,
        services.groq,
        services.cozecom,
        services.cozecn,
        services.huanYuan,
        services.huanYuanTranslation,
        services.doubao,
        services.siliconCloud,
        services.openrouter,
        services.grok,
        services.newapi,
    ]),
    // yêu cầu mã thông báo
    useToken: new Set([
        services.openai,
        services.azureOpenai,
        services.gemini,
        services.tongyi,
        services.zhipu,
        services.moonshot,
        services.claude,
        services.deepL,
        services.deeplx,
        services.xiaoniu,
        services.infini,
        services.baichuan,
        services.deepseek,
        services.lingyi,
        services.minimax,
        services.jieyue,
        services.groq,
        services.custom,
        services.cozecom,
        services.cozecn,
        services.huanYuan,
        services.doubao,
        services.siliconCloud,
        services.openrouter,
        services.grok,
        services.newapi,
    ]),
    // yêu cầu mô hình
    useModel: new Set([
        services.openai,
        services.azureOpenai,
        services.gemini,
        services.yiyan,
        services.tongyi,
        services.zhipu,
        services.moonshot,
        services.claude,
        services.custom,
        services.infini,
        services.baichuan,
        services.deepseek,
        services.lingyi,
        services.minimax,
        services.jieyue,
        services.groq,
        services.huanYuan,
        services.huanYuanTranslation,
        services.doubao,
        services.siliconCloud,
        services.openrouter,
        services.grok,
        services.newapi,
    ]),
    // đại lý hỗ trợ
    useProxy: new Set([
        services.openai,
        services.azureOpenai,
        services.gemini,
        services.claude,
        services.google,
        services.deepL,
        services.deeplx,
        services.moonshot,
        services.tongyi,
        services.xiaoniu,
        services.youdao,
        services.tencent,
        services.baichuan,
        services.deepseek,
        services.lingyi,
        services.jieyue,
        services.groq,
        services.cozecom,
        services.cozecn,
        services.huanYuan,
        services.huanYuanTranslation,
        services.doubao,
        services.siliconCloud,
        services.openrouter,
        services.grok,
    ]),
    // Các dịch vụ hỗ trợ URL tùy chỉnh
    useCustomUrl: new Set([
        services.custom,
        services.deeplx,
        services.newapi,
        services.azureOpenai,
    ]),

    isMachine: (service: string) => servicesType.machine.has(service),
    isAI: (service: string) => servicesType.AI.has(service),
    isUseToken: (service: string) => servicesType.useToken.has(service),
    isUseProxy: (service: string) => servicesType.useProxy.has(service),
    isUseModel: (service: string) => servicesType.useModel.has(service),
    isCustom: (service: string) => service === services.custom,
    isNewApi: (service: string) => service === services.newapi,
    isUseAkSk: (service: string) => service === services.yiyan,
    isCoze: (service: string) => service === services.cozecom || service === services.cozecn,
    isYoudao: (service: string) => service === services.youdao,
    isTencent: (service: string) => service === services.tencent || service === services.huanYuanTranslation,
    isAzureOpenai: (service: string) => service === services.azureOpenai,
    isUseCustomUrl: (service: string) => servicesType.useCustomUrl.has(service),
};

export const customModelString = "Mô hình tùy chỉnh";
export const models = new Map<string, Array<string>>([
    [services.openai, ["gpt-5-nano", "gpt-5-mini", "gpt5", "gpt-5-chat-latest", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o-mini", "gpt-4o", "o3", "o3-mini", customModelString]],
    [services.azureOpenai, ["gpt-5-nano", "gpt-5-mini", "gpt5", "gpt-5-chat-latest", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o-mini", "gpt-4o", "o3", "o3-mini", customModelString]],
    [services.gemini, ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro", customModelString]],
    [services.yiyan, ["ERNIE-Bot 4.0", "ERNIE-Bot", "ERNIE-Speed-8K"]],
    [services.tongyi, ["qwen-long", "qwen-turbo", "qwen-plus", "qwen3-8b", "qwen-mt-plus", "qwen-mt-turbo", customModelString]],
    [services.zhipu, ["glm-4.5", "GLM-4-Flash", "glm-4-plus", "glm-4", "glm-4v", customModelString]],
    [services.moonshot, ["kimi-k2-0711-preview", "kimi-k2-turbo-preview", "moonshot-v1-auto", "moonshot-v1-8k", "moonshot-v1-32k", customModelString]],
    [services.claude, ["claude-sonnet-4-0", "claude-opus-4-1", "claude-3-5-haiku-latest"]],
    [services.custom, ["gpt-5-nano", "gpt-5-mini", "gpt5", "gpt-4o", "gemma:7b", "llama2:7b", "mistral:7b", customModelString]],
    [services.infini, ["llama-2-13b-chat", "llama-3.3-70b-instruct", "qwen2.5-14b-instruct", "gemma-2-27b-it", "glm-4-9b-chat", customModelString]],
    [services.baichuan, ["Baichuan4-Air", "Baichuan4-Turbo", "Baichuan4", customModelString]],
    [services.lingyi, ["yi-lightning", customModelString]],
    [services.deepseek, ["deepseek-chat", "deepseek-reasoner", customModelString]],
    [services.minimax, ["chatcompletion_v2"]],
    [services.jieyue, ["step-1-8k", customModelString]],
    [services.huanYuan, ["hunyuan-turbos-latest", "hunyuan-t1-latest", "hunyuan-a13b", "hunyuan-lite", "hunyuan-standard", customModelString]],
    [services.huanYuanTranslation, ["hunyuan-translation", "hunyuan-translation-lite", customModelString]],
    [services.newapi, ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gpt-5-nano", "gpt-5-mini", "gpt5", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o-mini", customModelString]],
    [services.grok, ["grok-4-0709","grok-3-mini", customModelString]],
    [services.doubao, [customModelString]],

    // mix model
    [services.siliconCloud, ["Qwen/Qwen3-Coder-30B-A3B-Instruct", "Qwen/Qwen3-8B", "THUDM/GLM-Z1-9B-0414", "THUDM/GLM-4-9B-0414",
        "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
        "Qwen/Qwen2.5-7B-Instruct", "internlm/internlm2_5-7b-chat", "THUDM/glm-4-9b-chat", customModelString]],

    [services.groq, ["llama-3.1-8b-instant", "llama3-8b-8192", "llama-3.3-70b-versatile", "gemma2-9b-it", "mixtral-8x7b-32768", "whisper-large-v3", customModelString]],
    [services.openrouter, ["meta-llama/llama-3.1-8b-instruct", "google/gemini-2.0-flash-exp", "qwen/qwen-2-7b-instruct", "huggingfaceh4/zephyr-7b-beta", customModelString]]
]);

export const options = {
    on: [
        {value: true, label: "Bật"},
        {value: false, label: "Tắt"},
    ],
    // Có dịch ngay không
    autoTranslate: [
        {value: true, label: "Bật"},
        {value: false, label: "Tắt"},
    ],
    // Có nên sử dụng bộ nhớ đệm hay không
    useCache: [
        {value: true, label: "Bật"},
        {value: false, label: "Tắt"},
    ],
    form: [{value: "auto", label: "Tự động nhận diện"}],
    to: [
        {value: "vi", label: "Tiếng Việt"},
        {value: "zh-Hans", label: "Tiếng Trung"},
        {value: "en", label: "Tiếng Anh"},
        {value: "ja", label: "Tiếng Nhật"},
        {value: "ko", label: "Tiếng Hàn"},
        {value: "fr", label: "Tiếng Pháp"},
        {value: "ru", label: "Tiếng Nga"},
    ],
    keys: [
        {value: "none", label: "Tắt phím tắt"},

        {value: "Computer", label: "Tùy chọn bàn phím", disabled: true},
        {value: "Control", label: "Ctrl"},
        {value: "Alt", label: "Alt"},
        {value: "Shift", label: "Shift"},
        {value: "Escape", label: "ESC"},
        {value: "`", label: "Phím dấu ngã (~)"},

        {value: "mouse", label: "Tùy chọn chuột", disabled: true},
        {value: "DoubleClick", label: "Nhấp đúp chuột"},
        {value: "LongPress", label: "Nhấn giữ chuột"},
        {value: "MiddleClick", label: "Nhấp nút giữa chuột"},

        {value: "touchscreen", label: "Tùy chọn thiết bị cảm ứng", disabled: true},
        {value: "TwoFinger", label: "Dịch bằng 2 ngón"},
        {value: "ThreeFinger", label: "Dịch bằng 3 ngón"},
        {value: "FourFinger", label: "Dịch bằng 4 ngón"},
        {value: "DoubleClickScree", label: "Dịch bằng nhấp đúp"},
        {value: "TripleClickScree", label: "Dịch bằng nhấp ba lần"},
        
        {value: "custom", label: "Phím tắt tùy chỉnh (thử nghiệm)"},
    ],
    services: [
        // Máy dịch truyền thống
        {value: "machine", label: "Dịch máy", disabled: true},
        {value: services.microsoft, label: "Microsoft Dịch"},
        {value: services.google, label: "Google Dịch"},
        {value: services.deepL, label: "DeepL"},
        {value: services.deeplx, label: "DeepLX"},
        {value: services.xiaoniu, label: "Xiaoniu Dịch"},
        {value: services.youdao, label: "Youdao Dịch"},
        {value: services.tencent, label: "Tencent Cloud Dịch"},
        // Bản dịch mô hình lớn
        {value: "ai", label: "Dịch AI", disabled: true},
        {value: services.chromeTranslator, label: "Dịch AI tích hợp Chrome ⭐"},
        {value: services.siliconCloud, label: "SiliconFlow ⭐️"},
        {value: services.huanYuan, label: "Tencent Hunyuan ⭐"},
        {value: services.newapi, label: "New API"},
        {value: services.deepseek, label: "DeepSeek️"},
        {value: services.openai, label: "OpenAI"},
        {value: services.azureOpenai, label: "Azure OpenAI"},
        {value: services.huanYuanTranslation, label: "Tencent Hunyuan Dịch"},
        {value: services.tongyi, label: "Alibaba Tongyi"},
        {value: services.doubao, label: "Doubao"},
        {value: services.grok, label: "Grok (X.AI)"},
        {value: services.openrouter, label: "OpenRouter"},
        {value: services.groq, label: "Groq"},
        {value: services.moonshot, label: "Kimi"},
        {value: services.zhipu, label: "Zhipu Qingyan"},
        {value: services.baichuan, label: "Baichuan"},
        {value: services.lingyi, label: "01.AI"},
        {value: services.minimax, label: "MiniMax"},
        {value: services.jieyue, label: "StepFun"},
        {value: services.infini, label: "Infini"},
        {value: services.cozecom, label: "Coze Quốc tế"},
        {value: services.cozecn, label: "Coze Trung Quốc"},
        {value: services.claude, label: "Claude"},
        {value: services.gemini, label: "Gemini"},
        {value: services.yiyan, label: "Baidu ERNIE"},
        {value: services.custom, label: "API tùy chỉnh ⭐️"},
    ],
    display: [
        {value: 0, label: "Chỉ hiển thị bản dịch"},
        {value: 1, label: "Chế độ song ngữ đối chiếu"},
    ],
    // Phong cách dịch song ngữ
    styles: [
        // Kiểu cơ bản
        {value: "basic", label: "Kiểu cơ bản", disabled: true},
        {value: 0, label: "Đơn giản", class: "fluent-display-default", group: "basic"},
        {value: 1, label: "In đậm", class: "fluent-display-bold", group: "basic"},
        {value: 2, label: "Nghiêng thanh lịch", class: "fluent-display-italic", group: "basic"},
        {value: 3, label: "Đổ bóng nổi", class: "fluent-display-text-shadow", group: "basic"},

        // Nhóm gạch chân
        {value: "underline", label: "Nhóm gạch chân", disabled: true},
        {value: 4, label: "Gạch chân xanh liền", class: "fluent-display-solid-underline", group: "underline"},
        {value: 5, label: "Gạch chân nét đứt", class: "fluent-display-dot-underline", group: "underline"},
        {value: 6, label: "Gạch chân lượn sóng", class: "fluent-display-wavy", group: "underline"},

        // Nhóm thẻ
        {value: "card", label: "Nhóm thẻ", disabled: true},
        {value: 7, label: "Thẻ tối giản", class: "fluent-display-card-mode", group: "card"},
        {value: 8, label: "Thẻ chuyển màu", class: "fluent-display-modern-card", group: "card"},
        {value: 9, label: "Thẻ giấy", class: "fluent-display-paper", group: "card"},

        // Nhóm tô sáng
        {value: "highlight", label: "Nhóm tô sáng", disabled: true},
        {value: 10, label: "Đánh dấu học tập", class: "fluent-display-learning-mode", group: "highlight"},
        {value: 11, label: "Bút dạ quang", class: "fluent-display-marker", group: "highlight"},
        {value: 12, label: "Chuyển sắc dịu", class: "fluent-display-highlight-fade", group: "highlight"},

        // Nhóm nền màu
        {value: "background", label: "Nhóm nền màu", disabled: true},
        {value: 13, label: "Nền vàng ấm", class: "fluent-display-lightyellow", group: "background"},
        {value: 14, label: "Nền xanh tươi", class: "fluent-display-lightblue", group: "background"},
        {value: 15, label: "Nền xám nhã", class: "fluent-display-lightgray", group: "background"},

        // Hiệu ứng đặc biệt
        {value: "special", label: "Hiệu ứng đặc biệt", disabled: true},
        {value: 16, label: "Trích dẫn trang nhã", class: "fluent-display-quote", group: "special"},
        {value: 17, label: "Viền nhẹ", class: "fluent-display-border", group: "special"},
        {value: 18, label: "Tập trung đọc", class: "fluent-display-focus", group: "special"},
        {value: 19, label: "Đường chân tối giản", class: "fluent-display-clean", group: "special"},

        // Kiểu chuyên nghiệp
        {value: "pro", label: "Kiểu chuyên nghiệp", disabled: true},
        {value: 20, label: "Phong cách mã", class: "fluent-display-tech", group: "pro"},
        {value: 21, label: "Phong cách sách", class: "fluent-display-elegant", group: "pro"},

        // Minh bạch
        {value: "transparent", label: "Hiệu ứng trong suốt", disabled: true},
        {value: 22, label: "Bán trong suốt", class: "fluent-display-dimmed", group: "transparent"},
        {value: 23, label: "Trong suốt nhẹ", class: "fluent-display-transparent-mode", group: "transparent"},
    ],
    // Tùy chọn phím tắt bóng nổi
    floatingBallHotkeys: [
        {value: "none", label: "Tắt phím tắt"},
        {value: "Alt+T", label: "Alt+T / Option+T (mặc định)"},
        {value: "Alt+A", label: "Alt+A / Option+A"},
        {value: "Alt+S", label: "Alt+S / Option+S"},
        {value: "Alt+D", label: "Alt+D / Option+D"},
        {value: "Alt+Q", label: "Alt+Q / Option+Q"},
        {value: "Ctrl+Shift+T", label: "Ctrl+Shift+T / Control+Shift+T"},
        {value: "Ctrl+Shift+A", label: "Ctrl+Shift+A / Control+Shift+A"},
        {value: "F9", label: "F9"},
        {value: "F10", label: "F10"},
        {value: "F11", label: "F11"},
        {value: "F12", label: "F12"},
        {value: "custom", label: "Phím tắt tùy chỉnh (thử nghiệm)"},
    ],
    theme: [
        {value: "auto", label: "Theo hệ điều hành"},
        {value: "light", label: "Giao diện sáng"},
        {value: "dark", label: "Giao diện tối"},
    ],
    // Hộp nhập Tùy chọn đích dịch ngôn ngữ
    inputBoxTranslationTarget: [
        {value: "vi", label: "Tiếng Việt"},
        {value: "zh-Hans", label: "Tiếng Trung"},
        {value: "en", label: "Tiếng Anh"},
        {value: "ja", label: "Tiếng Nhật"},
        {value: "ko", label: "Tiếng Hàn"},
        {value: "fr", label: "Tiếng Pháp"},
        {value: "ru", label: "Tiếng Nga"},
        {value: "es", label: "Tiếng Tây Ban Nha"},
        {value: "de", label: "Tiếng Đức"},
        {value: "pt", label: "Tiếng Bồ Đào Nha"},
        {value: "it", label: "Tiếng Ý"},
    ],
    // Dịch trong các tùy chọn chế độ kích hoạt nhập ô
    inputBoxTranslationTrigger: [
        {value: "disabled", label: "Tắt"},
        {value: "triple_space", label: "Nhấn phím cách 3 lần"},
        {value: "triple_equal", label: "Nhấn dấu bằng (=) 3 lần"},
        {value: "triple_dash", label: "Nhấn dấu gạch ngang (-) 3 lần"},
    ],
};

export const defaultOption = {
    on: true,
    from: "auto",
    to: "vi",
    style: 1,
    display: 1,
    hotkey: "Control",
    service: services.microsoft,
    custom: "http://localhost:11434/v1/chat/completions",
    deeplx: "http://localhost:1188/translate",
    system_role:
        "You are a professional, authentic machine translation engine.",
    user_role: `Translate the following text into {{to}}, If translation is unnecessary (e.g. proper nouns, codes, etc.), return the original text. NO explanations. NO notes:

{{origin}}`,
    count: 0,
    useCache: true,
    floatingBallHotkey: "Alt+T", // Phím tắt bóng nổi mặc định
    inputBoxTranslationTrigger: "disabled", // DefaultTắt dịch dịch
    inputBoxTranslationTarget: "vi", // Được dịch sang tiếng Việt theo mặc định
};

