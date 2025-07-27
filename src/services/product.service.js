const Product = require('../models/product.model');
const { deleteFileFromR2 } = require('./r2.service'); 

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
  // Tìm sản phẩm trước khi xóa để lấy thông tin ảnh
  const product = await Product.findById(id);
  if (product) {
    // URL có dạng: R2_PUBLIC_URL/fileKey
    // Chúng ta cần trích xuất fileKey
    if (product.imgSrc) {
        const fileKey = product.imgSrc.split('/').pop();
        await deleteFileFromR2(fileKey);
    }
  }
  // Xóa sản phẩm khỏi DB
  await Product.findByIdAndDelete(id);
};

module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
};