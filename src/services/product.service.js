const Product = require('../models/product.model');
const { deleteFileFromCloudflare, getImageIdFromUrl } = require('./cloudflare.service.js');

/**
 * Tạo sản phẩm mới
 * @param {Object} productData - Dữ liệu sản phẩm từ controller
 * @returns {Promise<Product>}
 */
const createProduct = async (productData) => {
  const product = new Product(productData);
  return await product.save();
};

/**
 * Lấy tất cả sản phẩm (sẽ được xử lý bởi APIFeatures ở controller)
 * @returns {Query}
 */
const queryProducts = (filter) => {
  return Product.find(filter);
};

/**
 * Lấy sản phẩm theo ID
 * @param {string} id - ID của sản phẩm
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  return await Product.findById(id);
};

/**
 * Cập nhật sản phẩm theo ID
 * @param {string} id - ID của sản phẩm
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<Product>}
 */
const updateProductById = async (id, updateData) => {
  return await Product.findByIdAndUpdate(id, updateData, {
    new: true, // Trả về document đã được cập nhật
    runValidators: true, // Chạy lại các trình xác thực của Mongoose
  });
};

/**
 * Xóa sản phẩm theo ID
 * @param {string} id - ID của sản phẩm
 */
const deleteProductById = async (id) => {
  const product = await Product.findById(id);
  if (product && product.imgSrc) {
      // THAY ĐỔI: Trích xuất ID và xóa file trên Cloudflare
      const imageId = getImageIdFromUrl(product.imgSrc);
      if (imageId) {
        await deleteFileFromCloudflare(imageId);
      }
  }
  await Product.findByIdAndDelete(id);
};


module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
};