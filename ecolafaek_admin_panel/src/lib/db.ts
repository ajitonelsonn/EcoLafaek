import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_ecolafaek',
  ssl: {
    rejectUnauthorized: true
  },
  connectTimeout: 30000,
}

let connection: mysql.Connection | null = null

export async function getConnection() {
  if (!connection) {
    try {
      connection = await mysql.createConnection(dbConfig)
      console.log('TiDB connection established successfully')
    } catch (error) {
      console.error('Error connecting to TiDB:', error)
      throw error
    }
  }
  return connection
}

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    const conn = await getConnection()
    const [results] = await conn.execute(query, params)
    return results as T
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export async function closeConnection() {
  if (connection) {
    await connection.end()
    connection = null
  }
}