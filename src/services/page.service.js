const Page = require('../models/page.model');
// QUAN TRỌNG: Phải require các model này để populate hoạt động
require('../models/user.model');
require('../models/pageCategory.model');
require('../models/topic.model');

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
      // type='blog' -> isBlog=true
      // type='page' -> isBlog=false
      filter.isBlog = query.type === 'blog'; 
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
      .populate('author', 'name email') // Cần User model
      .populate('category', 'name')     // Cần PageCategory model
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
    .populate('category', 'name') // Populate tên category
    .populate('topics', 'name');  // Populate tên topic
};

const updatePage = async (id, updateBody) => {
  const page = await Page.findByIdAndUpdate(id, updateBody, { new: true });
  return page;
};

const deletePage = async (id) => {
  const page = await Page.findByIdAndDelete(id);
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