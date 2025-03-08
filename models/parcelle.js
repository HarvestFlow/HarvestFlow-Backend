import mongoose from "mongoose";

const ShapeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["Feature"],
  },
  properties: {
    id: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
    },
    comment: {
      type: String,
      default: "",
    },
  },
  geometry: {
    type: {
      type: String,
      required: true,
      enum: ["Polygon", "LineString","Point"],
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed, // Allow flexibility for 2D or 3D arrays
      required: true,
      validate: {
        validator: function (coords) {
          if (this.geometry.type === "Point") {
            // For Point, expect [lng, lat]
            return Array.isArray(coords) && 
                   coords.length === 2 && 
                   coords.every(num => typeof num === "number");
          } else if (this.geometry.type === "LineString") {
            // For LineString, expect [[lng, lat], [lng, lat], ...]
            return Array.isArray(coords) && coords.every(point => 
              Array.isArray(point) && point.length === 2 && point.every(num => typeof num === "number")
            );
          } else if (this.geometry.type === "Polygon") {
            // For Polygon, expect [[[lng, lat], [lng, lat], ...]]
            return Array.isArray(coords) && coords.every(ring => 
              Array.isArray(ring) && ring.every(point => 
                Array.isArray(point) && point.length === 2 && point.every(num => typeof num === "number")
              )
            );
          }
          return false;
        },
        message: "Invalid coordinates format for the specified geometry type",
      }
    },
  },
});

const ParcelleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shapes: [ShapeSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Parcelle = mongoose.model("Parcelle", ParcelleSchema);
export default Parcelle;