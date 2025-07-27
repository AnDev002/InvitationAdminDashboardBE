const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const passport = require('passport');
const session = require('express-session');
require('./src/config/passport');
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const corsOptions = {
  origin: ['https://baotrithangmay.vn', 'https://www.baotrithangmay.vn'], 
  credentials: true, 
};
app.use(session({
  secret: process.env.SESSION_SECRET, // Thêm biến này vào file .env
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/api/admin', routes);
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