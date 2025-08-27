const UserDatabase = require('./models/userDatabase');

async function createOrUpdateAdmin() {
  const userDb = new UserDatabase();
  
  try {
    await userDb.connect();
    await userDb.createUsersTable();
    
    console.log('🔐 Setting up admin user for kiranbakale9@gmail.com...');
    
    // Check if user already exists
    const existingUser = await userDb.getUserByEmail('kiranbakale9@gmail.com');
    
    if (existingUser) {
      console.log('👤 User found! Updating role to admin...');
      
      // Update role to admin
      await userDb.updateUserRole(existingUser.id, 'admin');
      
      // Verify user if not already verified
      if (!existingUser.email_verified) {
        await userDb.verifyUser(existingUser.id);
        console.log('✅ User verified');
      }
      
      // Activate user if not active
      if (!existingUser.is_active) {
        await userDb.updateUserStatus(existingUser.id, true);
        console.log('✅ User activated');
      }
      
      console.log('✅ User updated successfully!');
      console.log('📧 Email: kiranbakale9@gmail.com');
      console.log('👤 Name:', existingUser.first_name, existingUser.last_name);
      console.log('🔑 Role: admin (updated)');
      console.log('✅ Status: active & verified');
      
    } else {
      console.log('🆕 User not found. Creating new admin user...');
      
      // Create new admin user
      const user = await userDb.createUser('kiranbakale9@gmail.com', 'Kiran', 'Bakale', 'admin');
      await userDb.verifyUser(user.id);
      
      console.log('✅ New admin user created successfully!');
      console.log('📧 Email: kiranbakale9@gmail.com');
      console.log('👤 Name: Kiran Bakale');
      console.log('🔑 Role: admin');
      console.log('✅ Status: active & verified');
    }
    
    console.log('');
    console.log('🔐 IMPORTANT: Authentication Method');
    console.log('❌ This system uses EMAIL OTP authentication (NO PASSWORD)');
    console.log('');
    console.log('🚀 How to login:');
    console.log('1. Go to: http://localhost:3000/login');
    console.log('2. Enter email: kiranbakale9@gmail.com');
    console.log('3. Click "Send OTP"');
    console.log('4. Check your email for the 6-digit OTP code');
    console.log('5. Enter the OTP to login');
    console.log('');
    console.log('🔧 Make sure email service is configured in your .env file:');
    console.log('   EMAIL_HOST=smtp.gmail.com');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASS=your-app-password');
    
    await userDb.close();
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    await userDb.close();
  }
}

createOrUpdateAdmin();
