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

      
        const count = await Category.countDocuments(searchQuery);

    
        const totalPages = Math.ceil(count / limit);

        res.render('category', {
            categories: categories,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            count: count
        });
    } catch (error) {
        console.error('Error fetching category information:', error);
        res.status(500).render('error', {
            message: 'Failed to retrieve categories',
            error: error
        });
    }
};

module.exports={
    categoryInfo,
}