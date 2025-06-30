const CustomNotification = require('../../models/Notifications/notifications');
const IO = require('../../utils/socket');
// Create Notification
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, userId, deliveryBoyId, hotelId } = req.body;

    const notification = new CustomNotification({
      title,
      message,
      type,
      userId,
      deliveryBoyId,
      hotelId,
    });

    await notification.save();
    IO.getIO().emit('notification', { action: 'create', data: notification });  
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete Notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomNotification.findByIdAndDelete(id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Notifications for User / Delivery Boy / Hotel
exports.getNotifications = async (req, res) => {
  try {
    const { userId, deliveryBoyId, hotelId } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (deliveryBoyId) query.deliveryBoyId = deliveryBoyId;
    if (hotelId) query.hotelId = hotelId;

    const notifications = await CustomNotification.find(query)
      .sort({ createdAt: -1 });
    IO.getIO().emit('notification', { action: 'get', data: notifications });
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Mark Notification as Read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await CustomNotification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
