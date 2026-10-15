"use strict";
// URL 编解码：encodeURIComponent / decodeURIComponent 语义。
// 额外支持 application/x-www-form-urlencoded 场景下的 + ↔ 空格互转。
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_URL_OPTS = void 0;
exports.encodeUrl = encodeUrl;
exports.decodeUrl = decodeUrl;
exports.looksUrlEncoded = looksUrlEncoded;
exports.DEFAULT_URL_OPTS = { spacePlus: false, plusToSpace: true };
function encodeUrl(text, opts = exports.DEFAULT_URL_OPTS) {
    let out = encodeURIComponent(text);
    if (opts.spacePlus)
        out = out.replace(/%20/g, '+');
    return out;
}
function decodeUrl(text, opts = exports.DEFAULT_URL_OPTS) {
    const s = opts.plusToSpace ? text.replace(/\+/g, ' ') : text;
    return decodeURIComponent(s);
}
/** 自动识别方向：含 %XX 序列视为待解码。 */
function looksUrlEncoded(text) {
    return /%[0-9A-Fa-f]{2}/.test(text);
}
