import {services} from "../utils/option";
import {config} from "@/entrypoints/utils/config";

async function microsoft(message: any) {
    let fromLang = config.from === 'auto' ? '' : config.from;

    const jwtToken = await refreshToken(config.token[services.microsoft]);
    const resp = await fetch(`https://api-edge.cognitive.microsofttranslator.com/translate?from=${fromLang}&to=${config.to}&api-version=3.0&includeSentenceLength=true&textType=html`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': config.token[services.microsoft],
            'Authorization': 'Bearer ' + jwtToken
        },
        body: JSON.stringify([{Text: message.origin}])
    });

    if (resp.ok) {
        let result = await resp.json();
        return result[0].translations[0].text;
    } else {
        console.log(resp)
        throw new Error(`Dịch thất bại: ${resp.status} ${resp.statusText} body: ${await resp.text()}`);
    }
}

async function refreshToken(token: string) {
    const decodedToken = parseJwt(token);
    const currentTimestamp = Math.floor(Date.now() / 1000); // Dấu thời gian UNIX của thời gian hiện tại (giây)
    if (decodedToken && currentTimestamp < decodedToken.exp) {
        return token;
    }
    // Nếu mã thông báo không hợp lệ hoặc hết hạn, hãy thử lấy mã thông báo mới
    const resp = await fetch("https://edge.microsoft.com/translate/auth")
    if (resp.ok) return resp.text();
    else throw new Error(`Yêu cầu thất bại: ${resp}`);
}

// Phân tích cú pháp jwt và trả về đối tượng được phân tích cú pháp
function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export default microsoft;