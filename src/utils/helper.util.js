const User = require("../models/user.model");
const Order = require("../models/order.model");
const Admin = require("../models/admin.model");
const Partner = require("../models/partner.model");
const HotelDish = require("../models/hotelDish.model");
const DishStar = require("../models/dishStar.model");
const DeliveryBoy = require("../models/deliveryBoy.model");
const  {ObjectId} = require('mongoose').Types

const findUserByEmail = async (email) => {
    let user = await User.findOne({ email });
    if (user) return { user, model: "User" };

    user = await Admin.findOne({ email });
    if (user) return { user, model: "Admin" };

    user = await DeliveryBoy.findOne({ email });
    if (user) return { user, model: "DeliveryBoy" };

    user = await Partner.findOne({ email });
    if (user) return { user, model: "Partner" };

    return null;
};

// Function to recommend dishes
async function recommendDishes(userId) {
    try {
        // Find recent orders for the user
        const recentOrders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);

        if (recentOrders.length > 0) {
            const dishRatings = {};

            // Calculate average ratings for dishes in recent orders
            for (const order of recentOrders) {
                for (const product of order.products) {
                    const dishId = product.dishId.toString();
                    if (!dishRatings[dishId]) {
                        const dishRating = await DishStar.aggregate([
                            {
                                $match: {
                                    dishId: new ObjectId(dishId),
                                },
                            },
                            {
                                $group: {
                                    _id: "$dishId",
                                    avgRating: { $avg: "$star" },
                                },
                            },
                        ]);

                        if (dishRating.length > 0) {
                            dishRatings[dishId] = dishRating[0].avgRating;
                        }
                    }
                }
            }

            // Sort dishes by average rating in descending order
            const sortedDishes = Object.keys(dishRatings).sort(
                (a, b) => dishRatings[b] - dishRatings[a],
            );

            // Retrieve full dish details for the top recommended dishes
            const recommendedDishes = await HotelDish.find({
                _id: { $in: sortedDishes.slice(0, 5) },
            });

            return recommendedDishes;
        } else {
            // If no recent orders, recommend top rated dishes
            const topRatedDishes = await DishStar.aggregate([
                {
                    $group: {
                        _id: "$dishId",
                        avgRating: { $avg: "$star" },
                    },
                },
                { $sort: { avgRating: -1 } },
                { $limit: 5 },
            ]);

            const topDishIds = topRatedDishes.map((dish) => dish._id);

            const recommendedDishes = await HotelDish.find({
                _id: { $in: topDishIds },
            });
            return recommendedDishes;
        }
    } catch (error) {
        console.error("Error recommending dishes:", error);
        return [];
    }
}

module.exports = {
    findUserByEmail,
    recommendDishes,
};
