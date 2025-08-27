const UserDatabase = require('./models/userDatabase');

async function createAdminUser() {
  const userDb = new UserDatabase();
  
  try {
    await userDb.connect();
    await userDb.createUsersTable();
    
    console.log('🔐 Creating admin user...');
    
    // Check if user already exists
    const existingUser = await userDb.getUserByEmail('user.admin@autoflow.ai');
    if (existingUser) {
      console.log('⚠️ User already exists with email: user.admin@autoflow.ai');
      console.log('User details:', existingUser);
      await userDb.close();
      return;
    }
    
    // Create new admin user
    const user = await userDb.createUser('user.admin@autoflow.ai', 'User', 'Admin', 'admin');
    await userDb.verifyUser(user.id);
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: user.admin@autoflow.ai');
    console.log('👤 Name: User Admin');
    console.log('🔑 Role: admin');
    console.log('✅ Status: verified');
    console.log('');
    console.log('🚀 You can now login using email OTP authentication');
    console.log('📝 Go to http://localhost:3000/login and use: user.admin@autoflow.ai');
    
    await userDb.close();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await userDb.close();
  }
}

createAdminUser();
