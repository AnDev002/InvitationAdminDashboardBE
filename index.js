const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const passport = require('passport');
const session = require('express-session');
const authAdminRoutes = require('./src/routes/auth.routes');
const dataAdminRoutes = require('./src/routes/admin.routes');
const designAssetRoutes = require('./src/routes/designAsset.routes'); 
const userRoutes = require('./src/routes/user.routes');
const invitationTemplateRoutes = require('./src/routes/invitationTemplate.routes');
const publicRoutes = require('./src/routes/public.routes');
const pageRoutes = require('./src/routes/page.routes');
require('./src/config/passport');
const app = express();
const port = process.env.PORT || 8000;
const corsOptions = {
  origin: ['http://localhost:3000', 'https://admin.icards.com.vn', 'https://www.admin.icards.com.vn', 'https://www.icards.com.vn', 'https://icards.com.vn'], 
  credentials: true, 
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
const adminApiRouter = express.Router();
adminApiRouter.use('/auth', authAdminRoutes);
adminApiRouter.use('/', dataAdminRoutes);
app.use('/api/v1/admin', adminApiRouter);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/design-assets', designAssetRoutes);
app.use('/api/v1/invitation-templates', invitationTemplateRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use(errorHandler);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connect Db success!")
  })
  .catch((err) => {
    console.log(err)
  })

app.listen(port, () => {
  console.log("Server is running in port: " + port);
});