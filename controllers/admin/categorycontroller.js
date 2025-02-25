const Category=require('../../models/categorySchema');



const categoryInfo = async (req, res) => {
    try {
        
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 2; 

   
        const searchQuery = {
            isDeleted: false,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };

     
        const categories = await Category.find(searchQuery)
            .sort({ createdAt: -1 }) 
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

      
        const CategoryCount = await Category.countDocuments(searchQuery);

    
        const totalPages = Math.ceil(CategoryCount / limit);
        
        res.render('category', {
            categories: categories,
            currentPage: page,  
            totalPages: totalPages,
            search: search, 
            count: CategoryCount
        });
    } catch (error) {
        console.error('Error fetching category information:', error);
        return res.redirect('/admin/pageError');
    }
};

const addcategory = async (req, res) => {
    const {name, description} = req.body;
   
    try {
       
        const existingCategory = await Category.findOne({name});
        console.log(existingCategory);
        if (existingCategory) {
            console.log("already exists backend")
            return res.status(400).json({error:"Category already exists"})
        }
        
        // save new category
        const category = new Category({
            name,
            description,
        })
        console.log(category);
        
        await category.save();
        return res.status(201).json({message:"Category added successfully"})
    }
    catch(error) {
        console.error('Error adding category:',error);
        return res.status(500).json({error:"Internal Server Error"})
    }
}
const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, discountPercentage, startDate, endDate } = req.body;

    if (!categoryId || !discountPercentage || !startDate || !endDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if offer dates are valid
    if (new Date(startDate) >= new Date(endDate)) {
      return res
        .status(400)
        .json({ error: "End date must be after start date" });
    }

    category.offer = {
      discountPercentage,
      startDate,
      endDate,
    };

    await category.save();

    return res
      .status(200)
      .json({ message: "Offer added successfully", category });
  } catch (error) {
    console.error("Error adding offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const removeCategoryOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.offer = null; // Remove the offer
    await category.save();

    return res
      .status(200)
      .json({ success: true, message: "Offer removed successfully." });
  } catch (error) {
    console.error("Error removing offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



const geteditcategory=async(req,res)=>{
    try{
        const id=req.query.id;
      
        const category=await Category.findOne({_id:id});
        res.render('edit-category',{category:category})
    }
    catch(error){
        console.log("error found redirect to pageError");
       return res.redirect('/admin/pageError')

    }
}

const editcategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

     
       
        const existingCategory = await Category.findOne({ 
            name: categoryName, 
            _id: { $ne: id } 
        });

      

        if (existingCategory) {
            return res.status(400).json({ error: "Category exists, please choose another name" });
        }

        
        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            {
                name: categoryName,
                description: description,
            },
            { new: true }
        );

       

        if (updatedCategory) {
            return res.status(200).json({ success: true, message: "Category updated successfully." });
        } else {
            return res.status(404).json({ error: "Category not found" });
        }
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const listcategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await Category.updateOne({ _id: id }, { $set: { isListed: false } });

        res.json({
            success: true,
            message: `Category ${category.name} unlisted successfully`,
            categoryId: id,
            type: 'unlist' 
        });
    } catch (error) {
        console.error("Error unlisting category:", error);
        res.status(500).json({
            success: false,
            message: 'Error unlisting category'
        });
    }
};

const Unlistcategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await Category.updateOne({ _id: id }, { $set: { isListed: true } });

        res.json({
            success: true,
            message: `Category ${category.name} listed successfully`,
            categoryId: id,
            type: 'list' 
        });
    } catch (error) {
        console.error("Error listing category:", error);
        res.status(500).json({
            success: false,
            message: 'Error listing category'
        });
    }
};



module.exports = {
  categoryInfo,
  addcategory,
  geteditcategory,
  editcategory,
  listcategory,
  Unlistcategory,
  addCategoryOffer,
  removeCategoryOffer,
};