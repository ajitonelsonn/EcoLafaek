const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdminUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER || 'sVS5xgcyguKUN4N.root',
    password: process.env.DB_PASSWORD || 'GHtH8NE0bWUc0QK2',
    database: process.env.DB_NAME || 'db_ecolafaek',
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