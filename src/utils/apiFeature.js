class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1. Tạo bản sao của object query string
    const queryObj = { ...this.queryString };

    // 2. Loại bỏ các trường đặc biệt khỏi bộ lọc
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 3. Xử lý các toán tử so sánh (gte, gt, lte, lt)
    // Bước này an toàn vì nó chỉ thay thế chuỗi
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    const parsedQuery = JSON.parse(queryStr);

    // 4. Lặp qua các trường đã phân tích để chuyển đổi thành truy vấn Regex
    // Đây là bước sửa lỗi quan trọng: Xây dựng đối tượng query trực tiếp
    for (const key in parsedQuery) {
        const value = parsedQuery[key];
        
        // Chỉ áp dụng Regex cho các giá trị là chuỗi (string)
        if (typeof value === 'string') {
            // Sử dụng $regex và $options: 'i' để tìm kiếm không phân biệt chữ hoa/thường
            parsedQuery[key] = { $regex: value, $options: 'i' };
        }
    }

    // 5. Áp dụng bộ lọc cuối cùng vào câu lệnh query
    this.query = this.query.find(parsedQuery);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Sắp xếp mặc định nếu không có tham số sort
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // Loại bỏ trường __v
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100; // Đặt giới hạn mặc định
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;