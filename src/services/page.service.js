// AdminBE/services/page.service.js
const Page = require('../models/page.model'); // Import trực tiếp, KHÔNG dùng { Page }
const PageCategory = require('../models/pageCategory.model');

// QUAN TRỌNG: Load các model phụ để tránh lỗi khi populate
require('../models/topic.model');
require('../models/pageCategory.model');
require('../models/user.model');

// 1. Hàm Query nâng cao (Filter, Search, Pagination) - Thay thế cho getAllPages cũ
const queryPages = async (query) => {
  const filter = {};

  // Tìm kiếm (Search)
  if (query.search) {
      filter.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { slug: { $regex: query.search, $options: 'i' } }
      ];
  }

  // Lọc theo trạng thái (Status)
  if (query.status && query.status !== 'all') {
      filter.isPublished = query.status === 'true';
  }

  // Lọc theo loại (Blog/Page)
  if (query.type && query.type !== 'all') {
      filter.isBlog = query.type === 'blog'; 
  }

  // Lọc theo danh mục (Category)
  if (query.category && query.category !== 'all') {
      filter.category = query.category;
  }

  // Phân trang & Sắp xếp
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const sortBy = query.sort || '-createdAt';

  // Thực thi query
  const pages = await Page.find(filter)
      .populate('author', 'name email')
      .populate('category', 'name')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

  const total = await Page.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
      data: pages,
      page,
      limit,
      totalPages,
      totalResults: total
  };
};

const getPageById = (id) => Page.findById(id).populate('category').populate('topics');
const getPageBySlug = (slug) => {
    return Page.findOne({ slug, isPublished: true })
        .populate('author', 'name')
        .populate('category', 'name slug')
        .populate('topics', 'name slug')
        .populate('relatedTemplate', 'name thumbnail slug code price'); 
};


const createPage = (pageData) => Page.create(pageData);

const updatePage = (id, pageData) => Page.findByIdAndUpdate(id, pageData, { new: true, runValidators: true });

const deletePage = (id) => Page.findByIdAndDelete(id);

// Hàm cập nhật thứ tự
const updatePageOrder = (pages) => {
    const promises = pages.map((page, index) => {
        return Page.findByIdAndUpdate(page.id || page._id, { order: index });
    });
    return Promise.all(promises);
};

// --- GIỮ LẠI CÁC HÀM CATEGORY NẾU BẠN CHƯA TÁCH SERVICE RIÊNG ---
const getAllPageCategories = () => PageCategory.find().sort({ order: 1, createdAt: -1 }).populate('parent', 'name');
const getPageCategoryById = (id) => PageCategory.findById(id);
const createPageCategory = (data) => PageCategory.create(data);
const updatePageCategory = (id, data) => PageCategory.findByIdAndUpdate(id, data, { new: true });
const deletePageCategory = async (id) => {
    await PageCategory.updateMany({ parent: id }, { parent: null });
    return PageCategory.findByIdAndDelete(id);
};

// EXPORT ĐẦY ĐỦ
module.exports = {
    queryPages, // Controller đang gọi hàm này
    getPageById,
    getPageBySlug,
    createPage,
    updatePage,
    deletePage,
    updatePageOrder,
    // Export category functions
    getAllPageCategories,
    getPageCategoryById,
    createPageCategory,
    updatePageCategory,
    deletePageCategory
};