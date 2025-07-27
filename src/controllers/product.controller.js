const productService = require('../services/product.service');
const APIFeatures = require('../utils/apiFeature');

// Tạo sản phẩm mới
const createProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };
    if (req.file && req.file.r2Url) {
      productData.imgSrc = req.file.r2Url; 
      productData.images = [req.file.r2Url];
    }
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
    if (search) {
      initialQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
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

// Cập nhật sản phẩm
const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProductById(req.params.id, req.body);
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