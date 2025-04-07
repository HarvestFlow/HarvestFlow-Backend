import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  shapeId: { type: String, required: true },
  message: { type: String, required: true },
  condition: { type: String, required: true },
  read: { type: Boolean, default: false },
  triggeredAt: { type: Date, default: Date.now },
});

export default mongoose.model('Notification', notificationSchema);