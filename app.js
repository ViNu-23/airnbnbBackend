const express = require("express");
const cors = require("cors");
const app = express();
const userModel = require("./model/user");
const placeModel = require("./model/place");
const bookingModel = require("./model/bookings");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const download = require("image-downloader");
const multer = require("multer");
const fs = require("fs");

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtKey = "test#$Hsj8";

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://airbnb-nine-azure.vercel.app"],
    credentials: true,
  })
);

app.use("/uploads", express.static(__dirname + "/uploads"));

app.use(cookieParser());

app.post("/register", async (req, res) => {
  let { name, email, password } = req.body;
  try {
    await userModel.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json("ok");
  } catch {
    res.status(422).send("duplicate mail");
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let existUser = await userModel.findOne({ email });
  if (existUser) {
    let checkPassword = bcrypt.compareSync(password, existUser.password);
    if (checkPassword) {
      jwt.sign(
        { email: existUser.email, id: existUser._id },
        jwtKey,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(existUser);
        }
      );
    } else {
      res.status(401).send("wrong password");
    }
  } else {
    res.status(404).send("user not exist");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtKey, {}, async (err, tokenUserData) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Token verification failed" });
      }
      try {
        const user = await userModel.findById(tokenUserData.id);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        const { _id, name, email } = user;
        res.json({ success: true, data: { _id, name, email } });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: "Error fetching user data" });
      }
    });
  } else {
    res
      .status(404)
      .json({ success: false, message: "User token not exist or found" });
  }
});

app.post("/logout", (req, res) => {
  res
    .cookie("token", "")
    .json({ success: true, message: "token cleared successfully" });
});

app.post("/uploadbylink", async (req, res) => {
  const { link } = req.body;
  const newNameImg = "image" + Date.now() + ".jpg";
  try {
    await download.image({
      url: link,
      dest: __dirname + "/uploads/" + newNameImg,
    });
    res.json(newNameImg);
  } catch (error) {
    res.status(500).json({ success: false, message: error });
  }
});

const photoMiddleware = multer({ dest: "uploads/" });
app.post("/uploads", photoMiddleware.array("photo", 100), async (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace("uploads\\", ""));
  }
  res.json(uploadedFiles);
});

app.post("/places", async (req, res) => {
  const { token } = req.cookies;
  const {
    title,
    address,
    checkin,
    checkout,
    description,
    guest,
    info,
    perks,
    photo,
    price,
  } = req.body;

  jwt.verify(token, jwtKey, {}, async (err, userData) => {
    if (err) throw err.message;
    try {
      const response = await placeModel.create({
        owner: userData.id,
        title: title,
        address: address,
        photos: photo,
        description: description,
        perks: perks,
        extraInfo: info,
        checkIn: checkin,
        checkOut: checkout,
        maxGuest: guest,
        price: price,
      });
      res.status(200).json({ response });
    } catch (error) {
      res.status(500).json(error.message);
    }
  });
});

app.get("/user-places", async (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, jwtKey, {}, async (err, userData) => {
    if (err) return res.status(403).json(err.message);
    try {
      const { id } = userData;
      res.json(await placeModel.find({ owner: id }));
    } catch (error) {
      res.status(500).json(error.message);
    }
  });
});

app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await placeModel.findById(id));
});

app.put("/places", async (req, res) => {
  const { token } = req.cookies;
  const {
    id,
    title,
    address,
    checkin,
    checkout,
    description,
    guest,
    info,
    perks,
    photo,
    price,
  } = req.body;
  try {
    jwt.verify(token, jwtKey, {}, async (err, userData) => {
      if (err) return res.status(403).json(err.message);

      const placeData = await placeModel.findById(id);

      if (userData.id === placeData.owner.toString()) {
        placeData.set({
          title: title,
          address: address,
          photos: photo,
          description: description,
          perks: perks,
          extraInfo: info,
          checkIn: checkin,
          checkOut: checkout,
          maxGuest: guest,
          price: price,
        });
        await placeData.save();
        res.status(200).send("Place has been updated");
      } else {
        res.status(500).json(error.message).send("Not a owner");
      }
    });
  } catch (error) {
    res.status(500).json(error.message).send("Places or Token Error");
  }
});

app.post("/deleteplace", async (req, res) => {
  try {
    const { placesId: id } = req.body;
    const deletePlace = await placeModel.findByIdAndDelete(id);
    if (deletePlace) {
      res.status(200).send({ message: "Place deleted successfully" });
    } else {
      res.status(404).send({ message: "Place not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting place", error });
  }
});

app.get("/places", async (req, res) => {
  try {
    res.json(await placeModel.find()).status(200);
  } catch (error) {
    res.status(500).json({ message: "Error fetching places" });
  }
});

app.get("/placeToBook/:id", async (req, res) => {
  const { id } = req.params;
  try {
    res.json(await placeModel.findById(id));
  } catch (error) {
    res.status(500).json({ message: "Error finding places" });
  }
});

app.post("/bookings/:id", async (req, res) => {
  const { token } = req.cookies;
  const { id } = req.params;
  const { checkIn, checkOut, guests, name, number } = req.body;
  
  try {
    jwt.verify(token, jwtKey, {}, async (err, userData) => {
      if (err) return res.status(403).json(err.message);
      const placeData = await placeModel.findById(id);
      const userId = userData.id;
      await bookingModel.create({
        place: placeData._id,
        userId,
        checkIn,
        checkOut,
        name,
        guests,
        number,
      });
      res.status(200).send("Place booked successfully");
    });
  } catch (error) {
    res.status(500).json(error.message).send("Error while booking");
  }
});

app.get("/bookings", async (req, res) => {
  const { token } = req.cookies;
  try {
    jwt.verify(token, jwtKey, {}, async (err, userData) => {
      if (err) return res.status(403).json(err.message);
      const userId = userData.id;
      const bookings = await bookingModel
        .find({ userId: userId })
        .populate("place");
      res.json(bookings);
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error while loading bookings", error: error.message });
  }
});

app.post("/cancelbooking", async (req, res) => {
  const  {id}  = req.body;
  try {
    await bookingModel.findByIdAndDelete({ _id: id });
    res.status(200).send("Booking canceled");
  } catch (error) {
    res.send(error.message).status("404");
  }
});

// middleware
// function isLoggedIn(req, res, next) {
//   if (req.cookies.token === "") res.redirect("/login");
//   else {
//     return next();
//   }
// }

app.listen(8081, () => {
  console.log("server started");
});
