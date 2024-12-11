const Products=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const User=require('../../models/userSchema');
const fs=require('fs');
const path=require('path');
const sharp=require('sharp')

const loadProductaddpage = async (req, res) => {
    try {
        const categoryItems = await Category.find({ isListed: true });

        
        if (!categoryItems.length) {
            console.log("No categories found");
        }

        res.render('product-add', { Category: categoryItems });
        console.log("Add new product page loaded with categories:", categoryItems);
    } catch (error) {
        console.error("Error loading product add page:", error);
        res.redirect('/admin/pageError');
    }
}









module.exports={
    loadProductaddpage,
}