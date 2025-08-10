class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // === BẮT ĐẦU THAY ĐỔI TẠI ĐÂY ===

    // 1. Chuyển đổi các trường lọc chuỗi thành truy vấn Regex
    // Điều này giúp tìm kiếm linh hoạt hơn, không phân biệt chữ hoa/thường
    const filterConditions = {};
    for (const key in queryObj) {
      const value = queryObj[key];
      // Chỉ áp dụng regex cho các giá trị là chuỗi và không rỗng
      if (typeof value === 'string' && value.trim() !== '') {
        // Tạo một biểu thức chính quy để tìm kiếm không phân biệt chữ hoa/thường
        filterConditions[key] = { $regex: new RegExp(`^${value}$`, 'i') };
      } else {
        // Giữ nguyên các giá trị khác (ví dụ: số, boolean)
        filterConditions[key] = value;
      }
    }
    
    // 2. Xử lý các toán tử so sánh (nếu có) - logic này giữ nguyên
    let queryStr = JSON.stringify(filterConditions);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    // 3. Áp dụng bộ lọc đã cải tiến vào câu lệnh query
    this.query = this.query.find(JSON.parse(queryStr));

    // === KẾT THÚC THAY ĐỔI ===

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;