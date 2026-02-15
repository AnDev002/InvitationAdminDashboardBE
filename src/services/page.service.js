// AdminBE/services/page.service.js
const Page = require('../models/page.model');
const ApiFeatures = require('../utils/apiFeature'); // Nếu bạn có class này thì dùng, không thì dùng logic dưới đây

const createPage = async (pageBody, userId) => {
  return Page.create({ ...pageBody, author: userId });
};

const queryPages = async (query) => {
  const filter = {};

  // 1. Filter theo search (Title hoặc Slug)
  if (query.search) {
      filter.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { slug: { $regex: query.search, $options: 'i' } }
      ];
  }

  // 2. Filter theo trạng thái (Published/Draft)
  if (query.status && query.status !== 'all') {
      filter.isPublished = query.status === 'true';
  }

  // 3. Filter theo loại (Blog hay Page tĩnh)
  if (query.type && query.type !== 'all') {
      filter.isBlog = query.type === 'blog'; // type='blog' -> isBlog=true, type='page' -> isBlog=false
  }

  // 4. Filter theo danh mục
  if (query.category && query.category !== 'all') {
      filter.category = query.category;
  }

  // 5. Pagination & Sorting
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  const sortBy = query.sort ? query.sort : '-createdAt'; // Mặc định mới nhất trước

  // Execute Query
  const pages = await Page.find(filter)
      .populate('author', 'name email') // Lấy tên author
      .populate('category', 'name')     // Lấy tên category
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

  // Count Total
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

const getPageById = async (id) => {
  return Page.findById(id)
    .populate('category')
    .populate('topics');
};

const updatePage = async (id, updateBody) => {
  const page = await Page.findByIdAndUpdate(id, updateBody, { new: true });
  return page;
};

const deletePage = async (id) => {
  const page = await Page.findByIdAndDelete(id); // Dùng findByIdAndDelete thay vì remove (deprecated)
  if (!page) {
      throw new Error('Page not found');
  }
  return page;
};

module.exports = {
  createPage,
  queryPages,
  getPageById,
  updatePage,
  deletePage,
};