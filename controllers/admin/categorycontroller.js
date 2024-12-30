const Category=require('../../models/categorySchema');



const categoryInfo = async (req, res) => {
    try {
        
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 3; 

   
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
        console.log("category info page loaded");
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
    console.log("create category",name,description)
    try {
       
        const existingCategory = await Category.findOne({name});
        if (existingCategory) {
            console.log("already exists backend")
            return res.status(400).json({error:"Category already exists"})
        }
        
        // save new category
        const category = new Category({
            name,
            description,
        })
        
        await category.save();
        return res.status(201).json({message:"Category added successfully"})
    }
    catch(error) {
        console.error('Error adding category:');
        return res.status(500).json({error:"Internal Server Error"})
    }
}


const geteditcategory=async(req,res)=>{
    try{
        const id=req.query.id;
        console.log("category _id found",id);
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

        console.log("Edit category ID:", id);
        console.log("Request body:", req.body);

        // Check if another category with the same name exists
        const existingCategory = await Category.findOne({ 
            name: categoryName, 
            _id: { $ne: id } // Exclude the current category from the check
        });

        console.log("Existing category:", existingCategory);

        if (existingCategory) {
            return res.status(400).json({ error: "Category exists, please choose another name" });
        }

        // Update the category
        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            {
                name: categoryName,
                description: description,
            },
            { new: true }
        );

        console.log("Updated category:", updatedCategory);

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

const listcategory=async(req,res)=>{
    try{
        const id=req.query.id;
    console.log("liscategory id:",id);
    await Category.updateOne({_id:id},{$set:{isListed:false}});
    
    res.redirect('/admin/category')

    }
    catch(error){
        res.redirect('/admin/pageError');
    }
    
}
const Unlistcategory=async(req,res)=>{
    try{
        const id=req.query.id;
        console.log("Unlistcategory id:",id);
        await Category.updateOne({_id:id},{$set:{isListed:true}});
      
        res.redirect('/admin/category');
    }
    catch(error){
        res.redirect('/admin/pageError')
    }
}



module.exports={
    categoryInfo,
    addcategory,
    geteditcategory,
    editcategory,
    listcategory,
    Unlistcategory

}