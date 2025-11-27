# Frontend Integration Guide - Delivery Boy Routes & Socket.IO

This document provides all the information needed for frontend developers to integrate with the delivery boy routes and Socket.IO real-time features.

---

## 📡 Socket.IO Connection Setup

### 1. Connect to Socket.IO Server

```javascript
import io from 'socket.io-client';

// Replace with your actual server URL
const socket = io('http://your-api-url.com', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.log('Socket.IO connected');
});

socket.on('disconnect', () => {
  console.log('Socket.IO disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error);
});
```

---

## 🚚 Delivery Boy Socket.IO Events

### 1. Join Delivery Boy Room (REQUIRED)

**When:** Immediately after socket connection and user authentication

**Event Name:** `deliveryBoyJoin`

**Emit to Server:**
```javascript
socket.emit('deliveryBoyJoin', {
  deliveryBoyId: 'your-delivery-boy-id' // MongoDB ObjectId as string
});
```

**Purpose:** Join the delivery boy's private room to receive targeted notifications

---

### 2. Listen for Pickup Requests

**Event Name:** `pickupRequest`

**Listen:**
```javascript
socket.on('pickupRequest', (data) => {
  console.log('New pickup request received:', data);
  
  // Data structure:
  // {
  //   type: "NEW_PICKUP_REQUEST",
  //   orderId: "ABC123-HOT",
  //   order: { /* full order object */ },
  //   hotel: { /* hotel object */ },
  //   customer: { /* customer object */ },
  //   deliveryAddress: { /* address object */ },
  //   timestamp: "2024-01-15T10:30:00.000Z",
  //   message: "New pickup request for order ABC123-HOT",
  //   priority: "high",
  //   totalAmount: 500,
  //   itemCount: 3,
  //   paymentMode: "COD",
  //   deliveryBoyId: "delivery-boy-id"
  // }
  
  // Handle the pickup request:
  // - Show notification/alert
  // - Update order list
  // - Show accept/reject buttons
});
```

**When Received:** When admin/partner sends pickup request to this delivery boy

**Action Required:** Show notification and allow delivery boy to accept/reject

---

### 3. Listen for Order Assignment

**Event Name:** `orderAssigned`

**Listen:**
```javascript
socket.on('orderAssigned', (data) => {
  console.log('Order assigned to you:', data);
  
  // Data structure:
  // {
  //   type: "ORDER_ASSIGNED",
  //   orderId: "ABC123-HOT",
  //   order: { /* full order object */ },
  //   timestamp: "2024-01-15T10:30:00.000Z",
  //   message: "Order ABC123-HOT has been assigned to you",
  //   priority: "high"
  // }
  
  // Handle the assignment:
  // - Show notification
  // - Update order list
  // - Navigate to order details if needed
});
```

**When Received:** When an order is officially assigned to this delivery boy (status updated to 2)

**Action Required:** Update UI to show assigned order

---

### 4. Listen for Pickup Confirmation

**Event Name:** `pickupConfirmed`

**Listen:**
```javascript
socket.on('pickupConfirmed', (data) => {
  console.log('Pickup confirmed:', data);
  
  // Data structure:
  // {
  //   type: "PICKUP_CONFIRMED",
  //   orderId: "ABC123-HOT",
  //   order: { /* full order object */ },
  //   timestamp: "2024-01-15T10:30:00.000Z"
  // }
  
  // Handle pickup confirmation:
  // - Update order status in UI
  // - Show "Out for delivery" status
});
```

**When Received:** When order status is updated to "pickup confirmed" (status 6)

**Action Required:** Update order status display

---

### 5. Listen for Order Delivered

**Event Name:** `orderDelivered`

**Listen:**
```javascript
socket.on('orderDelivered', (data) => {
  console.log('Order delivered:', data);
  
  // Data structure:
  // {
  //   type: "ORDER_DELIVERED",
  //   orderId: "ABC123-HOT",
  //   order: { /* full order object */ },
  //   incentive: 100, // Incentive amount if applicable
  //   deliveryCount: 16, // Today's delivery count
  //   timestamp: "2024-01-15T10:30:00.000Z"
  // }
  
  // Handle delivery confirmation:
  // - Update order status
  // - Show incentive notification if applicable
  // - Update delivery count
});
```

**When Received:** When order status is updated to "delivered" (status 3)

**Action Required:** Update UI and show incentive if applicable

---

### 6. Listen for Order Rejection Confirmation

**Event Name:** `orderRejected`

**Listen:**
```javascript
socket.on('orderRejected', (data) => {
  console.log('Order rejection confirmed:', data);
  
  // Data structure:
  // {
  //   type: "ORDER_REJECTED",
  //   orderId: "ABC123-HOT",
  //   order: { /* full order object */ },
  //   reason: "Too far from current location",
  //   timestamp: "2024-01-15T10:30:00.000Z"
  // }
  
  // Handle rejection confirmation:
  // - Remove order from active list
  // - Show confirmation message
});
```

**When Received:** After successfully rejecting an order

**Action Required:** Update UI to remove rejected order

---

## 🔌 API Endpoints

### 1. Update Order Status (Assign Delivery Boy)

**Endpoint:** `PUT /order/update/order-status`

**Headers:**
```
Content-Type: multipart/form-data (if sending payment screenshot)
```

**Request Body:**
```javascript
const formData = new FormData();
formData.append('orderId', 'order-mongodb-id');
formData.append('status', 2); // 2 = assigned
formData.append('deliveryBoyId', 'delivery-boy-mongodb-id');
formData.append('paymentMode', 'COD'); // COD, CASH, UPI, RAZORPAY
// If paymentMode is UPI, also include:
formData.append('paymentScreenshot', file); // File object

// Example fetch:
fetch('/api/order/update/order-status', {
  method: 'PUT',
  body: formData,
  // Don't set Content-Type header, browser will set it with boundary
});
```

**Request Body (JSON - if no file):**
```javascript
{
  "orderId": "507f1f77bcf86cd799439011",
  "status": 2,
  "deliveryBoyId": "507f1f77bcf86cd799439012",
  "paymentMode": "COD"
}
```

**Status Codes:**
- `0` - Received
- `1` - Being prepared
- `2` - Delivery assigned
- `3` - Delivered
- `4` - Accepted
- `5` - Cancelled by hotel
- `6` - Pickup confirmed
- `7` - Cancelled by customer
- `8` - Rejected by delivery boy

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    /* Order object */
  },
  "message": "Order status updated successfully"
}
```

**Errors:**
- `400` - Invalid input, order already assigned, invalid status
- `404` - Order not found, delivery boy not found
- `400` - Delivery boy not active

---

### 2. Reject Order by Delivery Boy

**Endpoint:** `POST /order/reject-by-delivery-boy`

**Request Body:**
```javascript
{
  "orderId": "507f1f77bcf86cd799439011",
  "deliveryBoyId": "507f1f77bcf86cd799439012",
  "reason": "Too far from current location" // Optional, max 500 chars
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    /* Updated order object */
  },
  "message": "Order rejected successfully"
}
```

**Errors:**
- `400` - Invalid input, invalid order status for rejection
- `403` - Order not assigned to this delivery boy
- `404` - Order not found, delivery boy not found

**Note:** Order can only be rejected if status is `2` (assigned) or `6` (pickup confirmed)

---

### 3. Get All Orders by Delivery Boy ID

**Endpoint:** `GET /order/get/all-order/deliveryBoyId/:deliveryBoyId`

**Query Parameters:**
```javascript
// Example URL:
GET /api/order/get/all-order/deliveryBoyId/507f1f77bcf86cd799439012?page=1&limit=20&status=2

// Query params:
{
  page: 1,        // Optional, default: 1
  limit: 20,      // Optional, default: 20
  status: 2       // Optional, filter by status (0-8)
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "orders": [
      /* Array of order objects */
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 100,
      "limit": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Orders fetched successfully"
}
```

**Example Usage:**
```javascript
async function getDeliveryBoyOrders(deliveryBoyId, page = 1, limit = 20, status = null) {
  let url = `/api/order/get/all-order/deliveryBoyId/${deliveryBoyId}?page=${page}&limit=${limit}`;
  if (status !== null) {
    url += `&status=${status}`;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
```

**Errors:**
- `400` - Invalid delivery boy ID format
- `404` - Delivery boy not found

---

### 4. Send Pickup Request (Admin/Partner Only)

**Endpoint:** `POST /admin/order/send-pickup-request/deliveryBoy`

**Request Body:**
```javascript
{
  "orderId": "507f1f77bcf86cd799439011",
  "deliveryBoys": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ]
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "sentTo": 3,
    "totalRequested": 3,
    "orderId": "ABC123-HOT",
    "orderStatus": 2
  },
  "message": "Pickup requests sent successfully to 3 delivery boy(s)"
}
```

**Errors:**
- `400` - Invalid input, order cannot accept pickup requests, delivery boys not found/inactive
- `404` - Order not found

**Note:** This endpoint is typically called by admin/partner dashboard, not delivery boy app

---

## 📱 Complete Frontend Implementation Example

### React Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function DeliveryBoyApp({ deliveryBoyId }) {
  const [socket, setSocket] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('http://your-api-url.com', {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Join delivery boy room
      newSocket.emit('deliveryBoyJoin', { deliveryBoyId });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Listen for pickup requests
    newSocket.on('pickupRequest', (data) => {
      console.log('New pickup request:', data);
      setNotifications(prev => [...prev, {
        type: 'pickupRequest',
        ...data,
        id: Date.now(),
      }]);
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Pickup Request', {
          body: data.message,
          icon: '/icon.png',
        });
      }
    });

    // Listen for order assignment
    newSocket.on('orderAssigned', (data) => {
      console.log('Order assigned:', data);
      setNotifications(prev => [...prev, {
        type: 'orderAssigned',
        ...data,
        id: Date.now(),
      }]);
      
      // Refresh orders list
      fetchOrders();
    });

    // Listen for pickup confirmation
    newSocket.on('pickupConfirmed', (data) => {
      console.log('Pickup confirmed:', data);
      updateOrderStatus(data.orderId, 6);
    });

    // Listen for order delivered
    newSocket.on('orderDelivered', (data) => {
      console.log('Order delivered:', data);
      updateOrderStatus(data.orderId, 3);
      
      // Show incentive notification if applicable
      if (data.incentive > 0) {
        alert(`Congratulations! You earned ₹${data.incentive} incentive!`);
      }
    });

    // Listen for order rejection confirmation
    newSocket.on('orderRejected', (data) => {
      console.log('Order rejected:', data);
      setOrders(prev => prev.filter(order => order.orderId !== data.orderId));
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [deliveryBoyId]);

  // Fetch orders
  const fetchOrders = async (page = 1, status = null) => {
    try {
      let url = `/api/order/get/all-order/deliveryBoyId/${deliveryBoyId}?page=${page}&limit=20`;
      if (status !== null) {
        url += `&status=${status}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.statusCode === 200) {
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Accept pickup request
  const acceptPickupRequest = async (orderId) => {
    try {
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('status', 2); // Assigned
      formData.append('deliveryBoyId', deliveryBoyId);
      formData.append('paymentMode', 'COD');

      const response = await fetch('/api/order/update/order-status', {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();
      
      if (data.statusCode === 200) {
        alert('Order accepted successfully!');
        fetchOrders();
      } else {
        alert(data.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order');
    }
  };

  // Reject order
  const rejectOrder = async (orderId, reason = '') => {
    try {
      const response = await fetch('/api/order/reject-by-delivery-boy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          deliveryBoyId,
          reason,
        }),
      });

      const data = await response.json();
      
      if (data.statusCode === 200) {
        alert('Order rejected successfully');
        setOrders(prev => prev.filter(order => order._id !== orderId));
      } else {
        alert(data.message || 'Failed to reject order');
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Failed to reject order');
    }
  };

  // Confirm pickup
  const confirmPickup = async (orderId) => {
    try {
      const response = await fetch('/api/order/update/order-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: 6, // Pickup confirmed
          deliveryBoyId,
        }),
      });

      const data = await response.json();
      
      if (data.statusCode === 200) {
        alert('Pickup confirmed!');
        updateOrderStatus(orderId, 6);
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
    }
  };

  // Mark as delivered
  const markAsDelivered = async (orderId) => {
    try {
      const response = await fetch('/api/order/update/order-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: 3, // Delivered
          deliveryBoyId,
        }),
      });

      const data = await response.json();
      
      if (data.statusCode === 200) {
        alert('Order marked as delivered!');
        updateOrderStatus(orderId, 3);
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
    }
  };

  // Update order status in local state
  const updateOrderStatus = (orderId, status) => {
    setOrders(prev => prev.map(order => 
      order.orderId === orderId || order._id === orderId
        ? { ...order, orderStatus: status }
        : order
    ));
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div>
      {/* Your UI components */}
      <OrdersList 
        orders={orders} 
        onAccept={acceptPickupRequest}
        onReject={rejectOrder}
        onConfirmPickup={confirmPickup}
        onMarkDelivered={markAsDelivered}
      />
      <NotificationsList notifications={notifications} />
    </div>
  );
}

export default DeliveryBoyApp;
```

---

## 🔔 Notification Best Practices

1. **Request Permission:** Request browser notification permission on app load
2. **Show In-App Notifications:** Display notifications in your app UI
3. **Sound Alerts:** Play sound for high-priority notifications (pickup requests)
4. **Badge Count:** Update badge count for unread notifications
5. **Auto-Refresh:** Refresh order list when receiving real-time updates

---

## 📊 Order Status Flow

```
0. Received → 1. Being Prepared → 2. Assigned → 6. Pickup Confirmed → 3. Delivered
                                      ↓
                                    8. Rejected
```

---

## ⚠️ Error Handling

Always handle the following error scenarios:

1. **Socket.IO Disconnection:** Show "Reconnecting..." message
2. **API Errors:** Display user-friendly error messages
3. **Network Errors:** Retry failed requests
4. **Invalid Data:** Validate before sending to API

---

## 🧪 Testing Checklist

- [ ] Socket.IO connects successfully
- [ ] Delivery boy room joined correctly
- [ ] Pickup requests received in real-time
- [ ] Order assignments received in real-time
- [ ] Can accept pickup requests
- [ ] Can reject orders
- [ ] Orders list updates correctly
- [ ] Pagination works
- [ ] Status filtering works
- [ ] Notifications display correctly
- [ ] Browser notifications work (if implemented)

---

## 📝 Notes

1. **Delivery Boy ID:** Must be the MongoDB ObjectId (string format)
2. **Order Status:** Use numeric values (0-8), not strings
3. **Socket.IO Rooms:** Room names are prefixed (`deliveryBoy_`, `partner_`, `admin_dashboard`)
4. **Reconnection:** Socket.IO automatically reconnects, but you may need to rejoin rooms
5. **File Upload:** Use FormData for file uploads (payment screenshots)

---

## 🔗 Related Endpoints

- Order Details: `GET /order/get-order/:orderId`
- Order by ID: `GET /order/get/order-by-id/:id`
- Update Order: `PUT /order/update/order-status`
- Cancel Order: `POST /order/cancel/order`

---

## 📞 Support

For issues or questions:
- Check server logs for Socket.IO connection issues
- Verify delivery boy ID format
- Ensure order status transitions are valid
- Check network connectivity

