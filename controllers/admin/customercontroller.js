const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
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

        const UserData = await User.find(searchQuery)
            .sort({_id: -1})
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

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

const blockCustomer = async (req, res) => {
    try {
        const id = req.query.id;
        const customer = await User.findById(id);
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        
        res.json({
            success: true,
            message: `Customer ${customer.fullname} blocked successfully`,
            customerId: id,
            type: 'block' // Added type
        });
    } catch (error) {
        console.error("Error blocking customer:", error);
        res.status(500).json({
            success: false,
            message: 'Error blocking customer'
        });
    }
};

const UnblockCustomer = async (req, res) => {
    try {
        const id = req.query.id;
        const customer = await User.findById(id);
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        
        res.json({
            success: true,
            message: `Customer ${customer.fullname} unblocked successfully`,
            customerId: id,
            type: 'unblock' // Added type
        });
    } catch (error) {
        console.error("Error unblocking customer:", error);
        res.status(500).json({
            success: false,
            message: 'Error unblocking customer'
        });
    }
};

module.exports = {
    customerInfo,
    blockCustomer,
    UnblockCustomer,
};