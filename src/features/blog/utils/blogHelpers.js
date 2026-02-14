// src/features/blog/utils/blogHelpers.js

export const getThumbnail = (content) => {
    if (!content || !Array.isArray(content)) {
        return 'https://imagedelivery.net/mYCNH6-2h27PJijuhYd-fw/32c7501a-ed3b-4466-876b-48bcfb13d600/public';
    }
    const imgBlock = content.find(b => b.type === 'image' && b.content);
    return imgBlock ? imgBlock.content : 'https://imagedelivery.net/mYCNH6-2h27PJijuhYd-fw/32c7501a-ed3b-4466-876b-48bcfb13d600/public';
};

export const getExcerpt = (content, length = 120) => {
    if (!content || !Array.isArray(content)) return '';
    const textBlock = content.find(b => b.type === 'text');
    if (!textBlock) return '';
    
    // Tạo DOM ảo để strip HTML (An toàn hơn Regex)
    const tmp = document.createElement("DIV");
    tmp.innerHTML = textBlock.content;
    const plain = tmp.textContent || tmp.innerText || "";
    return plain.substring(0, length) + (plain.length > length ? '...' : '');
};

export const calculateReadTime = (content) => {
    // Biến tấu: Tính thời gian đọc giả định
    const text = getExcerpt(content, 9999);
    const wpm = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wpm);
};