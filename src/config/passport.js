const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user.model');

// Cấu hình Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://created-sufficient-relevance-probably.trycloudflare.com/api/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Tìm người dùng trong CSDL bằng Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Nếu người dùng đã tồn tại, trả về người dùng đó
        return done(null, user);
      } else {
        // Nếu chưa có, tạo người dùng mới
        const newUser = new User({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          // Mật khẩu không cần thiết khi đăng nhập bằng social
        });
        await newUser.save({ validateBeforeSave: false }); // Bỏ qua validation cho password
        return done(null, newUser);
      }
    } catch (err) {
      return done(err, null);
    }
  }
));

// (Tùy chọn) Cấu hình Facebook Strategy (tương tự Google)
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `https://created-sufficient-relevance-probably.trycloudflare.com/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        // Tìm người dùng bằng Facebook ID
        let user = await User.findOne({ facebookId: profile.id });

        if (user) {
            return done(null, user);
        }

        // Nếu người dùng chưa tồn tại, tạo mới
        
        // --- LOGIC SỬA LỖI NẰM Ở ĐÂY ---
        // 1. Lấy email một cách an toàn
        const userEmail = (profile.emails && profile.emails[0] && profile.emails[0].value) 
                          ? profile.emails[0].value 
                          : `${profile.id}@facebook-placeholder.com`; // Tạo email giả nếu không có

        // 2. Kiểm tra xem email giả này có bị trùng không (cực hiếm nhưng vẫn nên kiểm tra)
        let existingUserWithEmail = await User.findOne({ email: userEmail });
        if (existingUserWithEmail) {
            // Nếu email đã tồn tại (ví dụ người dùng đã đăng ký bằng email thường)
            // thì liên kết tài khoản Facebook này vào tài khoản đã có
            existingUserWithEmail.facebookId = profile.id;
            await existingUserWithEmail.save();
            return done(null, existingUserWithEmail);
        }

        // 3. Tạo người dùng mới với thông tin đã được kiểm tra an toàn
        const newUser = new User({
            facebookId: profile.id,
            username: profile.displayName || profile.id,
            email: userEmail,
            avatar: (profile.photos && profile.photos[0]) ? profile.photos[0].value : null,
            // Không cần mật khẩu
        });
        
        await newUser.save({ validateBeforeSave: false });
        return done(null, newUser);

    } catch (err) {
        console.error("Lỗi trong Facebook Strategy:", err);
        return done(err, null);
    }
  }
));

// Lưu thông tin user vào session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Lấy thông tin user từ session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});