const productService = require('../services/product.service');
const APIFeatures = require('../utils/apiFeature');
const sharp = require('sharp');
const { uploadFileToCloudflare } = require('../services/cloudflare.service.js');
const AppError = require('../utils/AppError');

const processContentImages = async (htmlContent) => {
    // Regex để tìm các ảnh base64 hoặc placeholder trong nội dung
    const regex = /<img[^>]+src="data:image\/[^;]+;base64[^>]+"/g;
    const matches = htmlContent.match(regex);
    if (!matches) return htmlContent;
    
    let newHtmlContent = htmlContent;
    for (const imgTag of matches) {
        const base64Data = imgTag.match(/src="data:image\/[^;]+;base64,([^"]+)"/)[1];

        const stringLength = base64Data.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812; // Ước tính kích thước byte
        const sizeInMb = sizeInBytes / 1024 / 1024;

        if (sizeInMb > 10) { // Giới hạn 10MB cho mỗi ảnh nhúng
            console.warn('Skipping an embedded image that is too large:', sizeInMb.toFixed(2), 'MB');
            continue; // Bỏ qua ảnh này, không xử lý
        }

        const buffer = Buffer.from(base64Data, 'base64');
        const processedBuffer = await sharp(buffer)
          .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        
        const { url } = await uploadFileToR2(processedBuffer, 'image/webp');
        newHtmlContent = newHtmlContent.replace(imgTag, `<img src="${url}" />`);
    }
    return newHtmlContent;
};

const processAndUploadFile = async (file) => {
    const buffer = await sharp(file.buffer)
        .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
    const { url } = await uploadFileToCloudflare(buffer);
    return url;
};

const createProduct = async (req, res, next) => {
    try {
        const productData = { ...req.body };
        const newImageUrls = [];

        // Xử lý ảnh đại diện (nếu có)
        if (req.files && req.files.image && req.files.image[0]) {
            const mainImageUrl = await processAndUploadFile(req.files.image[0]);
            productData.imgSrc = mainImageUrl;
            newImageUrls.push(mainImageUrl);
        }

        // Xử lý các ảnh trong thư viện
        if (req.files && req.files.images && req.files.images.length > 0) {
            const uploadPromises = req.files.images.map(processAndUploadFile);
            const galleryUrls = await Promise.all(uploadPromises);
            newImageUrls.push(...galleryUrls);
        }

        productData.images = newImageUrls;
        
        // THÊM: Xử lý nội dung mô tả để tìm và upload ảnh
        productData.description = await processContentImages(productData.description);

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
      return next(new AppError('Không tìm thấy sản phẩm với ID này.', 404));
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

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
            if (!finalImageUrls.includes(mainImageUrl)) {
                 finalImageUrls.unshift(mainImageUrl);
            }
        }

        // Xử lý các ảnh thư viện mới (nếu có)
        if (req.files && req.files.images && req.files.images.length > 0) {
            const uploadPromises = req.files.images.map(processAndUploadFile);
            const newGalleryUrls = await Promise.all(uploadPromises);
            finalImageUrls.push(...newGalleryUrls);
        }

        updateData.images = finalImageUrls;

        // THÊM: Xử lý nội dung mô tả để tìm và upload ảnh
        updateData.description = await processContentImages(updateData.description);
        
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