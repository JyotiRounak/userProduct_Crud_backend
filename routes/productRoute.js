const express = require("express");
const router = express.Router();
const {createProduct, getProducts, getSingleProduct, deleteProduct, updateProduct } = require("../controllers/productController");
const protect = require("../middleware/authMiddleware");
const { upload } = require("../utils/fileUpload");

router.post("/", protect, upload.single("image"), createProduct);
router.patch("/:id", protect, upload.single("image"), updateProduct);
router.get("/", protect, getProducts);
router.get("/:id", protect, getSingleProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;