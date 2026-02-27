import {services} from "../utils/option";
import {yiyanMsgTemplate} from "../utils/template";
import {method, urls} from "../utils/constant";
import {config} from "@/entrypoints/utils/config";

// ERNIE-Bot 4.0 Mô hình, Trang định giá Mô hình: https://console.bce.baidu.com/qianfan/chargemanage/list
// trung tâm tài liệu api: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t

// Baidu ERNIE lấy bí mật và hết hạn dựa trên ak, sk
async function yiyan(message: any) {

    let model = config.model[services.yiyan]
    // chuyển đổi tham số mô hình
    if (model === "ERNIE-Bot 4.0") model = "completions_pro"
    else if (model === "ERNIE-Bot") model = "completions"
    else if (model === "ERNIE-Speed-8K") model = "ernie_speed"
    else if (model === "ERNIE-Speed-128K") model = "ernie-speed-128k"

    const secret = await getSecret();
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${secret}`;

    // Bắt đầu yêu cầu tìm nạp
    const resp = await fetch(url, {
        method: method.POST,
        headers: {'Content-Type': 'application/json'},
        body: yiyanMsgTemplate(message.origin)
    });

    if (resp.ok) {
        let result = await resp.json();
        if (result.error_code) throw new Error(`Dịch thất bại: ${result.error_code} ${result.error_msg}`)
        return result.result
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

async function getSecret() {
    let secret, expiration;
    config.extra[services.yiyan] && ({secret, expiration} = config.extra[services.yiyan]);

    // Kiểm tra xem bí mật có tồn tại và chưa hết hạn không
    if (secret && config.ak && config.sk && expiration > Date.now()) return secret;

    // Xây dựng các tham số yêu cầu
    let params = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': config.ak,
        'client_secret': config.sk,
    });

    // Bắt đầu yêu cầu tìm nạp
    const resp = await fetch(urls[config.service].tokenUrl, {
        method: method.POST,
        body: params
    });

    const res = await resp.json();
    if (resp.ok && res.access_token) {
        // Lấy phạm vi thời gian hợp lệ, thời hạn hiệu lực là 30 ngày (tính bằng giây), cần x1000 để chuyển đổi thành mili giây
        let expiration = new Date().getTime() + res.expires_in * 1000;
        // Bí mật bộ đệm và hết hạn
        config.extra[services.yiyan] = {secret: res.access_token, expiration: expiration};
        storage.setItem('local:config', JSON.stringify(config));
        return res.access_token;
    } else throw new Error(res.error_description || 'Lấy token Baidu ERNIE thất bại');
}

export default yiyan;