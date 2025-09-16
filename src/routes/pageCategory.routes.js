const express = require('express');
const router = express.Router();
const pageCategoryController = require('../controllers/pageCategory.controller');

router.route('/')
    .get(pageCategoryController.getAllCategories)
    .post(pageCategoryController.createCategory);

router.route('/:id')
    .put(pageCategoryController.updateCategory)
    .delete(pageCategoryController.deleteCategory);

module.exports = router;