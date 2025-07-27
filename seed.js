const mongoose = require('mongoose');
const crypto = require('crypto'); // [SỬA LỖI] Import module crypto để tạo UUID
require('dotenv').config();

// Đảm bảo đường dẫn đến các file model là chính xác
const Product = require('./src/models/product.model');
const InvitationTemplate = require('./src/models/invitationTemplate.model');
const User = require('./src/models/user.model');
const Invitation = require('./src/models/invitation.model');
const DesignAsset = require('./src/services/designAsset.service');

DesignAsset.seedAssets();
// =================================================================
// DỮ LIỆU MẪU CHI TIẾT CHO TEMPLATES
// =================================================================

const defaultItemProps = {
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    brightness: 1,
    contrast: 1,
    grayscale: 0,
    zIndex: 5,
};

const detailedTemplates = [
    // ================== CÁC TEMPLATE HIỆN CÓ ==================
    {
        category: 'Thiệp Mời', type: 'Cổ Điển', title: 'Mẫu Cổ điển - Vườn Địa Đàng',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp1.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#5B4B49', fontFamily: 'Garamond' },
            pages: [
                {
                    name: "Trang Bìa",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-1-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Trân trọng kính mời', x: 250, y: 120, width: 300, height: 50, fontSize: 36, fontFamily: 'Garamond', color: '#5B4B49', zIndex: 7 },
                        { ...defaultItemProps, type: 'text', content: 'Anh Tuấn\n&\nBảo Ngọc', x: 200, y: 300, width: 400, height: 120, fontSize: 52, fontFamily: 'Garamond', color: '#5B4B49', zIndex: 6 },
                        { ...defaultItemProps, type: 'text', content: 'Save the Date: 26.10.2025', x: 250, y: 600, width: 300, height: 40, fontSize: 20, fontFamily: 'Garamond', color: '#5B4B49', zIndex: 8 },
                    ]
                },
                {
                    name: "Thông tin Lễ Cưới",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-1-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Hôn lễ sẽ được cử hành vào lúc', x: 200, y: 150, width: 400, height: 50, fontSize: 28, fontFamily: 'Garamond', color: '#5B4B49' },
                        { ...defaultItemProps, type: 'text', content: '18:00, Thứ Bảy, 26.10.2025', x: 200, y: 250, width: 400, height: 60, fontSize: 34, fontFamily: 'Garamond', color: '#5B4B49' },
                        { ...defaultItemProps, type: 'text', content: 'Tại Trung tâm Hội nghị The Adora\n123 Hoàng Văn Thụ, Q. Phú Nhuận, TP.HCM', x: 150, y: 500, width: 500, height: 100, fontSize: 22, fontFamily: 'Garamond', color: '#5B4B49' },
                    ]
                },
            ]
        }
    },
    {
        category: 'Thiệp Mời', type: 'Hiện Đại', title: 'Tối Giản Tinh Tế',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp2.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#333333', fontFamily: 'Montserrat' },
            pages: [
                {
                    name: "Bìa Tối Giản",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-2-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Minh Khang\n&Thanh Mai', x: 150, y: 300, width: 500, height: 150, fontSize: 64, fontFamily: 'Montserrat', color: '#333333', zIndex: 6, fontWeight: '300' },
                        { ...defaultItemProps, type: 'text', content: 'ARE GETTING MARRIED', x: 250, y: 460, width: 300, height: 40, fontSize: 18, fontFamily: 'Montserrat', color: '#555555', zIndex: 8, letterSpacing: '0.2em' },
                        { ...defaultItemProps, type: 'text', content: '15.11.2025', x: 300, y: 650, width: 200, height: 40, fontSize: 22, fontFamily: 'Montserrat', color: '#333333', zIndex: 7 },
                    ]
                },
                {
                    name: "Thông tin Chi tiết",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-2-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Join us to celebrate', x: 100, y: 150, width: 600, height: 50, fontSize: 42, fontFamily: 'Montserrat', color: '#333333' },
                        { ...defaultItemProps, type: 'text', content: 'SATURDAY, 15TH NOVEMBER 2025 AT 6:00 PM', x: 100, y: 250, width: 600, height: 60, fontSize: 24, fontFamily: 'Montserrat', color: '#333333', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'GEM Center\n8 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1, TP.HCM', x: 100, y: 400, width: 600, height: 100, fontSize: 20, fontFamily: 'Montserrat', color: '#555555', lineHeight: '1.5' },
                    ]
                },
            ]
        }
    },
    {
        category: 'Thiệp Mời', type: 'Mộc Mạc', title: 'Chuyện Tình Đồng Quê',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp3.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#6B4F4F', fontFamily: 'Dancing Script' },
            pages: [
                {
                    name: "Bìa Rustic",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-3-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Together with their families', x: 200, y: 150, width: 400, height: 50, fontSize: 24, fontFamily: 'Lato', color: '#6B4F4F' },
                        { ...defaultItemProps, type: 'text', content: 'Gia Bảo\n&\nNgọc Anh', x: 200, y: 250, width: 400, height: 200, fontSize: 72, fontFamily: 'Dancing Script', color: '#6B4F4F' },
                        { ...defaultItemProps, type: 'text', content: 'INVITE YOU TO CELEBRATE THEIR WEDDING', x: 150, y: 550, width: 500, height: 40, fontSize: 18, fontFamily: 'Lato', color: '#A0522D', letterSpacing: '0.1em' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Mời', type: 'Sang Trọng', title: 'Đêm Tiệc Gatsby',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp4.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#DAA520', fontFamily: 'Playfair Display' },
            pages: [
                {
                    name: "Bìa Luxury",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-4-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'THE WEDDING OF', x: 250, y: 200, width: 300, height: 40, fontSize: 24, fontFamily: 'Poppins', color: '#FFFFFF', letterSpacing: '0.3em' },
                        { ...defaultItemProps, type: 'text', content: 'Quốc Huy\n&\nDiễm My', x: 200, y: 300, width: 400, height: 200, fontSize: 68, fontFamily: 'Playfair Display', color: '#DAA520', fontStyle: 'italic' },
                        { ...defaultItemProps, type: 'text', content: '29 . 12 . 2025', x: 300, y: 600, width: 200, height: 40, fontSize: 28, fontFamily: 'Poppins', color: '#FFFFFF' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Cảm Ơn', type: 'Nhiệt Đới', title: 'Cảm Ơn Từ Trái Tim',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp5.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#008080', fontFamily: 'Quicksand' },
            pages: [
                {
                    name: "Cảm Ơn Từ Trái Tim",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-5-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Thank You', x: 250, y: 350, width: 300, height: 80, fontSize: 62, fontFamily: 'Quicksand', color: '#005f5f', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'For celebrating with us', x: 200, y: 450, width: 400, height: 40, fontSize: 22, fontFamily: 'Quicksand', color: '#333333' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Sinh Nhật', type: 'Trẻ Em', title: 'Phi Hành Gia Nhí',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp6.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#191970', fontFamily: 'Baloo' },
            pages: [
                {
                    name: "Thiệp Mời Sinh Nhật",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-6-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'MỜI BẠN ĐẾN DỰ TIỆC', x: 150, y: 100, width: 500, height: 60, fontSize: 48, fontFamily: 'Baloo', color: '#FFFF00' },
                        { ...defaultItemProps, type: 'text', content: 'SINH NHẬT LẦN THỨ 5', x: 200, y: 200, width: 400, height: 80, fontSize: 56, fontFamily: 'Baloo', color: '#FFFFFF' },
                        { ...defaultItemProps, type: 'text', content: 'CỦA BÉ KEN', x: 250, y: 300, width: 300, height: 60, fontSize: 40, fontFamily: 'Baloo', color: '#FFFF00' },
                        { ...defaultItemProps, type: 'text', content: 'Vào lúc 15:00, Chủ Nhật, 10.08.2025\nTại TiniWorld, Aeon Mall', x: 150, y: 550, width: 500, height: 100, fontSize: 28, fontFamily: 'Baloo', color: '#FFFFFF' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Sự Kiện', type: 'Khai Trương', title: 'Grand Opening - Khai Trương Hồng Phát',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp7.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#B8860B', fontFamily: 'Roboto' },
            pages: [
                {
                    name: "Thư Mời Khai Trương",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-7-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'THƯ MỜI', x: 100, y: 150, width: 300, height: 50, fontSize: 42, fontFamily: 'Roboto', color: '#0047AB', fontWeight: 'bold', letterSpacing: '0.1em' },
                        { ...defaultItemProps, type: 'text', content: 'LỄ KHAI TRƯƠNG\nTHE COFFEE HOUSE', x: 100, y: 250, width: 600, height: 180, fontSize: 68, fontFamily: 'Roboto', color: '#333333', fontWeight: '900' },
                        { ...defaultItemProps, type: 'text', content: 'Trân trọng kính mời Quý khách đến tham dự buổi lễ.', x: 100, y: 450, width: 600, height: 40, fontSize: 22, fontFamily: 'Roboto', color: '#555555' },
                        { ...defaultItemProps, type: 'text', content: '09:00 Sáng, Thứ Sáu, 22.08.2025 | 25 Ngô Quyền, Hoàn Kiếm, Hà Nội', x: 100, y: 600, width: 600, height: 40, fontSize: 24, fontFamily: 'Roboto', color: '#0047AB' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Chúc Mừng', type: 'Mừng Em Bé', title: 'Chào Đón Thiên Thần Nhỏ',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp8.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#FFC0CB', fontFamily: 'Nunito' },
            pages: [
                {
                    name: "Thiệp Mời Baby Shower",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-8-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Oh Girl!', x: 250, y: 150, width: 300, height: 100, fontSize: 82, fontFamily: 'Nunito', color: '#FF69B4', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'Join us for a Baby Shower', x: 200, y: 300, width: 400, height: 50, fontSize: 28, fontFamily: 'Nunito', color: '#555555' },
                        { ...defaultItemProps, type: 'text', content: 'Honoring\nMom-to-be An Nhiên', x: 200, y: 400, width: 400, height: 100, fontSize: 36, fontFamily: 'Nunito', color: '#333333' },
                        { ...defaultItemProps, type: 'text', content: 'Sunday, Sep 21st, 2025 at 2:00 PM', x: 150, y: 600, width: 500, height: 50, fontSize: 24, fontFamily: 'Nunito', color: '#FF69B4' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Mời', type: 'Truyền Thống', title: 'Trăm Năm Tình Viên Mãn',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp9.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#C8283E', fontFamily: 'serif' },
            pages: [
                {
                    name: "Thiệp Báo Hỷ",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-9-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'THIỆP BÁO HỶ', x: 250, y: 120, width: 300, height: 50, fontSize: 36, fontFamily: 'serif', color: '#DFBD69', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'Lễ Thành Hôn', x: 200, y: 250, width: 400, height: 60, fontSize: 48, fontFamily: 'serif', color: '#333333' },
                        { ...defaultItemProps, type: 'text', content: 'Chú rể: Thành Danh\nSánh duyên cùng\nCô dâu: Mỹ Lệ', x: 200, y: 350, width: 400, height: 150, fontSize: 32, fontFamily: 'serif', color: '#333333', lineHeight: '1.5' },
                        { ...defaultItemProps, type: 'text', content: 'Hôn lễ được cử hành tại tư gia', x: 200, y: 600, width: 400, height: 40, fontSize: 22, fontFamily: 'serif', color: '#DFBD69' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Gia Đình', type: 'Tân Gia', title: 'Mừng Nhà Mới An Khang',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp3.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#8B4513', fontFamily: 'Lato' },
            pages: [
                {
                    name: "Thiệp Mời Tân Gia",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-3-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'LỜI MỜI TÂN GIA', x: 200, y: 150, width: 400, height: 50, fontSize: 42, fontFamily: 'Lato', color: '#6B4F4F', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'Gia đình chúng tôi trân trọng kính mời bạn\nđến chung vui tại ngôi nhà mới.', x: 150, y: 280, width: 500, height: 100, fontSize: 24, fontFamily: 'Lato', color: '#333' },
                        { ...defaultItemProps, type: 'text', content: 'Vào lúc: 11:00, Chủ Nhật, 17.08.2025\nĐịa chỉ: 123 Đường Hạnh Phúc, P. An Lạc, Q. Bình Tân', x: 150, y: 450, width: 500, height: 120, fontSize: 22, fontFamily: 'Lato', color: '#6B4F4F' },
                        { ...defaultItemProps, type: 'text', content: 'Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi!', x: 100, y: 650, width: 600, height: 50, fontSize: 20, fontFamily: 'Lato', color: '#A0522D', fontStyle: 'italic' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Chúc Mừng', type: 'Tốt Nghiệp', title: 'Hành Trình Mới Bắt Đầu',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp2.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#2c3e50', fontFamily: 'Montserrat' },
            pages: [
                {
                    name: "Thiệp Mời Tốt Nghiệp",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-2-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'THE GRADUATION OF', x: 200, y: 200, width: 400, height: 40, fontSize: 20, fontFamily: 'Montserrat', color: '#34495e', letterSpacing: '0.2em' },
                        { ...defaultItemProps, type: 'text', content: 'TRẦN GIA HÂN', x: 150, y: 300, width: 500, height: 80, fontSize: 64, fontFamily: 'Montserrat', color: '#2c3e50', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'CỬ NHÂN KINH TẾ\nĐẠI HỌC KINH TẾ TP.HCM', x: 150, y: 420, width: 500, height: 80, fontSize: 24, fontFamily: 'Montserrat', color: '#7f8c8d' },
                        { ...defaultItemProps, type: 'text', content: 'Mời bạn đến dự tiệc mừng tại nhà hàng The Log\nvào 19:00, Thứ Bảy, 30.11.2025', x: 100, y: 600, width: 600, height: 80, fontSize: 20, fontFamily: 'Montserrat', color: '#34495e' },
                    ]
                }
            ]
        }
    },
    {
        category: 'Thiệp Sự Kiện', type: 'Tiệc Tất Niên', title: 'Year End Party - Dấu Ấn 2025',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp4.png',
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#B22222', fontFamily: 'Playfair Display' },
            pages: [
                {
                    name: "Thiệp Mời Tiệc Tất Niên",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-4-bg.png',
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'YOU ARE INVITED TO', x: 250, y: 150, width: 300, height: 40, fontSize: 22, fontFamily: 'Poppins', color: '#FFFFFF', letterSpacing: '0.2em' },
                        { ...defaultItemProps, type: 'text', content: 'YEAR END PARTY\n2025', x: 150, y: 250, width: 500, height: 200, fontSize: 72, fontFamily: 'Playfair Display', color: '#DAA520', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'Cùng nhìn lại một năm thành công và hướng tới tương lai.', x: 150, y: 500, width: 500, height: 50, fontSize: 20, fontFamily: 'Poppins', color: '#FFFFFF' },
                        { ...defaultItemProps, type: 'text', content: '18:30 | 26.12.2025 | WHITE PALACE', x: 200, y: 650, width: 400, height: 40, fontSize: 24, fontFamily: 'Poppins', color: '#DAA520' },
                    ]
                }
            ]
        }
    },
    // =================================================================
    // TEMPLATE 13: SINH NHẬT - THÔI NÔI [MẪU MỚI THEO ẢNH]
    // =================================================================
    {
        category: 'Sinh nhật', type: 'Thôi nôi', title: 'Mừng Bé Tròn 1 Tuổi',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp8.png', // Tái sử dụng ảnh baby shower
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#89CFF0', fontFamily: 'Nunito' },
            pages: [
                {
                    name: "Thiệp Mời Thôi Nôi",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-8-bg.png', // Tái sử dụng nền pastel
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Tiệc Thôi Nôi', x: 250, y: 120, width: 300, height: 100, fontSize: 64, fontFamily: 'Nunito', color: '#1E90FF', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'Mừng bé yêu\nMinh Khôi\ntròn 1 tuổi', x: 200, y: 250, width: 400, height: 200, fontSize: 48, fontFamily: 'Nunito', color: '#333333' },
                        { ...defaultItemProps, type: 'text', content: 'Gia đình thân mời bạn đến dự bữa tiệc ấm cúng', x: 150, y: 500, width: 500, height: 50, fontSize: 22, fontFamily: 'Nunito', color: '#555555' },
                        { ...defaultItemProps, type: 'text', content: '18:00, Chủ Nhật, 15.09.2025 | Tại tư gia', x: 150, y: 600, width: 500, height: 50, fontSize: 24, fontFamily: 'Nunito', color: '#1E90FF' },
                    ]
                }
            ]
        }
    },
    // =================================================================
    // TEMPLATE 14: THIỆP CƯỚI - LỄ ĂN HỎI [MẪU MỚI THEO ẢNH]
    // =================================================================
    {
        category: 'Thiệp cưới', type: 'Lễ ăn hỏi', title: 'Tin Vui - Lễ Ăn Hỏi',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp9.png', // Tái sử dụng ảnh truyền thống
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#C8283E', fontFamily: 'serif' },
            pages: [
                {
                    name: "Thiệp Báo Tin Lễ Ăn Hỏi",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-9-bg.png', // Tái sử dụng nền đỏ
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Trân Trọng Báo Tin', x: 200, y: 120, width: 400, height: 50, fontSize: 32, fontFamily: 'serif', color: '#333333' },
                        { ...defaultItemProps, type: 'text', content: 'LỄ ĂN HỎI', x: 200, y: 200, width: 400, height: 80, fontSize: 72, fontFamily: 'serif', color: '#C8283E', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'của hai con chúng tôi', x: 200, y: 300, width: 400, height: 40, fontSize: 28, fontFamily: 'serif', color: '#333333' },
                        { ...defaultItemProps, type: 'text', content: 'Thành Trung & Mai Anh', x: 150, y: 380, width: 500, height: 60, fontSize: 48, fontFamily: 'Dancing Script', color: '#DFBD69' },
                        { ...defaultItemProps, type: 'text', content: 'Được cử hành vào ngày 20 tháng 12 năm 2025\n(tức ngày 01 tháng 11 Âm lịch)', x: 100, y: 550, width: 600, height: 100, fontSize: 22, fontFamily: 'serif', color: '#333333', lineHeight: '1.5' },
                    ]
                }
            ]
        }
    },
    // =================================================================
    // TEMPLATE 15: THIỆP CƯỚI - LỄ ĐỘC THÂN [MẪU MỚI THEO ẢNH]
    // =================================================================
    {
        category: 'Thiệp cưới', type: 'Lễ độc thân', title: 'Tiệc Độc Thân Bùng Cháy',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp4.png', // Tái sử dụng ảnh Luxury
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#FF1493', fontFamily: 'Poppins' },
            pages: [
                {
                    name: "Thiệp Mời Tiệc Độc Thân",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-4-bg.png', // Tái sử dụng nền Art Deco
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'GAME OVER', x: 200, y: 200, width: 400, height: 100, fontSize: 96, fontFamily: 'Montserrat', color: '#FFFFFF', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'Join us for\nQuoc Huy\'s\nBachelor Party', x: 200, y: 350, width: 400, height: 150, fontSize: 42, fontFamily: 'Poppins', color: '#DAA520' },
                        { ...defaultItemProps, type: 'text', content: 'One last night of freedom!', x: 200, y: 550, width: 400, height: 40, fontSize: 24, fontFamily: 'Poppins', color: '#FFFFFF', fontStyle: 'italic' },
                        { ...defaultItemProps, type: 'text', content: '9 PM till late | Sat, 22.11.2025 | Lush Bar', x: 150, y: 650, width: 500, height: 40, fontSize: 22, fontFamily: 'Poppins', color: '#DAA520' },
                    ]
                }
            ]
        }
    },
    // =================================================================
    // TEMPLATE 16: NGÀY LỄ - NĂM MỚI (TẾT) [MẪU MỚI THEO ẢNH]
    // =================================================================
    {
        category: 'Ngày lễ', type: 'Năm mới', title: 'Thiệp Chúc Tết An Khang',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp9.png', // Tái sử dụng ảnh truyền thống
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#C8283E', fontFamily: 'serif' },
            pages: [
                {
                    name: "Thiệp Chúc Tết",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-9-bg.png', // Nền đỏ hoàn hảo cho Tết
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'CUNG CHÚC TÂN XUÂN', x: 100, y: 150, width: 600, height: 100, fontSize: 72, fontFamily: 'serif', color: '#DFBD69', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: 'NĂM BÍNH THÌN - 2026', x: 200, y: 280, width: 400, height: 60, fontSize: 48, fontFamily: 'serif', color: '#FFFFFF' },
                        { ...defaultItemProps, type: 'text', content: 'Kính chúc Quý khách và gia đình một năm mới\nAN KHANG - THỊNH VƯỢNG\nVẠN SỰ - NHƯ Ý', x: 150, y: 400, width: 500, height: 200, fontSize: 28, fontFamily: 'serif', color: '#FFFFFF', lineHeight: '1.8' },
                        { ...defaultItemProps, type: 'text', content: 'Trân trọng\nCông ty ABC', x: 300, y: 650, width: 200, height: 80, fontSize: 24, fontFamily: 'serif', color: '#DFBD69' },
                    ]
                }
            ]
        }
    },
    // =================================================================
    // TEMPLATE 17: NGÀY LỄ - VALENTINE [MẪU MỚI THEO ẢNH]
    // =================================================================
    {
        category: 'Ngày lễ', type: 'Valentine', title: 'Valentine Ngọt Ngào',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp1.png', // Tái sử dụng ảnh Cổ điển
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#E37383', fontFamily: 'Dancing Script' },
            pages: [
                {
                    name: "Thiệp Valentine",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-1-bg.png', // Tái sử dụng nền hoa
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Happy\nValentine\'s Day', x: 200, y: 200, width: 400, height: 200, fontSize: 88, fontFamily: 'Dancing Script', color: '#D24D57' },
                        { ...defaultItemProps, type: 'text', content: 'To my love, my everything', x: 200, y: 450, width: 400, height: 50, fontSize: 32, fontFamily: 'Garamond', color: '#5B4B49' },
                        { ...defaultItemProps, type: 'text', content: 'You are the flower in my heart.', x: 200, y: 550, width: 400, height: 50, fontSize: 24, fontFamily: 'Garamond', color: '#5B4B49', fontStyle: 'italic' },
                    ]
                }
            ]
        }
    },
    // =================================================================
    // TEMPLATE 18: NGÀY LỄ - 8/3 QUỐC TẾ PHỤ NỮ [MẪU MỚI THEO ẢNH]
    // =================================================================
    {
        category: 'Ngày lễ', type: 'Quốc tế Phụ nữ', title: 'Mừng Ngày Phụ Nữ 8/3',
        imgSrc: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp5.png', // Tái sử dụng ảnh Nhiệt đới
        templateData: {
            width: 800, height: 800,
            design: { themeColor: '#e83e8c', fontFamily: 'Quicksand' },
            pages: [
                {
                    name: "Thiệp Mừng 8/3",
                    backgroundImage: 'https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/temp-5-bg.png', // Tái sử dụng nền màu nước
                    items: [
                        { ...defaultItemProps, type: 'text', content: 'Happy Women\'s Day', x: 150, y: 200, width: 500, height: 100, fontSize: 64, fontFamily: 'Playfair Display', color: '#005f5f', fontWeight: 'bold' },
                        { ...defaultItemProps, type: 'text', content: '08 . 03', x: 300, y: 320, width: 200, height: 60, fontSize: 48, fontFamily: 'Quicksand', color: '#e83e8c' },
                        { ...defaultItemProps, type: 'text', content: 'Gửi ngàn lời yêu thương đến những người phụ nữ tuyệt vời.\nChúc bạn luôn xinh đẹp, hạnh phúc và thành công!', x: 100, y: 450, width: 600, height: 150, fontSize: 24, fontFamily: 'Quicksand', color: '#333333' },
                    ]
                }
            ]
        }
    },
];

detailedTemplates.forEach(template => {
    if (template.templateData && template.templateData.pages) {
        template.templateData.pages.forEach(page => {
            page.id = crypto.randomUUID();
            if (page.items) {
                page.items.forEach(item => {
                    item.id = crypto.randomUUID();
                });
            }
        });
    }
});



const usersToInsert = [
    { username: "anh_tuan", email: "anhtuan@example.com", password: "password123", firstName: "Anh", lastName: "Tuấn" },
    { username: "bao_ngoc", email: "baongoc@example.com", password: "password123", firstName: "Bảo", lastName: "Ngọc" },
];

const specificProducts = [
    // --- Phụ kiện trang trí ---
    {
        category: 'Phụ kiện trang trí',
        title: 'Cổng Hoa Cưới Lụa Mềm Mại',
        description: 'Cổng hoa lụa cao cấp với hoa mẫu đơn và hồng trắng, tạo nên vẻ đẹp lãng mạn và sang trọng cho ngày cưới của bạn. Dễ dàng lắp đặt và tái sử dụng.',
    },
    {
        category: 'Phụ kiện trang trí',
        title: 'Bộ Trụ Nến Pha Lê Lấp Lánh',
        description: 'Bộ 3 trụ nến bằng pha lê K9 trong suốt, phản chiếu ánh sáng lung linh. Phù hợp để trang trí bàn tiệc, bàn gallery, tạo không gian ấm cúng.',
    },
    {
        category: 'Phụ kiện trang trí',
        title: 'Bảng Chào Mừng "Welcome" Gỗ Thông',
        description: 'Bảng chào mừng "Welcome to our wedding" được làm từ gỗ thông tự nhiên, khắc laser tinh xảo. Kích thước 60x90cm, có thể tùy chỉnh tên cô dâu chú rể.',
    },
    // --- Quà tặng ---
    {
        category: 'Quà tặng',
        title: 'Hộp Quà Cảm Ơn Nơ Lụa',
        description: 'Hộp quà tặng khách mời nhỏ xinh bằng giấy mỹ thuật, đính kèm nơ lụa màu pastel. Bên trong có thể chứa socola, trà hoa hoặc vật phẩm nhỏ khác.',
    },
    {
        category: 'Quà tặng',
        title: 'Nến Thơm Thủ Công Hương Vanilla',
        description: 'Nến thơm làm từ sáp đậu nành tự nhiên và tinh dầu vanilla nguyên chất, đặt trong hũ thủy tinh tinh tế. Món quà cảm ơn ấm áp và ý nghĩa.',
    },
    {
        category: 'Quà tặng',
        title: 'Chậu Cây Sen Đá "Tình Yêu Vĩnh Cửu"',
        description: 'Chậu sen đá nhỏ được trang trí trong chậu gốm sứ trắng mini. Tượng trưng cho tình yêu bền vững, là món quà xanh cho khách mời.',
    },
    // --- Shop - Service ---
    {
        category: 'Shop - Service',
        title: 'Gói Tư Vấn Thiết Kế Thiệp Cưới',
        description: 'Dịch vụ tư vấn 1-1 với chuyên gia thiết kế để tạo ra mẫu thiệp cưới độc đáo, thể hiện đúng phong cách và câu chuyện tình yêu của bạn.',
    },
    {
        category: 'Shop - Service',
        title: 'Bộ 10 Template Thiệp Cưới Hiện Đại',
        description: 'Bộ sưu tập 10 mẫu thiệp cưới file kỹ thuật số theo phong cách hiện đại, tối giản. Dễ dàng chỉnh sửa trên Canva hoặc Photoshop.',
    },
    {
        category: 'Shop - Service',
        title: 'Dịch Vụ Khắc Tên Laser Lên Quà Tặng',
        description: 'Dịch vụ khắc laser tên, ngày kỷ niệm hoặc thông điệp cá nhân lên các vật liệu như gỗ, kim loại, thủy tinh để tạo dấu ấn riêng.',
    },
    // --- Tổ chức sự kiện ---
    {
        category: 'Tổ chức sự kiện',
        title: 'Gói Trang Trí Tiệc Cưới Bãi Biển',
        description: 'Gói dịch vụ trang trí toàn diện cho tiệc cưới ngoài trời tại bãi biển, bao gồm cổng hoa, lối đi, khu vực làm lễ và bàn tiệc theo chủ đề nhiệt đới.',
    },
    {
        category: 'Tổ chức sự kiện',
        title: 'Dịch Vụ Dàn Nhạc Acoustic',
        description: 'Cung cấp ban nhạc acoustic chuyên nghiệp (guitar, violin, cajon) biểu diễn trong tiệc cưới, tạo không gian âm nhạc lãng mạn và sâu lắng.',
    },
    {
        category: 'Tổ chức sự kiện',
        title: 'Dịch Vụ Cho Thuê Quầy Bar Di Động',
        description: 'Cho thuê quầy bar pha chế di động với thiết kế đẹp mắt, kèm theo bartender chuyên nghiệp phục vụ cocktail và đồ uống theo yêu cầu.',
    },
];

const productsToInsert = specificProducts.map((product, i) => {
    return {
        ...product,
        price: Math.floor(Math.random() * (2000000 - 50000) + 50000),
        imgSrc: `https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/product-${i + 1}-main.png`,
        images: [
            `https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/product-${i + 1}-main.png`,
            `https://pub-f720e3221ef5464a93d19bbdae2cfb86.r2.dev/product-${i + 1}-details.png`
        ],
        stock: Math.floor(Math.random() * 200)
    };
});


const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔗 MongoDB đã kết nối thành công.");

        console.log("🧹 Bắt đầu xóa dữ liệu cũ...");
        await Promise.all([
            Product.deleteMany({}),
            InvitationTemplate.deleteMany({}),
            User.deleteMany({}),
            Invitation.deleteMany({})
        ]);
        console.log("✅ Đã xóa dữ liệu cũ thành công.");

        console.log("🌱 Bắt đầu chèn dữ liệu mới...");

        const insertedProducts = await Product.insertMany(productsToInsert);
        console.log(`✅ Đã chèn ${insertedProducts.length} Products.`);

        const insertedTemplates = await InvitationTemplate.insertMany(detailedTemplates);
        console.log(`✅ Đã chèn ${insertedTemplates.length} InvitationTemplates chi tiết.`);

        const insertedUsers = await User.create(usersToInsert);
        console.log(`✅ Đã chèn ${insertedUsers.length} Users.`);

        console.log("⚙️  Đang tự động tạo 24 thiệp mời chi tiết...");

        const invitationsToInsert = Array.from({ length: 24 }).map((_, i) => {
            const owner = insertedUsers[i % insertedUsers.length];
            const template = insertedTemplates[i % insertedTemplates.length];
            const eventDate = new Date();
            eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 365) + 30);

            const groomName = ['Anh Tuấn', 'Bảo Long', 'Minh Nhật', 'Đức Thắng', 'Hữu Khang', 'Văn Toàn'][i % 6];
            const brideName = ['Bảo Ngọc', 'Gia Hân', 'Phương Thảo', 'Kim Liên', 'Cẩm Vân', 'Thanh Trúc'][i % 6];
            const eventType = template.category === 'Thiệp cưới' ? 'dam-cuoi' : 'su-kien';
            const slug = `${groomName.toLowerCase().replace(/ /g, '-')}-va-${brideName.toLowerCase().replace(/ /g, '-')}-${eventType}-${i + 1}`;

            // [SỬA LỖI] Sao chép sâu nội dung trang đã có ID
            const copiedTemplateContent = JSON.parse(JSON.stringify(template.templateData.pages));

            return {
                user: owner._id,
                template: template._id,
                slug: slug,

                // [SỬA LỖI] 'content' bây giờ là một mảng các trang canvas trực tiếp theo schema mới.
                // Các thông tin như groom, bride, event... đã có sẵn trong các text item của template.
                content: copiedTemplateContent,

                design: { ...template.templateData.design },

                guests: Array.from({ length: Math.ceil(Math.random() * 10) + 5 }).map((_, g) => ({
                    name: `Khách mời ${g + 1}`,
                    phone: `09000000${g < 10 ? '0' : ''}${g}`,
                    // [CẬP NHẬT] Thêm trường email cho khách mời
                    email: `khachmoi${g + 1}@example.com`,
                    group: ['Bạn Chú Rể', 'Bạn Cô Dâu', 'Đồng Nghiệp'][g % 3],
                    status: 'pending'
                })),

                wishes: [],
                settings: { showWishList: true, showGuestList: false }
            };
        });

        const insertedInvitations = await Invitation.insertMany(invitationsToInsert);
        console.log(`✅ Đã chèn ${insertedInvitations.length} Invitations chi tiết.`);

        console.log("\n🚀🚀🚀 Seeding toàn bộ dữ liệu lớn hoàn tất! 🚀🚀🚀");

    } catch (error) {
        console.error("❌ Lỗi trong quá trình seeding:", error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log("🔌 Đã ngắt kết nối MongoDB.");
        }
    }
};

seedDatabase();