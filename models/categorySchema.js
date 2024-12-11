const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true // Category names should typically be unique
    },
    description: {
        type: String,
        trim: true,
        default: "" // Optional field for additional details about the category
    },
    image: {
        type: String,
        default: "" // Path or URL to a category image (useful for UI)
    },
    isDeleted: {
        type: Boolean,
        default: false // Indicates whether the category is active or disabled
    },
    createdAt: {
        type: Date,
        default: Date.now // Automatically sets the creation date
    },
    isListed: {
        type: Boolean,
        default: true, // Default to listed
    },
    updatedAt: {
        type: Date,
        default: Date.now // Automatically updates when changes are made
    },
    // parentCategory: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Category", // Self-referencing for subcategories
    //     default: null
    // }
});

module.exports = mongoose.model('Category', categorySchema);
