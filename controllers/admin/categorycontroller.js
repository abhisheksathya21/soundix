const Category=require('../../models/categorySchema');



const categoryInfo = async (req, res) => {
    try {
        
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 

   
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
        res.redirect('pageError');
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

module.exports={
    categoryInfo,
    addcategory
}