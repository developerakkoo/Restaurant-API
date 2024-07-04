const router = require("express").Router();
const bannerController = require("../controller/banner.controller");
const adminController = require("../controller/admin.controller");
const deliveryBoyController = require("../controller/deliveryBoy.controller");
const HotelController = require("../controller/hotel.controller");
const PartnerController = require("../controller/partner.controller");
const orderController = require("../controller/order.controller");
const authController = require("../controller/auth.controller");
const validateData = require("../validators/admin.validator");
const { dataValidationResult } = require("../validators/validationResult");
const promoCodeController = require("../controller/promoCode.controller");
const { upload, videoUpload } = require("../middleware/fileHandler.middleware");
const {
    adminPrivilegesRequired,
} = require("../middleware/userAccess.middleware");

router.post("/logout", authController.logoutUser);

router.get("/banner/get/:type", bannerController.getBanner);

router.get("/get/all-hotels", adminController.getAllHotel);

router.get("/category/get/all", adminController.getAllCategory);

router.get("/promoCode/get-all", promoCodeController.getAllPromoCodes);

router.use(adminPrivilegesRequired);

router.get("/get/all-users", adminController.getAllUsers);

/* Dashboard routes*/
router.get("/get/dashboard-data", adminController.getDashboardStats);

router.get("/get/customerMapChartData", adminController.customerMapChartData);

router.get("/get/orderChartData", adminController.orderChartData);

router.get("/get/revenueChartData", adminController.totalRevenueData);

/*Partner */

router.get("/get/all-partners", adminController.getAllPartner);

router.get("/get/partner/byId/:partnerId", PartnerController.getPartnerById);

/* Hotel */

router.post("/hotel/register", PartnerController.addHotel);

router.post(
    "/hotel/upload/image",
    upload.single("document"),
    PartnerController.uploadHotelImage,
);

router.delete("/hotel/delete", PartnerController.deleteHotel);

router.put("/hotel/update", PartnerController.updateHotel);

/*Hotel Dish Route*/

router.post("/hotel/add-dish", HotelController.addDish);

router.post(
    "/hotel/dish/upload-image",
    upload.single("document"),
    HotelController.uploadDishImage,
);

router.get("/get-dish/:dishId", HotelController.getDishById);

router.put(
    "/hotel/dish/update",
    adminPrivilegesRequired,
    HotelController.updateDish,
);

router.delete(
    "/hotel/dish/delete",
    adminPrivilegesRequired,
    HotelController.deleteDish,
);

/* Delivery boy */

router.get("/get/all-deliveryBoy", adminController.getAllDeliveryBoy);

router.delete(
    "/delete/delivery-boy/document",
    adminPrivilegesRequired,
    adminController.deletedDocument,
);

router.get(
    "/get-all/delivery-boy/documents",
    deliveryBoyController.getAllDocuments,
);

router.get(
    "/get-all/delivery-boy/documents-deliveryBoyId",
    deliveryBoyController.getAllDocumentsByUserId,
);

router.get(
    "/get/delivery-boy/document-by-id",
    deliveryBoyController.getDocumentById,
);

router.put(
    "/update/user/status",
    adminPrivilegesRequired,
    adminController.updateUserStatus,
);

router.put(
    "/update/partner/status",
    adminPrivilegesRequired,
    adminController.updatePartnerStatus,
);

router.put(
    "/update/delivery-boy/status",
    adminController.updateDeliveryBoyStatus,
);

router.put(
    "/update/delivery-boy/document/status",
    adminController.updateDeliveryBoyDocumentStatus,
);

/* Category Routes*/

router.post(
    "/category/add",
    adminPrivilegesRequired,
    adminController.addCategory,
);

router.post(
    "/category/upload/image",
    adminPrivilegesRequired,
    upload.single("document"),
    adminController.uploadCategoryImage,
);

router.get("/category/get/:categoryId", adminController.getCategoryById);

router.delete(
    "/category/delete/:categoryId",
    adminPrivilegesRequired,
    adminController.deleteCategory,
);

/* Promo code routes*/
router.post("/promoCode/add", promoCodeController.addPromoCode);

router.put(
    "/promoCode/update/:promoCodeId",
    promoCodeController.updatedPromoCode,
);

router.get("/promoCode/get/:promoCodeId", promoCodeController.getPromoCode);

router.delete(
    "/promoCode/delete/:promoCodeId",
    promoCodeController.deletePromoCode,
);

/* Order Routes*/

router.get("/order/get-all", orderController.getAllOrders);

router.put("/order/update", orderController.updateOrder);

router.post(
    "/order/send-pickup-request/deliveryBoy",
    adminController.sendOrderPickUpRequestToDeliveryBoys,
);

/* Banner Routes*/

router.post(
    "/banner/add",
    upload.single("image"),
    adminPrivilegesRequired,
    bannerController.addBanner,
);

router.put(
    "/banner/update/image",
    adminPrivilegesRequired,
    upload.single("image"),
    bannerController.updateBannerImage,
);

router.put(
    "/banner/update/:bannerId",
    adminPrivilegesRequired,
    bannerController.updateBanner,
);

router.delete(
    "/banner/delete/:bannerId",
    adminPrivilegesRequired,
    bannerController.deleteBanner,
);

/* DATA */

router.get("/most-selling-products", adminController.getMostSellingDishes);

router.post("/add/data", adminController.createData);

/* Video add routes */

router.post(
    "/video/upload",
    videoUpload.array("video", 5),
    adminController.addVideos,
);

router.get("/video/get/:videoId", adminController.getVideoById);

router.get("/video/all", adminController.getAllVideos);

router.delete("/video/delete/:videoId", adminController.deleteVideo);

/* Leave Routes*/

router.get("/leave/get-all", deliveryBoyController.getAllLeaveRequests);

router.get("/leave/get-by/:leaveRequestId", deliveryBoyController.getLeaveRequestById);

router.put(
    "/leave/update/:leaveRequestId",
    deliveryBoyController.updateLeaveRequestStatus,
);

module.exports = { adminRoutes: router };
