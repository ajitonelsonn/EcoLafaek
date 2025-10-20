const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdminUser() {
  // Check for required environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('❌ Error: Database credentials not found!');
    console.error('Please set the following environment variables:');
    console.error('  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
    console.error('\nExample:');
    console.error('  DB_HOST=your-tidb-host.tidbcloud.com \\');
    console.error('  DB_USER=your-username \\');
    console.error('  DB_PASSWORD=your-password \\');
    console.error('  DB_NAME=db_ecolafaek \\');
    console.error('  DB_PORT=4000 \\');
    console.error('  node scripts/create-admin.js');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true
    }
  });

  try {
    // Create admin_users table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        active BOOLEAN DEFAULT TRUE
      )
    `);

    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert or update admin user
    await connection.execute(`
      INSERT INTO admin_users (username, email, password_hash, role) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      password_hash = VALUES(password_hash),
      role = VALUES(role)
    `, ['admin', 'admin@ecolafaek.com', hashedPassword, 'super_admin']);

    console.log('✅ Admin user created/updated successfully!');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: super_admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await connection.end();
  }
}

createAdminUser();