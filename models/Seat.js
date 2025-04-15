import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema({
  section: String,
  row: Number,
  col: Number,
  booked: { type: Boolean, default: false }, // booked field
});

const Seat = mongoose.model('Seat', seatSchema);

export default Seat;
