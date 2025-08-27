const adminService = require('../services/admin.service');

// Controller để lấy cài đặt công khai
exports.getPublicSettings = async (req, res, next) => {
    try {
        const settings = await adminService.getSettings();
        // Lọc bớt các thông tin không cần thiết trước khi gửi ra ngoài
        const publicSettings = {
            headerNav: settings.headerNav,
            theme: settings.theme,
            footer: settings.footer,
            banners: settings.banners,
            loveGiftsButton: settings.loveGiftsButton
        };
        res.status(200).json({
            status: 'success',
            data: publicSettings
        });
    } catch (error) {
        next(error);
    }
};

exports.getInvitationTemplateBySlug = catchAsync(async (req, res, next) => {
  const template = await InvitationTemplate.findOne({ slug: req.params.slug });

  if (!template) {
    return next(new AppError('Không tìm thấy mẫu thiệp.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      template,
    },
  });
});