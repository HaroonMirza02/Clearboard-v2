const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');

const uri = 'mongodb://mhassandev20_db_user:6A3bYcOaYpjsETWw@ac-gvoqupk-shard-00-00.wwx4eug.mongodb.net:27017,ac-gvoqupk-shard-00-01.wwx4eug.mongodb.net:27017,ac-gvoqupk-shard-00-02.wwx4eug.mongodb.net:27017/clearboard?ssl=true&replicaSet=atlas-mmaaf5-shard-0&authSource=admin&retryWrites=true&w=majority';

mongoose.connect(uri).then(async () => {
    let c = await Company.findOne({ slug: 'default-org' });
    if (!c) {
        c = await Company.create({
            name: 'Default Organization',
            tenantId: 'default-org',
            slug: 'default-org',
            settings: { maxUsers: 100, allowedFileTypes: [], maxFileSize: 100 * 1024 * 1024 }
        });
    }
    console.log('Company ID:', c._id);
    const res = await User.updateMany(
        { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
        { $set: { companyId: c._id } }
    );
    console.log('Updated users:', res.modifiedCount);
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
