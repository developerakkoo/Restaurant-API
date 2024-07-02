module.exports = {
    DB_NAME: "dropeatTest",
    API_VERSION: "1.0.0",
    BASE_URL: "/api/v1",
    hash: 14,
    cookieOptions: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        sameSite: "none",
        httpOnly: true,
        secure: true,
    },

    generateSeed: false, // set to false if noo need
    events: {
        ALERT: "ALERT",
        REFETCH_CHATS: "REFETCH_CHATS",
        NEW_ATTACHMENT: "NEW_ATTACHMENT",
        NEW_MESSAGE_ALERT: "NEW_MESSAGE",
        DELETE_ATTACHMENT: "DELETE_ATTACHMENT",
        DELETE_MESSAGE: "DELETE_MESSAGE",
    },
    validationMessage: {
        userRegistration: {
            userNameValidationMessage:
                "Please enter a valid name. Names should only contain letters and must not be left blank. Thank you!",
            userNickNameValidationMessage:
                "Please enter a valid nick name. It should be at least 2 characters long. Thank you!",
            userPasswordValidationMessage: `Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number and special character '! @ # $ % ^ & * ?'`,
            userEmailValidationMessage:
                "Please enter a valid email address. Thank you!",
            userPhoneNumberValidationMessage:
                "Please enter a valid phone number. Thank you!",
            userDateOfBirthValidationMessage:
                "Please enter a valid date of birth. The formate should be (yyyy-MM-dd). Thank you!",
            userGenderValidationMessage: "This field is required. Thank you!",
            userPreferredGenderValidationMessage:
                "This field is required. Thank you!",
            userArLocationValidationMessage:
                "This field is required. Thank you!",
            userInterestValidationMessage:
                "This field is required and needs to be an array. Thank you!",
        },
        require: "This field is required. Thank you!",
    },
    responseMessage: {
        userMessage: {
            userFetchedSuccessfully: "User fetched successfully",
            userExist:
                "A user with this phone number or email already exists. Please use a different phone number or email. Thank you!",
            userNotCreated:
                "Something went wrong while registering the customer. Please try again later or contact support for assistance. Thank you.",
            userCreated: "User registered successfully. Welcome onboard!",
            userNotFound:
                "User does not exist. Please check your credentials and try again.",
            incorrectPassword:
                "Invalid user credentials. Please check your email and password and try again.",
            loginSuccessful: "User logged in successfully. Welcome back!",
            logoutSuccessful: "User logged out successfully!",
            unauthorized: "Access Denied:Unauthorized request",
            invalidToken: "Access Denied:Invalid token",
            invalidRefreshToken: "Refresh token is expired or used",
            reGeneratedToken: "Access token refreshed successfully",
            addressAdded: "Address added successfully",
            addressSelected: "Address selected successfully",
            addressUpdated: "Address updated successfully",
            addressDeleted: "Address deleted successfully",
            addressNotSelected: "Address not selected",
            addressNotDeleted:
                "Address not deleted, you can only delete your address",
            addressNotAdded: "Address not added",
            addressNotUpdated: "Address not updated",
            addressNotFound: "Address not found",
            addressFetchedSuccessfully: "Address fetched successfully",
            documentUploadedSuccessfully: "Document uploaded successfully",
            profileImageUploadedSuccessfully:
                "Profile image uploaded successfully",
            documentNotFound: "Document not found.",
            documentDeletedSuccessfully: "Document deleted successfully",
            documentUpdatedSuccessfully: "Document updated successfully",
            documentStatusUpdatedSuccessfully:
                "Document status updated successfully",
            documentsFetchedSuccessfully: "Documents fetched successfully",
            deliveryBoyNotFound: "Delivery boy not found",
            deliveryBoyStatusUpdatedSuccessfully:
                "Delivery Boy status updated successfully",
            userStatusUpdatedSuccessfully: "User status updated successfully",
            partnerStatusUpdatedSuccessfully:
                "Partner status updated successfully",
            hotelCreated: "Hotel registered successfully.",
            hotelNotCreated:
                "Something went wrong while registering the hotel. Please try again later or contact support for assistance. Thank you.",
            hotelNotFound: "Hotel not found",
            hotelUpdatedSuccessfully: "Hotel updated successfully",
            hotelDeletedSuccessfully: "Hotel deleted successfully",
            hotelFetchedSuccessfully: "Hotel fetched successfully",
            hotelStatusUpdatedSuccessfully: "Hotel status updated successfully",
            hotelImageUploadedSuccessfully: "Hotel image uploaded successfully",
            alreadyStaredHotel: "You already star this hotel ",
            starAddedSuccessfully: "Star added successfully",
            starDeletedSuccessfully: "Star deleted successfully",
            starFetchedSuccessfully: "Star fetched successfully",
            starUpdatedSuccessfully: "Star updated successfully",
            starNotAdded: "Star not added",
            starNotFound: "Star not found",
            categoryNotFound: "Category not found",
            categoryCreatedSuccessfully: "Category created successfully",
            categoryUpdatedSuccessfully: "Category updated successfully",
            categoryDeletedSuccessfully: "Category deleted successfully",
            categoryFetchedSuccessfully: "Category fetched successfully",
            categoryImageUploadedSuccessfully:
                "Category image uploaded successfully",
            categoryAlreadyExist: "Category already exists",
            dishAddedSuccessfully: "Dish added successfully",
            dishUpdatedSuccessfully: "Dish updated successfully",
            dishDeletedSuccessfully: "Dish deleted successfully",
            dishFetchedSuccessfully: "Dish fetched successfully",
            dishImageUploadedSuccessfully: "Dish image uploaded successfully",
            dishNotFound: "Dish not found",
            dishAlreadyExist: "Dish already exists",
            alreadyStaredDish: "Your already star this dish",
            cartHotelMismatch:
                "Please add products from the same hotel to your cart. To add products from a different hotel, place a new order.",
            cartUpdatedSuccessfully: "Cart updated successfully",
            deleteProductFromCartDeletedSuccessfully:
                "Product deleted from cart successfully",
            cartFetchedSuccessfully: "Cart fetched successfully",
            cartNotFound: "Cart not found",
            cartClearedSuccessfully: "Cart cleared successfully",
            emptyCart: "cart is empty",
            ALREADY_FAVORITED: "Already added to favorites",
            NOT_FAVORITED: "Not found",
            ADD_FAVORITED_SUCCESSFULLY: "Added to favorites successfully",
            FAVORITED_SUCCESSFULLY: " favorites fetch successfully",
            removeFromFavorite: "Removed from favorites successfully",
            ORDER_PLACED_SUCCESSFULLY: "Order placed successfully",
            ORDER_UPDATED_SUCCESSFULLY: "Order updated successfully",
            ORDER_DELETED_SUCCESSFULLY: "Order deleted successfully",
            ORDER_FETCHED_SUCCESSFULLY: "Order fetched successfully",
            ORDER_NOT_FOUND: "Order not found",
            ORDER_STATUS_UPDATED_SUCCESSFULLY:
                "Order status updated successfully",
            AMOUNT_REQUIRED_FOR_PAYMENT:
                "Amount required for initiating payment",
            PAYMENT_INITIATED_SUCCESSFULLY: "Payment initiated successfully",
            ORDER_ALREADY_ASSIGNED:
                "Sorry order already assigned delivery partner",
            sendOrderPickUpRequestToDeliveryBoys:
                "Request  sent to all delivery boy's",
            trackRecordAdded: "User tracked record added",
            trackRecordUpdated: "User tracked record updated",
            trackRecordDeleted: "User tracked record deleted",
            trackRecordNotFound: "User tracked record not found",
            trackRecordAlreadyExists:
                "User tracked record already exists for today",
            trackRecordFetchedSuccessfully:
                "User tracked record fetched successfully",
            orderChartData: "Order chart data fetched successfully",
            revenueChartData: "Revenue chart data fetched successfully",
            recommendationsFetchedSuccessfully:
                "Recommendations fetched successfully",
        },
        adminMessage: {
            adminExist: "Admin is already exist",
            adminRegisterError:
                "Something went wrong while registering the Admin",
            adminRegisterSuccessfully: "Admin registered Successfully",
            adminPrivilegesRequired: "Access Denied: Admin Privileges Required",
            customerMapChartDataFetchedSuccessfully:
                "Customer Map Chart Data Fetched Successfully",
            bannerAdded: "Banner Added Successfully",
            bannerUpdated: "Banner Updated Successfully",
            bannerDeleted: "Banner Deleted Successfully",
            bannerFetchedSuccessfully: "Banner Fetched Successfully",
        },
        validationResultMessage: "Received data is not valid",
        userDataFetchedSuccessfully: "User data fetched successfully",
        NOTIFICATION_SENT: "Notification sent",
        NOTIFICATION_FETCHED_SUCCESSFULLY: "Notification fetched successfully",
        NOTIFICATION_NOT_FOUND: "Notification not found",
        NOTIFICATION_DELETED_SUCCESSFULLY: "Notification deleted successfully",
        NOTIFICATION_MARKED_AS_READ_SUCCESSFULLY: "Notification marked as read",
        GET_CHAT_LIST_SUCCESS: "Chat list fetched successfully",
    },
};
