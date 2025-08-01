const productService = require('../services/product.service');
const APIFeatures = require('../utils/apiFeature');
const sharp = require('sharp');
const { uploadFileToR2 } = require('../services/r2.service');

const processAndUploadFile = async (file) => {
    const buffer = await sharp(file.buffer)
        .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
    const { url } = await uploadFileToR2(buffer, 'image/webp');
    return url;
};

// Tạo sản phẩm mới
const createProduct = async (req, res, next) => {
    try {
        const productData = { ...req.body };
        const newImageUrls = [];

        // Xử lý ảnh đại diện (nếu có)
        if (req.files && req.files.image && req.files.image[0]) {
            const mainImageUrl = await processAndUploadFile(req.files.image[0]);
            productData.imgSrc = mainImageUrl;
            newImageUrls.push(mainImageUrl); // Ảnh đại diện cũng là một ảnh trong thư viện
        }

        // Xử lý các ảnh trong thư viện
        if (req.files && req.files.images && req.files.images.length > 0) {
            const uploadPromises = req.files.images.map(processAndUploadFile);
            const galleryUrls = await Promise.all(uploadPromises);
            newImageUrls.push(...galleryUrls);
        }

        productData.images = newImageUrls;
        const newProduct = await productService.createProduct(productData);
        res.status(201).json(newProduct);
    } catch (error) {
        next(error);
    }
};

// Lấy danh sách sản phẩm (hỗ trợ query nâng cao)
const getProducts = async (req, res, next) => {
  try {
    const { search } = req.query;
    let initialQuery = {};

    // Nếu có tham số 'search', xây dựng query để tìm kiếm
    if (search) {
      initialQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } }, // Tìm trong tiêu đề
          { description: { $regex: search, $options: 'i' } } // Tìm trong mô tả
        ]
      };
    }
    
    // Sử dụng APIFeatures để phân trang, sắp xếp, và lọc
    const features = new APIFeatures(productService.queryProducts(initialQuery), req.query)
      .filter()      
      .sort()        
      .limitFields() 
      .paginate();    

    const products = await features.query;

    res.status(200).json({
      status: 'success',
      results: products.length,
      data: products,
    });

  } catch (error) {
    next(error);
  }
};



// Lấy chi tiết một sản phẩm
const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// Cập nhật sản phẩm - ĐÃ SỬA LỖI
const updateProduct = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        let finalImageUrls = [];

        // Lấy lại các URL ảnh cũ đã được gửi từ frontend
        if (req.body.existingImages) {
            finalImageUrls = JSON.parse(req.body.existingImages);
        }
        
        // Xử lý ảnh đại diện mới (nếu có)
        if (req.files && req.files.image && req.files.image[0]) {
            const mainImageUrl = await processAndUploadFile(req.files.image[0]);
            updateData.imgSrc = mainImageUrl;
            // Thay thế ảnh đại diện cũ trong danh sách hoặc thêm mới
            if (!finalImageUrls.includes(mainImageUrl)) {
                 finalImageUrls.unshift(mainImageUrl); // Thêm vào đầu
            }
        }

        // Xử lý các ảnh thư viện mới (nếu có)
        if (req.files && req.files.images && req.files.images.length > 0) {
            const uploadPromises = req.files.images.map(processAndUploadFile);
            const newGalleryUrls = await Promise.all(uploadPromises);
            finalImageUrls.push(...newGalleryUrls);
        }

        updateData.images = finalImageUrls;

        const product = await productService.updateProductById(req.params.id, updateData);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// Xóa sản phẩm
const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProductById(req.params.id);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};