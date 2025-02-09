const User=require('../../models/userSchema');



const customerInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        console.log(search);
        const page = parseInt(req.query.page) || 1;
        const limit = 6;

        const searchQuery = {
            isAdmin: false,
            $or: [
                { fullname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        };
        console.log("searchQuery", searchQuery);
        const UserData = await User.find(searchQuery)
            .sort({_id: -1})
            .limit(limit)
            .skip((page - 1) * limit)
            .exec()
           

        const count = await User.countDocuments(searchQuery);

        const totalPages = Math.ceil(count / limit);
       
        res.render('customers', {
            customers: UserData,
            currentPage: page,
            totalPages: totalPages,
            search: search
        });
    } catch (error) {
        console.error("Error fetching customer information:", error);
        return res.redirect('/pageError');
    }
};

const blockCustomer=async (req,res)=>{
    try{
        let id=req.query.id;
        
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/customers')
    }
    catch(error){
        res.redirect('/pageError')
    }
}
const UnblockCustomer=async (req,res)=>{
    try{
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/customers')

    }
   
    catch(error){
        res.redirect('/pageError')
    }
}

module.exports={
    customerInfo,
    blockCustomer,
    UnblockCustomer,
}