import mongoose from 'mongoose';

const numberListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    numbers: {
      type: [{ type: String, trim: true, maxlength: 32 }],
      validate: [(value) => value.length <= 100000, "A number list can contain at most 100000 numbers"],
    },
    tags: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      validate: [(value) => value.length <= 50, "A number list can contain at most 50 tags"],
    },
    color: {
      type: String,
      default: 'bg-blue-500',
    },
    variables: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      validate: [(value) => value.length <= 50, "A number list can contain at most 50 variables"],
    },
    contactData: {
      type: [{ type: mongoose.Schema.Types.Mixed }],
      validate: [(value) => value.length <= 100000, "A number list can contain at most 100000 contact rows"],
    },
  },
  { timestamps: true },
);

numberListSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('NumberList', numberListSchema);
